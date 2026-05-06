import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowUpRight, ArrowDownLeft, Plus, ChevronDown, ChevronUp,
  Clock, CheckCircle2, ShieldCheck, MessageCircle,
  CheckCircle, Camera, X, Download, Pencil, RefreshCw, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
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
import { ContactPickerButton } from "@/components/debts/ContactPickerButton";
import { InstallmentPlanInput } from "@/components/debts/InstallmentPlanInput";
import { EditDebtDialog, ReloanDialog } from "@/components/debts/EditDebtDialog";
import {
  applyPaymentToInstallments,
  logDebtChange,
  markOverdueInstallments,
  InstallmentSeed,
} from "@/lib/debtHistory";

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

interface DebtHistoryRow {
  id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
}

interface DebtInstallment {
  id: string;
  due_date: string;
  expected_amount: number;
  paid_amount: number;
  status: string;
  order_index: number;
}

interface WalletItem {
  id: string;
  wallet_name: string;
}

const FIELD_LABELS: Record<string, string> = {
  amount: "Montant",
  motif: "Motif",
  note: "Note",
  date_echeance: "Échéance",
  whatsapp: "WhatsApp",
};

const ACTION_LABELS: Record<string, string> = {
  edit: "✏️ Modification",
  loan_increased: "💰 Re-prêt",
  status_change: "🔄 Statut",
  plan_change: "📅 Plan",
  installment_paid: "✅ Échéance payée",
};

const Debts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filter, setFilter] = useState<"i_owe" | "owed_to_me">("owed_to_me");
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("CI");

  // Create dialog
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
  const [planEnabled, setPlanEnabled] = useState(false);
  const [planRows, setPlanRows] = useState<InstallmentSeed[]>([]);

  // Payment
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payWalletId, setPayWalletId] = useState("");
  const [wallets, setWallets] = useState<WalletItem[]>([]);

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, DebtPayment[]>>({});
  const [history, setHistory] = useState<Record<string, DebtHistoryRow[]>>({});
  const [installments, setInstallments] = useState<Record<string, DebtInstallment[]>>({});

  // Edit / Reloan
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [reloanDebt, setReloanDebt] = useState<Debt | null>(null);

  // Fullscreen preuve
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

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("country")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.country) setCountry(data.country);
  }, [user]);

  const fetchExpanded = async (debtId: string) => {
    const [paysRes, histRes, insRes] = await Promise.all([
      supabase
        .from("debt_payments")
        .select("id, amount, payment_date, note")
        .eq("debt_id", debtId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("debt_history")
        .select("id, action, field, old_value, new_value, note, created_at")
        .eq("debt_id", debtId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("debt_installments")
        .select("id, due_date, expected_amount, paid_amount, status, order_index")
        .eq("debt_id", debtId)
        .order("order_index", { ascending: true }),
    ]);
    setPayments((p) => ({ ...p, [debtId]: (paysRes.data as DebtPayment[]) || [] }));
    setHistory((h) => ({ ...h, [debtId]: (histRes.data as DebtHistoryRow[]) || [] }));
    setInstallments((i) => ({
      ...i,
      [debtId]: (insRes.data as DebtInstallment[]) || [],
    }));
  };

  useEffect(() => {
    fetchDebts();
    fetchWallets();
    fetchProfile();
    if (user) markOverdueInstallments(user.id);
  }, [fetchDebts, fetchWallets, fetchProfile, user]);

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

  const resetForm = () => {
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
    setPlanEnabled(false);
    setPlanRows([]);
  };

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
          .upload(path, preuveFile, { contentType: preuveFile.type, upsert: false });
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

    const { data: created, error } = await supabase
      .from("debts")
      .insert({
        user_id: user.id,
        person_name: debtForm.person_name.trim(),
        amount: Number(debtForm.amount),
        paid_amount: 0,
        motif: debtForm.motif.trim() || null,
        whatsapp: debtForm.whatsapp?.trim() || null,
        note: debtForm.note?.trim() || null,
        date_echeance: debtForm.date_echeance || null,
        due_date: debtForm.date_echeance || null,
        type: debtForm.type,
        preuve_url: preuveUrl,
        preuve_storage_path: preuveStoragePath,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !created) {
      setCreatingDebt(false);
      toast({
        title: "Erreur création dette",
        description: error?.message,
        variant: "destructive",
      });
      return;
    }

    // Créer les échéances si plan activé
    if (planEnabled && planRows.length > 0) {
      const rows = planRows.map((r) => ({
        debt_id: created.id,
        user_id: user.id,
        due_date: r.due_date,
        expected_amount: r.expected_amount,
        order_index: r.order_index,
        status: "pending" as const,
      }));
      await supabase.from("debt_installments").insert(rows);
      await logDebtChange({
        debtId: created.id,
        userId: user.id,
        action: "plan_change",
        note: `Plan créé : ${planRows.length} échéances`,
      });
    }

    setCreatingDebt(false);
    toast({
      title: "Dette créée ✅",
      description: planEnabled ? `${planRows.length} échéances programmées` : undefined,
    });
    setShowCreateDebt(false);
    resetForm();
    fetchDebts();
  };

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

      // Affecter aux échéances
      await applyPaymentToInstallments(debt.id, val);

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
      if (expandedId === debt.id) fetchExpanded(debt.id);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const markAsPaid = async (debtId: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || !user) return;
    await supabase
      .from("debts")
      .update({ paid_amount: debt.amount, status: "paid" })
      .eq("id", debtId);
    await logDebtChange({
      debtId,
      userId: user.id,
      action: "status_change",
      field: "status",
      oldValue: debt.status,
      newValue: "paid",
    });
    toast({ title: "Marquée comme remboursée ✅" });
    fetchDebts();
  };

  const sendWhatsAppReminder = (debt: Debt) => {
    if (!debt.whatsapp) return;
    const remaining = debt.amount - (debt.paid_amount || 0);
    const montantFormate = Number(remaining > 0 ? remaining : debt.amount).toLocaleString("fr-FR");
    const echeance = debt.date_echeance || debt.due_date;
    const echeanceFormatted = echeance
      ? new Date(echeance).toLocaleDateString("fr-FR", {
          day: "2-digit", month: "long", year: "numeric",
        })
      : null;

    const message =
      debt.type === "owed_to_me"
        ? `Bonjour ${debt.person_name} 👋\n\nJe te contacte concernant la somme de *${montantFormate} F CFA* que tu me dois${debt.motif ? ` pour : _${debt.motif}_` : ""}.\n\n${echeanceFormatted ? `La date prévue était le *${echeanceFormatted}*.\n\n` : ""}Quand pourras-tu rembourser ? 🙏\n\n_Mon Jeton — monjeton.app_`
        : `Bonjour ${debt.person_name} 👋\n\nJe te dois *${montantFormate} F CFA*${debt.motif ? ` pour : _${debt.motif}_` : ""}.\n\n${echeanceFormatted ? `Je prévois de rembourser avant le *${echeanceFormatted}*.\n\n` : ""}_Mon Jeton — monjeton.app_`;

    const phone = debt.whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    toast({ title: "📲 WhatsApp ouvert", description: `Message prêt pour ${debt.person_name}` });
  };

  const handleDelete = async (debt: Debt) => {
    if (debt.preuve_storage_path) {
      await supabase.storage.from("debt-proofs").remove([debt.preuve_storage_path]);
    }
    await supabase.from("debts").delete().eq("id", debt.id);
    fetchDebts();
  };

  const toggleExpanded = (debtId: string) => {
    if (expandedId === debtId) {
      setExpandedId(null);
    } else {
      setExpandedId(debtId);
      if (!payments[debtId]) fetchExpanded(debtId);
    }
  };

  return (
    <DashboardLayout title="Dettes">
      {/* NET BALANCE */}
      <div className="glass-card rounded-2xl p-4 mb-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Solde net</p>
        <p className={`text-xl font-bold ${netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
          {netBalance >= 0 ? "+" : ""}{formatMoneySmart(netBalance)} F
        </p>
        <div className="flex justify-between mt-3 text-xs">
          <span className="text-destructive">Je dois : {formatMoneySmart(totalIOwe)} F</span>
          <span className="text-primary">On me doit : {formatMoneySmart(totalOwedToMe)} F</span>
        </div>
      </div>

      {/* TOGGLE */}
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-4">
        {([
          { key: "owed_to_me" as const, label: "On me doit", icon: ArrowDownLeft },
          { key: "i_owe" as const, label: "Je dois", icon: ArrowUpRight },
        ]).map((f) => (
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
            <f.icon className="w-4 h-4" />{f.label}
          </button>
        ))}
      </div>

      {/* LIST */}
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
            const debtHist = history[debt.id] || [];
            const debtIns = installments[debt.id] || [];
            const hasActivity = (debt.paid_amount || 0) > 0 || debtIns.length > 0 || debtHist.length > 0;

            return (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-2xl p-4 border ${
                  isOverdue ? "border-destructive/30" : "border-border"
                } ${status === "paid" ? "opacity-70" : ""}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                      style={{
                        background: debt.type === "owed_to_me" ? "rgba(126,200,69,0.15)" : "rgba(255,68,68,0.15)",
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
                    <p className={`text-lg font-black tabular-nums ${
                      debt.type === "owed_to_me" ? "text-primary" : "text-destructive"
                    }`}>
                      {debt.type === "owed_to_me" ? "+" : "-"}{formatMoneySmart(debt.amount)} F
                    </p>
                    {echeance && (
                      <p className={`text-xs ${isOverdue ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                        {isOverdue ? "⚠️ En retard" : "📅"} {new Date(echeance).toLocaleDateString("fr-FR")}
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

                {/* Progress */}
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

                {debt.note && (
                  <div className="bg-secondary/50 rounded-xl px-3 py-2 mb-3">
                    <p className="text-xs text-muted-foreground italic">"{debt.note}"</p>
                  </div>
                )}

                {debt.signedPreuveUrl && (
                  <button onClick={() => setFullscreenPreuve(debt.signedPreuveUrl!)} className="w-full mb-3">
                    <div className="relative h-20 rounded-xl overflow-hidden border border-primary/20">
                      <img src={debt.signedPreuveUrl} alt="Preuve" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-xs text-white font-bold">Voir la preuve</span>
                      </div>
                    </div>
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {debt.whatsapp && status !== "paid" && (
                    <button
                      onClick={() => sendWhatsAppReminder(debt)}
                      className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "#25D366", color: "white" }}
                    >
                      <MessageCircle className="w-4 h-4" />Rappeler
                    </button>
                  )}
                  {status !== "paid" && (
                    <Button
                      variant="glass" size="sm" className="flex-1 min-w-[100px]"
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
                      className="flex-1 min-w-[100px] glass-card rounded-xl py-2.5 text-xs font-bold text-primary border border-primary/25 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />Marquer payé
                    </button>
                  )}
                  {status === "paid" && (
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold">
                      ✅ Remboursé
                    </div>
                  )}
                </div>

                {/* Secondary actions */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditingDebt(debt)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground bg-secondary/50 hover:bg-secondary"
                  >
                    <Pencil className="w-3.5 h-3.5" />Modifier
                  </button>
                  {debt.type === "owed_to_me" && status !== "paid" && (
                    <button
                      onClick={() => setReloanDebt(debt)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />Re-prêter
                    </button>
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
                        <MoneyInput
                          placeholder={`Montant (max ${formatMoneySmart(remaining)} F)`}
                          value={payAmount}
                          onChange={(n) => setPayAmount(n ? String(n) : "")}
                          showCurrency={false}
                          className="[&>input]:bg-secondary [&>input]:border-border"
                          autoFocus
                        />
                        <Select value={payWalletId} onValueChange={setPayWalletId}>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Portefeuille" />
                          </SelectTrigger>
                          <SelectContent>
                            {wallets.map((w) => (
                              <SelectItem key={w.id} value={w.id}>{w.wallet_name}</SelectItem>
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
                          <Button size="sm" variant="ghost" className="flex-1" onClick={() => {
                            setPayingDebtId(null); setPayAmount(""); setPayNote(""); setPayWalletId("");
                          }}>Annuler</Button>
                          <Button size="sm" variant="hero" className="flex-1" onClick={() => handlePayment(debt)}>
                            Confirmer
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expand toggle */}
                {hasActivity && (
                  <>
                    <button
                      onClick={() => toggleExpanded(debt.id)}
                      className="w-full flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Détails & historique
                      {expandedId === debt.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <AnimatePresence>
                      {expandedId === debt.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-3">
                            {/* Échéances */}
                            {debtIns.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <ListChecks className="w-3.5 h-3.5 text-primary" />
                                  <p className="text-xs font-bold text-foreground">Plan de remboursement</p>
                                </div>
                                <div className="space-y-1.5">
                                  {debtIns.map((ins) => {
                                    const insPct = ins.expected_amount > 0
                                      ? Math.round((Number(ins.paid_amount) / Number(ins.expected_amount)) * 100)
                                      : 0;
                                    const color =
                                      ins.status === "paid"
                                        ? "bg-primary"
                                        : ins.status === "overdue"
                                        ? "bg-destructive"
                                        : ins.status === "partial"
                                        ? "bg-yellow-500"
                                        : "bg-muted-foreground/30";
                                    return (
                                      <div key={ins.id} className="bg-secondary/40 rounded-lg p-2">
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                          <span className="text-muted-foreground">
                                            {new Date(ins.due_date).toLocaleDateString("fr-FR")}
                                          </span>
                                          <span className="font-bold tabular-nums">
                                            {formatMoneySmart(ins.paid_amount)} / {formatMoneySmart(ins.expected_amount)} F
                                          </span>
                                        </div>
                                        <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                                          <div className={`h-full ${color}`} style={{ width: `${Math.min(insPct, 100)}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Paiements */}
                            {debtPayments.length > 0 && (
                              <div>
                                <p className="text-xs font-bold mb-1.5 text-foreground">Paiements</p>
                                <div className="space-y-1">
                                  {debtPayments.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-secondary/50">
                                      <span className="text-muted-foreground">
                                        {new Date(p.payment_date).toLocaleDateString("fr-FR")}
                                        {p.note && <span className="ml-1">· {p.note}</span>}
                                      </span>
                                      <span className="font-bold text-foreground">-{formatMoneySmart(p.amount)} F</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Historique modifs */}
                            {debtHist.length > 0 && (
                              <div>
                                <p className="text-xs font-bold mb-1.5 text-foreground">Modifications</p>
                                <div className="space-y-1">
                                  {debtHist.map((h) => (
                                    <div key={h.id} className="text-[11px] px-2 py-1.5 rounded-lg bg-secondary/50">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{ACTION_LABELS[h.action] || h.action}</span>
                                        <span className="text-muted-foreground">
                                          {new Date(h.created_at).toLocaleDateString("fr-FR")}
                                        </span>
                                      </div>
                                      {h.field && (
                                        <p className="text-muted-foreground mt-0.5">
                                          {FIELD_LABELS[h.field] || h.field}:{" "}
                                          <span className="line-through opacity-60">{h.old_value || "—"}</span>
                                          {" → "}
                                          <span className="text-foreground">{h.new_value || "—"}</span>
                                        </p>
                                      )}
                                      {h.note && <p className="text-muted-foreground italic mt-0.5">{h.note}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
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

      {/* ADD BUTTON */}
      <Button
        variant="glass" size="lg" className="w-full"
        onClick={() => {
          resetForm();
          setDebtForm((f) => ({ ...f, type: filter }));
          setShowCreateDebt(true);
        }}
      >
        <Plus className="w-4 h-4" /> Ajouter une dette
      </Button>

      {/* CREATE DIALOG */}
      <Dialog open={showCreateDebt} onOpenChange={setShowCreateDebt}>
        <DialogContent className="glass-card border-border mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-black text-foreground">Nouvelle dette</DialogTitle>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { val: "owed_to_me" as const, label: "On me doit", icon: "📥" },
              { val: "i_owe" as const, label: "Je dois", icon: "📤" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setDebtForm((f) => ({ ...f, type: opt.val }))}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold ${
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
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground">Nom de la personne *</Label>
                <ContactPickerButton
                  countryCode={country}
                  onPick={({ name, phoneE164 }) => {
                    setDebtForm((f) => ({
                      ...f,
                      person_name: name || f.person_name,
                      whatsapp: phoneE164 || f.whatsapp,
                    }));
                  }}
                />
              </div>
              <Input
                placeholder="Ex: Kouamé Yao"
                value={debtForm.person_name}
                onChange={(e) => setDebtForm((f) => ({ ...f, person_name: e.target.value }))}
                className="bg-secondary border-border"
                maxLength={100}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Montant (F CFA) *</Label>
              <MoneyInput
                placeholder="Ex: 25 000"
                value={debtForm.amount}
                onChange={(n) => setDebtForm((f) => ({ ...f, amount: n ? String(n) : "" }))}
                showCurrency={false}
                className="[&>input]:bg-secondary [&>input]:border-border"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Motif *</Label>
              <Input
                placeholder="Ex: Prêt pour loyer"
                value={debtForm.motif}
                onChange={(e) => setDebtForm((f) => ({ ...f, motif: e.target.value }))}
                className="bg-secondary border-border"
                maxLength={200}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Échéance prévue</Label>
              <Input
                type="date"
                value={debtForm.date_echeance}
                onChange={(e) => setDebtForm((f) => ({ ...f, date_echeance: e.target.value }))}
                className="bg-secondary border-border"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Numéro WhatsApp <span className="text-primary ml-1">(rappel automatique)</span>
              </Label>
              <Input
                type="tel"
                placeholder="+225 07 00 00 00 00"
                value={debtForm.whatsapp}
                onChange={(e) => setDebtForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className="bg-secondary border-border"
                maxLength={20}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Note</Label>
              <textarea
                placeholder="Conditions, contexte..."
                value={debtForm.note}
                onChange={(e) => setDebtForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                maxLength={500}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground resize-none"
              />
            </div>

            {/* Plan échéancier */}
            <InstallmentPlanInput
              totalAmount={Number(debtForm.amount) || 0}
              value={planRows}
              onChange={setPlanRows}
              enabled={planEnabled}
              onToggle={setPlanEnabled}
            />

            {/* Preuve */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Preuve / Décharge
                <span className="text-muted-foreground/60 ml-1">(capture, contrat)</span>
              </Label>
              {preuvePreview ? (
                <div className="relative">
                  <img src={preuvePreview} alt="Preuve" className="w-full h-32 object-cover rounded-xl border border-border" />
                  <button
                    onClick={() => { setPreuveFile(null); setPreuvePreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 bg-secondary/50">
                  <Camera className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Ajouter une photo</span>
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        toast({ title: "Fichier trop lourd", description: "Max 10 Mo", variant: "destructive" });
                        return;
                      }
                      setPreuveFile(file);
                      setPreuvePreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <Button
            className="w-full gradient-primary text-primary-foreground font-bold mt-3"
            disabled={!debtForm.person_name.trim() || !debtForm.amount || !debtForm.motif.trim() || creatingDebt}
            onClick={createDebt}
          >
            {creatingDebt ? "Création en cours..." : "Créer la dette →"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* EDIT */}
      <EditDebtDialog
        debt={editingDebt}
        userId={user?.id || ""}
        open={!!editingDebt}
        onClose={() => setEditingDebt(null)}
        onSaved={() => {
          fetchDebts();
          if (editingDebt && expandedId === editingDebt.id) fetchExpanded(editingDebt.id);
        }}
      />

      {/* RELOAN */}
      <ReloanDialog
        debt={reloanDebt}
        userId={user?.id || ""}
        open={!!reloanDebt}
        onClose={() => setReloanDebt(null)}
        onSaved={() => {
          fetchDebts();
          if (reloanDebt && expandedId === reloanDebt.id) fetchExpanded(reloanDebt.id);
        }}
      />

      {/* FULLSCREEN PREUVE */}
      <AnimatePresence>
        {fullscreenPreuve && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "rgba(0,0,0,0.97)" }}
            onClick={() => setFullscreenPreuve(null)}
          >
            <div className="flex items-center justify-between px-4 py-4" onClick={(e) => e.stopPropagation()}>
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
                      a.href = url; a.download = `preuve_dette_${Date.now()}.jpg`; a.click();
                      URL.revokeObjectURL(url);
                    } catch { toast({ title: "Téléchargement échoué", variant: "destructive" }); }
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
            <div className="flex-1 flex items-center justify-center px-4 pb-8" onClick={(e) => e.stopPropagation()}>
              <img src={fullscreenPreuve} alt="Preuve" className="max-w-full max-h-full object-contain rounded-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Debts;
