import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import {
  ArrowUpRight, ArrowDownLeft, Plus, Copy, ChevronDown, ChevronUp,
  Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  note: string | null;
  status: string;
  created_at: string;
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
  const [filter, setFilter] = useState<"i_owe" | "owed_to_me">("i_owe");
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<"i_owe" | "owed_to_me">("i_owe");
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  // Payment states
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payWalletId, setPayWalletId] = useState("");
  const [wallets, setWallets] = useState<WalletItem[]>([]);

  // History states
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, DebtPayment[]>>({});

  const fetchDebts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDebts((data as Debt[]) || []);
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
    setPayments(prev => ({ ...prev, [debtId]: (data as DebtPayment[]) || [] }));
  };

  useEffect(() => {
    fetchDebts();
    fetchWallets();
  }, [fetchDebts, fetchWallets]);

  // Computed values
  const totalIOwe = debts
    .filter(d => d.type === "i_owe" && d.status !== "paid")
    .reduce((s, d) => s + (d.amount - (d.paid_amount || 0)), 0);
  const totalOwedToMe = debts
    .filter(d => d.type === "owed_to_me" && d.status !== "paid")
    .reduce((s, d) => s + (d.amount - (d.paid_amount || 0)), 0);
  const netBalance = totalOwedToMe - totalIOwe;

  const getDebtStatus = (d: Debt): "paid" | "overdue" | "pending" => {
    const remaining = d.amount - (d.paid_amount || 0);
    if (remaining <= 0) return "paid";
    if (d.due_date && new Date(d.due_date) < new Date()) return "overdue";
    return "pending";
  };

  const filtered = debts.filter(d => d.type === filter);

  const handleAdd = async () => {
    if (!personName || !amount || !user) return;
    await supabase.from("debts").insert({
      user_id: user.id,
      type: newType,
      person_name: personName,
      amount: Number(amount),
      paid_amount: 0,
      due_date: dueDate || null,
      note: note || null,
    });
    toast({ title: "Dette ajoutée ✅" });
    setPersonName(""); setAmount(""); setDueDate(""); setNote(""); setShowAdd(false);
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
      toast({ title: "Dépassement", description: `Max ${formatMoneySmart(remaining)} F`, variant: "destructive" });
      return;
    }
    if (!payWalletId) {
      toast({ title: "Sélectionne un portefeuille", variant: "destructive" });
      return;
    }
    if (!user) return;

    try {
      // Create transaction
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

      // Record payment
      await supabase.from("debt_payments").insert({
        debt_id: debt.id,
        user_id: user.id,
        amount: val,
        note: payNote || null,
        transaction_id: txData?.id,
      });

      // Update debt
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

  const handleCopyReminder = (debt: Debt) => {
    const remaining = debt.amount - (debt.paid_amount || 0);
    const msg = `Bonjour ${debt.person_name}, tu me dois encore ${formatMoneySmart(remaining)} F. Peux-tu me rembourser ? - Mon Jeton`;
    navigator.clipboard.writeText(msg);
    toast({ title: "Message copié 📋" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("debts").delete().eq("id", id);
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
          {netBalance >= 0 ? "+" : ""}{formatMoneySmart(netBalance)} F
        </p>
        <div className="flex justify-between mt-3 text-xs">
          <span className="text-destructive">Je dois : {formatMoneySmart(totalIOwe)} F</span>
          <span className="text-primary">On me doit : {formatMoneySmart(totalOwedToMe)} F</span>
        </div>
      </div>

      {/* ─── TOGGLE ─── */}
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-4">
        {([
          { key: "i_owe" as const, label: "Je dois", icon: ArrowUpRight },
          { key: "owed_to_me" as const, label: "On me doit", icon: ArrowDownLeft },
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
          filtered.map((d, i) => {
            const remaining = d.amount - (d.paid_amount || 0);
            const pct = d.amount > 0 ? Math.round(((d.paid_amount || 0) / d.amount) * 100) : 0;
            const status = getDebtStatus(d);
            const debtPayments = payments[d.id] || [];

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <BorderRotate className={`p-4 ${status === "paid" ? "opacity-60" : ""}`} animationSpeed={18}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      d.type === "i_owe" ? "bg-destructive/20" : "bg-primary/20"
                    }`}>
                      {d.type === "i_owe"
                        ? <ArrowUpRight className="w-5 h-5 text-destructive" />
                        : <ArrowDownLeft className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.person_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.due_date && new Date(d.due_date).toLocaleDateString("fr-FR")}
                        {d.note && ` · ${d.note}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${d.type === "i_owe" ? "text-destructive" : "text-primary"}`}>
                        {formatMoneySmart(d.amount)} F
                      </p>
                      {status === "paid" && (
                        <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Soldé
                        </Badge>
                      )}
                      {status === "overdue" && (
                        <Badge className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">
                          <AlertTriangle className="w-3 h-3 mr-0.5" /> En retard
                        </Badge>
                      )}
                      {status === "pending" && pct > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Clock className="w-3 h-3 mr-0.5" /> {pct}%
                        </Badge>
                      )}
                    </div>
                    <ConfirmDeleteDialog onConfirm={() => handleDelete(d.id)} title="Supprimer cette dette ?" />
                  </div>

                  {/* Progress bar for partial payments */}
                  {status !== "paid" && pct > 0 && (
                    <div className="w-full h-1.5 bg-secondary rounded-full mb-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${d.type === "i_owe" ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Remaining info */}
                  {status !== "paid" && (d.paid_amount || 0) > 0 && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Payé : {formatMoneySmart(d.paid_amount || 0)} F · Reste : <span className="font-medium text-foreground">{formatMoneySmart(remaining)} F</span>
                    </p>
                  )}

                  {/* Action buttons */}
                  {status !== "paid" && (
                    <div className="flex gap-2 mt-1">
                      {d.type === "owed_to_me" && (
                        <Button variant="glass" size="sm" className="flex-1" onClick={() => handleCopyReminder(d)}>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Rappeler
                        </Button>
                      )}
                      <Button
                        variant="glass"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setPayingDebtId(d.id);
                          if (wallets.length === 1) setPayWalletId(wallets[0].id);
                        }}
                      >
                        {d.type === "i_owe" ? "Rembourser" : "Encaisser"}
                      </Button>
                    </div>
                  )}

                  {/* Payment form */}
                  <AnimatePresence>
                    {payingDebtId === d.id && (
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
                            onChange={e => setPayAmount(e.target.value)}
                            className="bg-secondary border-border"
                            autoFocus
                          />
                          <Select value={payWalletId} onValueChange={setPayWalletId}>
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Portefeuille" />
                            </SelectTrigger>
                            <SelectContent>
                              {wallets.map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.wallet_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Note (optionnel)"
                            value={payNote}
                            onChange={e => setPayNote(e.target.value)}
                            className="bg-secondary border-border"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setPayingDebtId(null); setPayAmount(""); setPayNote(""); setPayWalletId(""); }}>
                              Annuler
                            </Button>
                            <Button size="sm" variant="hero" className="flex-1" onClick={() => handlePayment(d)}>
                              Confirmer
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* History toggle */}
                  {(d.paid_amount || 0) > 0 && (
                    <>
                      <button
                        onClick={() => toggleHistory(d.id)}
                        className="w-full flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Historique
                        {expandedId === d.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <AnimatePresence>
                        {expandedId === d.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-1.5">
                              {debtPayments.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">Chargement...</p>
                              ) : (
                                debtPayments.map(p => (
                                  <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-secondary/50">
                                    <div>
                                      <span className="text-muted-foreground">
                                        {new Date(p.payment_date).toLocaleDateString("fr-FR")}
                                      </span>
                                      {p.note && <span className="text-muted-foreground ml-1">· {p.note}</span>}
                                    </div>
                                    <span className="font-medium text-foreground">-{formatMoneySmart(p.amount)} F</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </BorderRotate>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── ADD FORM ─── */}
      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setNewType("i_owe")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                newType === "i_owe" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground bg-secondary"
              }`}
            >
              Je dois
            </button>
            <button
              onClick={() => setNewType("owed_to_me")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                newType === "owed_to_me" ? "gradient-primary text-primary-foreground" : "text-muted-foreground bg-secondary"
              }`}
            >
              On me doit
            </button>
          </div>
          <Input placeholder="Nom de la personne" value={personName} onChange={(e) => setPersonName(e.target.value)} className="bg-secondary border-border" />
          <Input type="number" placeholder="Montant (FCFA)" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary border-border" />
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-secondary border-border" />
          <Input placeholder="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} className="bg-secondary border-border" />
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => setShowAdd(false)} className="flex-1">Annuler</Button>
            <Button variant="hero" onClick={handleAdd} className="flex-1">Ajouter</Button>
          </div>
        </motion.div>
      ) : (
        <Button variant="glass" size="lg" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Ajouter une dette
        </Button>
      )}
    </DashboardLayout>
  );
};

export default Debts;
