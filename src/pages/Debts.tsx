import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowUpRight, ArrowDownLeft, Plus, ChevronDown, ChevronUp,
  Clock, CheckCircle2, AlertTriangle, ShieldCheck, MessageCircle,
  CheckCircle, Camera, X, Download, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";
import { formatMoneySmart } from "@/lib/formatMoney";

interface Debt {
  id: string;
  type: string;
  person_name: string;
  amount: number;
  paid_amount: number;
  due_date: string | null;
  date_echeance: string | null;
  note: string | null;
  motif: string | null;
  whatsapp: string | null;
  preuve_url: string | null;
  preuve_storage_path: string | null;
  status: string;
  created_at: string;
  signedPreuveUrl?: string | null;
}

interface DebtPayment {
  id: string;
  amount: number;
  payment_date: string;
  note: string | null;
}

interface WalletItem {
  id: string;
  wallet_name: string;
}

const Debts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filter, setFilter] = useState<"i_owe" | "owed_to_me">("owed_to_me");
  const [loading, setLoading] = useState(true);

  // ── Create dialog ──
  const [showCreateDebt, setShowCreateDebt] = useState(false);
  const [debtForm, setDebtForm] = useState({
    person_name: "",
    amount: "",
    motif: "",
    whatsapp: "",
    note: "",
    date_echeance: "",
    type: "owed_to_me" as "owed_to_me" | "i_owe",
  });
  const [preuveFile, setPreuveFile] = useState<File | null>(null);
  const [preuvePreview, setPreuvePreview] = useState<string | null>(null);
  const [creatingDebt, setCreatingDebt] = useState(false);

  // ── Payment ──
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payWalletId, setPayWalletId] = useState("");
  const [wallets, setWallets] = useState<WalletItem[]>([]);

  // ── History ──
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, DebtPayment[]>>({});

  // ── Fullscreen preuve ──
  const [fullscreenPreuve, setFullscreenPreuve] = useState<string | null>(null);

  const getSignedUrl = async (path: string): Promise<string | null> => {
    if (!path) return null;
    try {
      const { data, error } = await supabase.storage
        .from("debt-proofs")
        .createSignedUrl(path, 60 * 60);
      return error ? null : data.signedUrl;
    } catch {
      return null;
    }
  };

  const fetchDebts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const rows = (data as unknown as Debt[]) || [];
    const withUrls = await Promise.all(
      rows.map(async (d) => ({
        ...d,
        signedPreuveUrl: d.preuve_storage_path
          ? await getSignedUrl(d.preuve_storage_path)
          : d.preuve_url || null,
      }))
    );
    setDebts(withUrls);
    setLoading(false);
  }, [user]);

  const fetchWallets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallets")
      .select("id, wallet_name")
      .eq("user_id", user.id);
    setWallets((data as WalletItem[]) || []);
  }, [user]);

  const fetchPayments = async (debtId: string) => {
    const { data } = await supabase
      .from("debt_payments")
      .select("id, amount, payment_date, note")
      .eq("debt_id", debtId)
      .order("created_at", { ascending: false })
      .limit(5);
    setPayments((prev) => ({ ...prev, [debtId]: (data as DebtPayment[]) || [] }));
  };

  useEffect(() => {
    fetchDebts();
    fetchWallets();
  }, [fetchDebts, fetchWallets]);

  const totalIOwe = debts
    .filter((d) => d.type === "i_owe" && d.status !== "paid")
    .reduce((s, d) => s + (d.amount - (d.paid_amount || 0)), 0);
  const totalOwedToMe = debts
    .filter((d) => d.type === "owed_to_me" && d.status !== "paid")
    .reduce((s, d) => s + (d.amount - (d.paid_amount || 0)), 0);
  const netBalance = totalOwedToMe - totalIOwe;

  const getDebtStatus = (d: Debt): "paid" | "overdue" | "pending" => {
    const remaining = d.amount - (d.paid_amount || 0);
    if (remaining <= 0 || d.status === "paid") return "paid";
    const echeance = d.date_echeance || d.due_date;
    if (echeance && new Date(echeance) < new Date()) return "overdue";
    return "pending";
  };

  const filtered = debts.filter((d) => d.type === filter);

  // ─────────────────────────────────────────────
  // Create debt with preuve upload
  // ─────────────────────────────────────────────
  const createDebt = async () => {
    if (!user) return;
    setCreatingDebt(true);
    let preuveUrl: string | null = null;
    let preuveStoragePath: string | null = null;

    if (preuveFile) {
      try {
        const ext = preuveFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("debt-proofs")
          .upload(path, preuveFile, {
            contentType: preuveFile.type,
            upsert: false,
          });
        if (!uploadError) {
          preuveStoragePath = path;
          const { data: signed } = await supabase.storage
            .from("debt-proofs")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          preuveUrl = signed?.signedUrl || null;
        } else {
          toast({
            title: "Upload preuve échoué",
            description: uploadError.message,
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Upload preuve error:", e);
      }
    }

    // Clean WhatsApp number (CI format)
    let whatsappFormatted: string | null = null;
    if (debtForm.whatsapp.trim()) {
      const cleanWA = debtForm.whatsapp.replace(/\s/g, "").replace(/^0/, "225");
      whatsappFormatted = cleanWA.startsWith("225") ? cleanWA : `225${cleanWA}`;
    }

    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      person_name: debtForm.person_name.trim(),
      amount: Number(debtForm.amount),
      paid_amount: 0,
      motif: debtForm.motif.trim() || null,
      whatsapp: whatsappFormatted,
      note: debtForm.note?.trim() || null,
      date_echeance: debtForm.date_echeance || null,
      due_date: debtForm.date_echeance || null,
      type: debtForm.type,
      preuve_url: preuveUrl,
      preuve_storage_path: preuveStoragePath,
      status: "pending",
    });

    setCreatingDebt(false);

    if (error) {
      toast({
        title: "Erreur création dette",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Dette créée ✅",
      description: preuveUrl ? "Preuve sauvegardée en sécurité." : undefined,
    });
    setShowCreateDebt(false);
    setDebtForm({
      person_name: "",
      amount: "",
      motif: "",
      whatsapp: "",
      note: "",
      date_echeance: "",
      type: filter,
    });
    setPreuveFile(null);
    setPreuvePreview(null);
    fetchDebts();
  };

  // ─────────────────────────────────────────────
  // Payment
  // ─────────────────────────────────────────────
  const handlePayment = async (debt: Debt) => {
    const val = parseFloat(payAmount);
    const remaining = debt.amount - (debt.paid_amount || 0);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    if (val > remaining) {
      toast({
        title: "Dépassement",
        description: `Max ${formatMoneySmart(remaining)} F`,
        variant: "destructive",
      });
      return;
    }
    if (!payWalletId) {
      toast({ title: "Sélectionne un portefeuille", variant: "destructive" });
      return;
    }
    if (!user) return;

    try {
      const txType = debt.type === "i_owe" ? "expense" : "income";
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: txType,
          amount: val,
          wallet_id: payWalletId,
          note: `${debt.type === "i_owe" ? "Remboursement à" : "Reçu de"} ${debt.person_name}`,
          date: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();
      if (txErr) throw txErr;

      await supabase.from("debt_payments").insert({
        debt_id: debt.id,
        user_id: user.id,
        amount: val,
        note: payNote || null,
        transaction_id: txData?.id,
      });

      const newPaid = (debt.paid_amount || 0) + val;
      const newStatus = newPaid >= debt.amount ? "paid" : "pending";
      await supabase
        .from("debts")
        .update({ paid_amount: newPaid, status: newStatus })
        .eq("id", debt.id);

      toast({ title: `${formatMoneySmart(val)} F enregistrés ✅` });
      setPayingDebtId(null);
      setPayAmount("");
      setPayNote("");
      setPayWalletId("");
      fetchDebts();
      fetchPayments(debt.id);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const markAsPaid = async (debtId: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;
    await supabase
      .from("debts")
      .update({ paid_amount: debt.amount, status: "paid" })
      .eq("id", debtId);
    toast({ title: "Marquée comme remboursée ✅" });
    fetchDebts();
  };

  // ─────────────────────────────────────────────
  // WhatsApp reminder
  // ─────────────────────────────────────────────
  const sendWhatsAppReminder = (debt: Debt) => {
    if (!debt.whatsapp) return;
    const remaining = debt.amount - (debt.paid_amount || 0);
    const montantFormate = Number(remaining > 0 ? remaining : debt.amount).toLocaleString("fr-FR");
    const echeance = debt.date_echeance || debt.due_date;
    const echeanceFormatted = echeance
      ? new Date(echeance).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

    let message = "";
    if (debt.type === "owed_to_me") {
      message =
        `Bonjour ${debt.person_name} 👋\n\n` +
        `Je te contacte concernant la somme de *${montantFormate} F CFA* que tu me dois` +
        (debt.motif ? ` pour : _${debt.motif}_` : "") +
        `.\n\n` +
        (echeanceFormatted
          ? `La date de remboursement prévue était le *${echeanceFormatted}*.\n\n`
          : "") +
        `Est-ce que tu peux me dire quand tu pourras procéder au remboursement ? 🙏\n\n` +
        `_Message envoyé via Mon Jeton — jetonclair.com_`;
    } else {
      message =
        `Bonjour ${debt.person_name} 👋\n\n` +
        `Je te contacte pour te signaler que je te dois *${montantFormate} F CFA*` +
        (debt.motif ? ` pour : _${debt.motif}_` : "") +
        `.\n\n` +
        (echeanceFormatted
          ? `Je prévois de te rembourser avant le *${echeanceFormatted}*.\n\n`
          : "") +
        `Je voulais juste confirmer que c'est bien noté de mon côté. 👍\n\n` +
        `_Message envoyé via Mon Jeton — jetonclair.com_`;
    }

    const messageEncoded = encodeURIComponent(message);
    const phone = debt.whatsapp.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${messageEncoded}`;
    window.open(url, "_blank");

    toast({
      title: "📲 WhatsApp ouvert",
      description: `Message prêt pour ${debt.person_name}`,
    });
  };

  const handleDelete = async (debt: Debt) => {
    if (debt.preuve_storage_path) {
      await supabase.storage.from("debt-proofs").remove([debt.preuve_storage_path]);
    }
    await supabase.from("debts").delete().eq("id", debt.id);
    fetchDebts();
  };

  const toggleHistory = (debtId: string) => {
    if (expandedId === debtId) {
      setExpandedId(null);
    } else {
      setExpandedId(debtId);
      if (!payments[debtId]) fetchPayments(debtId);
    }
  };

  return (
    <DashboardLayout title="Dettes">
      {/* ─── NET BALANCE ─── */}
      <div className="glass-card rounded-2xl p-4 mb-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Solde net</p>
        <p className={`text-xl font-bold ${netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
          {netBalance >= 0 ? "+" : ""}
          {formatMoneySmart(netBalance)} F
        </p>
        <div className="flex justify-between mt-3 text-xs">
          <span className="text-destructive">Je dois : {formatMoneySmart(totalIOwe)} F</span>
          <span className="text-primary">On me doit : {formatMoneySmart(totalOwedToMe)} F</span>
        </div>
      </div>

      {/* ─── TOGGLE ─── */}
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-4">
        {(
          [
            { key: "owed_to_me" as const, label: "On me doit", icon: ArrowDownLeft },
            { key: "i_owe" as const, label: "Je dois", icon: ArrowUpRight },
          ]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              filter === f.key
                ? f.key === "i_owe"
                  ? "bg-destructive text-destructive-foreground"
                  : "gradient-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <f.icon className="w-4 h-4" />
            {f.label}
          </button>
        ))}
      </div>

      {/* ─── DEBTS LIST ─── */}
      <div className="space-y-3 mb-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            {filter === "i_owe" ? "Tu ne dois rien 🎉" : "Personne ne te doit rien"}
          </p>
        ) : (
          filtered.map((debt) => {
            const remaining = debt.amount - (debt.paid_amount || 0);
            const pct = debt.amount > 0 ? Math.round(((debt.paid_amount || 0) / debt.amount) * 100) : 0;
            const status = getDebtStatus(debt);
            const isOverdue = status === "overdue";
            const echeance = debt.date_echeance || debt.due_date;
            const debtPayments = payments[debt.id] || [];

            return (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-2xl p-4 border ${
                  isOverdue ? "border-destructive/30" : "border-border"
                } ${status === "paid" ? "opacity-70" : ""}`}
              >
                {/* Header: avatar + nom + montant */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                      style={{
                        background:
                          debt.type === "owed_to_me" ? "rgba(126,200,69,0.15)" : "rgba(255,68,68,0.15)",
                        color: debt.type === "owed_to_me" ? "#7EC845" : "#FF4444",
                      }}
                    >
                      {debt.person_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{debt.person_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {debt.motif || "Aucun motif"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p
                      className={`text-lg font-black tabular-nums ${
                        debt.type === "owed_to_me" ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {debt.type === "owed_to_me" ? "+" : "-"}
                      {formatMoneySmart(debt.amount)} F
                    </p>
                    {echeance && (
                      <p
                        className={`text-xs ${
                          isOverdue ? "text-destructive font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {isOverdue ? "⚠️ En retard" : "📅"}{" "}
                        {new Date(echeance).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                    {status === "paid" && (
                      <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 mt-1">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Soldé
                      </Badge>
                    )}
                    {status === "pending" && pct > 0 && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        <Clock className="w-3 h-3 mr-0.5" /> {pct}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress + reste */}
                {status !== "paid" && pct > 0 && (
                  <>
                    <div className="w-full h-1.5 bg-secondary rounded-full mb-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          debt.type === "i_owe" ? "bg-destructive" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Payé : {formatMoneySmart(debt.paid_amount || 0)} F · Reste :{" "}
                      <span className="font-medium text-foreground">{formatMoneySmart(remaining)} F</span>
                    </p>
                  </>
                )}

                {/* Note */}
                {debt.note && (
                  <div className="bg-secondary/50 rounded-xl px-3 py-2 mb-3">
                    <p className="text-xs text-muted-foreground italic">"{debt.note}"</p>
                  </div>
                )}

                {/* Preuve */}
                {debt.signedPreuveUrl && (
                  <button
                    onClick={() => setFullscreenPreuve(debt.signedPreuveUrl!)}
                    className="w-full mb-3"
                  >
                    <div className="relative h-20 rounded-xl overflow-hidden border border-primary/20">
                      <img
                        src={debt.signedPreuveUrl}
                        alt="Preuve"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-xs text-white font-bold">
                          Voir la preuve / décharge
                        </span>
                      </div>
                    </div>
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {debt.whatsapp && status !== "paid" && (
                    <button
                      onClick={() => sendWhatsAppReminder(debt)}
                      className="flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "#25D366", color: "white" }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Rappeler
                    </button>
                  )}

                  {status !== "paid" && (
                    <Button
                      variant="glass"
                      size="sm"
                      className="flex-1 min-w-[110px]"
                      onClick={() => {
                        setPayingDebtId(debt.id);
                        if (wallets.length === 1) setPayWalletId(wallets[0].id);
                      }}
                    >
                      {debt.type === "i_owe" ? "Rembourser" : "Encaisser"}
                    </Button>
                  )}

                  {status !== "paid" && (
                    <button
                      onClick={() => markAsPaid(debt.id)}
                      className="flex-1 min-w-[110px] glass-card rounded-xl py-2.5 text-xs font-bold text-primary border border-primary/25 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marquer payé
                    </button>
                  )}

                  {status === "paid" && (
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">
                      ✅ Remboursé
                    </div>
                  )}

                  <ConfirmDeleteDialog
                    onConfirm={() => handleDelete(debt)}
                    title="Supprimer cette dette ?"
                  />
                </div>

                {/* Payment form */}
                <AnimatePresence>
                  {payingDebtId === debt.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2 pt-3 border-t border-border">
                        <Input
                          type="number"
                          placeholder={`Montant (max ${formatMoneySmart(remaining)} F)`}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="bg-secondary border-border"
                          autoFocus
                        />
                        <Select value={payWalletId} onValueChange={setPayWalletId}>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Portefeuille" />
                          </SelectTrigger>
                          <SelectContent>
                            {wallets.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.wallet_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Note (optionnel)"
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          className="bg-secondary border-border"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1"
                            onClick={() => {
                              setPayingDebtId(null);
                              setPayAmount("");
                              setPayNote("");
                              setPayWalletId("");
                            }}
                          >
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            variant="hero"
                            className="flex-1"
                            onClick={() => handlePayment(debt)}
                          >
                            Confirmer
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* History toggle */}
                {(debt.paid_amount || 0) > 0 && (
                  <>
                    <button
                      onClick={() => toggleHistory(debt.id)}
                      className="w-full flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Historique
                      {expandedId === debt.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedId === debt.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-1.5">
                            {debtPayments.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                Chargement...
                              </p>
                            ) : (
                              debtPayments.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-secondary/50"
                                >
                                  <div>
                                    <span className="text-muted-foreground">
                                      {new Date(p.payment_date).toLocaleDateString("fr-FR")}
                                    </span>
                                    {p.note && (
                                      <span className="text-muted-foreground ml-1">· {p.note}</span>
                                    )}
                                  </div>
                                  <span className="font-medium text-foreground">
                                    -{formatMoneySmart(p.amount)} F
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── ADD BUTTON ─── */}
      <Button
        variant="glass"
        size="lg"
        className="w-full"
        onClick={() => {
          setDebtForm((f) => ({ ...f, type: filter }));
          setShowCreateDebt(true);
        }}
      >
        <Plus className="w-4 h-4" /> Ajouter une dette
      </Button>

      {/* ─── CREATE DEBT DIALOG ─── */}
      <Dialog open={showCreateDebt} onOpenChange={setShowCreateDebt}>
        <DialogContent className="glass-card border-border mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-black text-foreground">
            Nouvelle dette
          </DialogTitle>

          {/* Toggle type */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { val: "owed_to_me" as const, label: "On me doit", icon: "📥" },
              { val: "i_owe" as const, label: "Je dois", icon: "📤" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setDebtForm((f) => ({ ...f, type: opt.val }))}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold transition-all ${
                  debtForm.type === opt.val
                    ? "gradient-primary text-primary-foreground"
                    : "glass text-muted-foreground"
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Nom de la personne *
              </Label>
              <Input
                placeholder="Ex: Kouamé Yao"
                value={debtForm.person_name}
                onChange={(e) => setDebtForm((f) => ({ ...f, person_name: e.target.value }))}
                className="bg-secondary border-border"
                maxLength={100}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Montant (F CFA) *
              </Label>
              <Input
                type="number"
                placeholder="Ex: 25 000"
                value={debtForm.amount}
                onChange={(e) => setDebtForm((f) => ({ ...f, amount: e.target.value }))}
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Motif de la dette *
              </Label>
              <Input
                placeholder="Ex: Prêt pour loyer, achat marchandise..."
                value={debtForm.motif}
                onChange={(e) => setDebtForm((f) => ({ ...f, motif: e.target.value }))}
                className="bg-secondary border-border"
                maxLength={200}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Date de remboursement prévue
              </Label>
              <Input
                type="date"
                value={debtForm.date_echeance}
                onChange={(e) => setDebtForm((f) => ({ ...f, date_echeance: e.target.value }))}
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Numéro WhatsApp
                <span className="text-primary ml-1">(pour le rappel automatique)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  🇨🇮 +225
                </span>
                <Input
                  type="tel"
                  placeholder="07 00 00 00 00"
                  value={debtForm.whatsapp}
                  onChange={(e) => setDebtForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  className="bg-secondary border-border pl-20"
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Note (contexte, conditions...)
              </Label>
              <textarea
                placeholder="Ex: Remboursement prévu fin du mois, avec intérêts de 5%..."
                value={debtForm.note}
                onChange={(e) => setDebtForm((f) => ({ ...f, note: e.target.value }))}
                rows={3}
                maxLength={500}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Preuve */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Preuve / Décharge
                <span className="text-muted-foreground/60 ml-1">
                  (capture, contrat, screenshot)
                </span>
              </Label>
              {preuvePreview ? (
                <div className="relative">
                  <img
                    src={preuvePreview}
                    alt="Preuve"
                    className="w-full h-40 object-cover rounded-xl border border-border"
                  />
                  <button
                    onClick={() => {
                      setPreuveFile(null);
                      setPreuvePreview(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-bold">
                    ✓ Preuve ajoutée
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
                  <Camera className="w-6 h-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground text-center px-4">
                    Appuyez pour ajouter une photo, capture d'écran ou document
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: "Fichier trop lourd",
                            description: "Maximum 10 Mo",
                            variant: "destructive",
                          });
                          return;
                        }
                        setPreuveFile(file);
                        setPreuvePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              )}
              {preuvePreview && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Cette preuve sera stockée de façon sécurisée et accessible à tout moment.
                </p>
              )}
            </div>
          </div>

          <Button
            className="w-full gradient-primary text-primary-foreground font-bold mt-2"
            disabled={
              !debtForm.person_name.trim() ||
              !debtForm.amount ||
              !debtForm.motif.trim() ||
              creatingDebt
            }
            onClick={createDebt}
          >
            {creatingDebt ? "Création en cours..." : "Créer la dette →"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ─── FULLSCREEN PREUVE ─── */}
      <AnimatePresence>
        {fullscreenPreuve && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "rgba(0,0,0,0.97)" }}
            onClick={() => setFullscreenPreuve(null)}
          >
            <div
              className="flex items-center justify-between px-4 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <p className="text-sm font-bold text-white">Preuve / Décharge</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!fullscreenPreuve) return;
                    try {
                      const res = await fetch(fullscreenPreuve);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `preuve_dette_${Date.now()}.jpg`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      toast({ title: "Téléchargement échoué", variant: "destructive" });
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setFullscreenPreuve(null)}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div
              className="flex-1 flex items-center justify-center px-4 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fullscreenPreuve}
                alt="Preuve dette"
                className="max-w-full max-h-full object-contain rounded-xl"
                style={{ touchAction: "pinch-zoom" }}
              />
            </div>

            <div className="px-4 pb-6" onClick={(e) => e.stopPropagation()}>
              <div className="glass-card rounded-xl p-3 border border-primary/20 flex gap-2">
                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Cette preuve est stockée de façon sécurisée dans Mon Jeton et peut servir de
                  référence en cas de litige.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Debts;
