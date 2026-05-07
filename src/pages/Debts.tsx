import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ContactRound,
  X,
  User,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";
import { formatThousands } from "@/lib/formatAmount";
import {
  ContactPicker,
  type PickedContact,
} from "@/components/contacts/ContactPicker";
import { formatPhoneDisplay } from "@/lib/contactsService";
import {
  PersonDebtContainer,
  type PersonGroup,
} from "@/components/debts/PersonDebtContainer";
import type { DebtCardData } from "@/components/debts/DebtCard";
import { EditDebtModal } from "@/components/debts/EditDebtModal";
import { PaymentModal } from "@/components/debts/PaymentModal";
import { markOverdueInstallments } from "@/lib/debtHistory";

type StatusFilter = "all" | "pending" | "overdue" | "paid";
type DebtType = "owed_to_me" | "i_owe";

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En cours" },
  { key: "overdue", label: "En retard" },
  { key: "paid", label: "Payées" },
];

const Debts = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [groups, setGroups] = useState<PersonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<DebtType>("owed_to_me");

  // New debt
  const [showNew, setShowNew] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PickedContact | null>(
    null,
  );
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newMotif, setNewMotif] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newType, setNewType] = useState<DebtType>("owed_to_me");
  const [paymentType, setPaymentType] = useState<
    "lump_sum" | "monthly" | "custom"
  >("lump_sum");
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [customInstallments, setCustomInstallments] = useState<
    Array<{ date: string; amount: number }>
  >([]);
  const [creating, setCreating] = useState(false);

  // Edit / Pay
  const [editing, setEditing] = useState<DebtCardData | null>(null);
  const [paying, setPaying] = useState<DebtCardData | null>(null);
  const [targetInstallment, setTargetInstallment] = useState<{
    id: string;
    expected_amount: number;
    paid_amount?: number;
  } | null>(null);

  const loadDebts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await markOverdueInstallments(user.id);

      const { data: debtsData, error } = await supabase
        .from("debts")
        .select(
          `*, debt_persons(id, name, phone, whatsapp, photo_uri, contact_id)`,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const debtIds = (debtsData || []).map((d) => d.id);
      let installmentsData: Array<{
        id: string;
        debt_id: string;
        due_date: string;
        expected_amount: number;
        paid_amount: number;
        paid_date: string | null;
        installment_number: number | null;
        status: string;
      }> = [];
      if (debtIds.length > 0) {
        const { data } = await supabase
          .from("debt_installments")
          .select(
            "id, debt_id, due_date, expected_amount, paid_amount, paid_date, installment_number, status",
          )
          .in("debt_id", debtIds)
          .order("due_date", { ascending: true });
        installmentsData = (data as typeof installmentsData) || [];
      }

      const byPerson: Record<string, PersonGroup> = {};
      for (const debt of debtsData || []) {
        const personObj = (debt as { debt_persons?: PersonGroup["person"] })
          .debt_persons;
        const key =
          debt.person_id ||
          (personObj?.id ? String(personObj.id) : `manual_${debt.person_name}`);

        if (!byPerson[key]) {
          byPerson[key] = {
            person: personObj || {
              id: null,
              name: debt.person_name,
              phone: debt.whatsapp || null,
              whatsapp: debt.whatsapp || null,
              photo_uri: null,
            },
            debts: [],
          };
        }

        const debtIns = installmentsData.filter((i) => i.debt_id === debt.id);
        byPerson[key].debts.push({
          ...(debt as DebtCardData),
          installments: debtIns,
        });
      }

      setGroups(Object.values(byPerson));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast({
        title: "Erreur chargement",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // Filter groups by status + type
  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        debts: g.debts.filter((d) => {
          if (d.type !== typeFilter) return false;
          if (filter === "all") return true;
          if (filter === "paid") return d.status === "paid";
          if (filter === "overdue") return d.status === "overdue";
          if (filter === "pending")
            return ["pending", "partial"].includes(d.status);
          return true;
        }),
      }))
      .filter((g) => g.debts.length > 0);
  }, [groups, filter, typeFilter]);

  // Top totals (filtered by status excluding paid)
  const totals = useMemo(() => {
    let owedToMe = 0;
    let iOwe = 0;
    const personsOwed = new Set<string>();
    const personsIOwe = new Set<string>();
    for (const g of groups) {
      for (const d of g.debts) {
        if (d.status === "paid" || d.status === "cancelled") continue;
        const remaining = Number(
          d.amount_remaining != null
            ? d.amount_remaining
            : d.amount - (d.paid_amount || 0),
        );
        const personKey = g.person.id || g.person.name;
        if (d.type === "owed_to_me") {
          owedToMe += remaining;
          personsOwed.add(personKey);
        } else if (d.type === "i_owe") {
          iOwe += remaining;
          personsIOwe.add(personKey);
        }
      }
    }
    return {
      owedToMe,
      iOwe,
      countOwed: personsOwed.size,
      countIOwe: personsIOwe.size,
    };
  }, [groups]);

  const resetNew = () => {
    setSelectedContact(null);
    setNewAmount(0);
    setNewMotif("");
    setNewNote("");
    setNewDueDate("");
    setNewType(typeFilter);
    setPaymentType("lump_sum");
    setMonthlyAmount(0);
    setMonthlyDay(1);
    setCustomInstallments([]);
  };

  const openNew = () => {
    resetNew();
    setNewType(typeFilter);
    setShowNew(true);
  };

  const buildInstallments = (
    debtId: string,
    amount: number,
  ): {
    rows: Array<{
      debt_id: string;
      user_id: string;
      installment_number: number;
      expected_amount: number;
      due_date: string;
      order_index: number;
      status: string;
    }>;
    total: number;
  } => {
    if (paymentType === "monthly" && monthlyAmount > 0) {
      const nbMonths = Math.ceil(amount / monthlyAmount);
      const rows = [];
      for (let i = 0; i < nbMonths; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        d.setDate(monthlyDay);
        if (i === 0 && d < new Date()) {
          d.setMonth(d.getMonth() + 1);
        }
        const isLast = i === nbMonths - 1;
        const instAmount = isLast
          ? amount - monthlyAmount * (nbMonths - 1)
          : monthlyAmount;
        rows.push({
          debt_id: debtId,
          user_id: user!.id,
          installment_number: i + 1,
          expected_amount: Math.max(0, instAmount),
          due_date: d.toISOString().slice(0, 10),
          order_index: i,
          status: "pending",
        });
      }
      return { rows, total: nbMonths };
    }
    if (paymentType === "custom") {
      const sorted = [...customInstallments].sort((a, b) =>
        a.date > b.date ? 1 : -1,
      );
      const rows = sorted.map((inst, i) => ({
        debt_id: debtId,
        user_id: user!.id,
        installment_number: i + 1,
        expected_amount: inst.amount,
        due_date: inst.date,
        order_index: i,
        status: "pending",
      }));
      return { rows, total: rows.length };
    }
    return { rows: [], total: 0 };
  };

  const createDebt = async () => {
    if (!user) return;
    if (!selectedContact || !selectedContact.name.trim()) {
      toast({ title: "Choisis un contact", variant: "destructive" });
      return;
    }
    if (newAmount <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    if (paymentType === "monthly" && monthlyAmount <= 0) {
      toast({ title: "Montant mensuel invalide", variant: "destructive" });
      return;
    }
    if (paymentType === "custom") {
      const allocated = customInstallments.reduce((s, i) => s + i.amount, 0);
      if (customInstallments.length === 0 || allocated !== newAmount) {
        toast({
          title: "Plan incomplet",
          description: "Le total des échéances doit égaler le montant",
          variant: "destructive",
        });
        return;
      }
    }
    setCreating(true);

    try {
      // Upsert person
      let personId: string | null = null;
      if (selectedContact.contactId) {
        const { data: existing } = await supabase
          .from("debt_persons")
          .select("id")
          .eq("user_id", user.id)
          .eq("contact_id", selectedContact.contactId)
          .maybeSingle();
        if (existing) personId = existing.id;
      }
      if (!personId) {
        const { data: existing } = await supabase
          .from("debt_persons")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", selectedContact.name.trim())
          .maybeSingle();
        if (existing) personId = existing.id;
      }
      if (!personId) {
        const { data: created, error: persErr } = await supabase
          .from("debt_persons")
          .insert({
            user_id: user.id,
            name: selectedContact.name.trim(),
            phone: selectedContact.phone || null,
            whatsapp: selectedContact.phone || null,
            contact_id: selectedContact.contactId || null,
            photo_uri: selectedContact.photoUri || null,
          })
          .select("id")
          .single();
        if (persErr) throw persErr;
        personId = created.id;
      }

      const { data: newDebt, error } = await supabase
        .from("debts")
        .insert({
          user_id: user.id,
          person_id: personId,
          person_name: selectedContact.name.trim(),
          amount: newAmount,
          amount_remaining: newAmount,
          paid_amount: 0,
          type: newType,
          motif: newMotif.trim() || null,
          note: newNote.trim() || null,
          date_echeance: newDueDate || null,
          due_date: newDueDate || null,
          whatsapp: selectedContact.phone || null,
          status: "pending",
          payment_type: paymentType,
          monthly_amount: paymentType === "monthly" ? monthlyAmount : null,
          monthly_day: paymentType === "monthly" ? monthlyDay : null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (newDebt && paymentType !== "lump_sum") {
        const { rows, total } = buildInstallments(newDebt.id, newAmount);
        if (rows.length > 0) {
          const { error: insErr } = await supabase
            .from("debt_installments")
            .insert(rows);
          if (insErr) throw insErr;
          await supabase
            .from("debts")
            .update({ installments_total: total, installments_paid: 0 })
            .eq("id", newDebt.id);
        }
      }

      toast({ title: "Dette créée ✅" });
      setShowNew(false);
      resetNew();
      loadDebts();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast({
        title: "Erreur création",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout title="Dettes">
      {/* TOTALS */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card rounded-2xl p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            On te doit
          </p>
          <p className="text-lg font-black text-primary tabular-nums mt-0.5">
            {formatThousands(totals.owedToMe)} F
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totals.countOwed} personne{totals.countOwed > 1 ? "s" : ""}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Tu dois
          </p>
          <p className="text-lg font-black text-destructive tabular-nums mt-0.5">
            {formatThousands(totals.iOwe)} F
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totals.countIOwe} personne{totals.countIOwe > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* TYPE TOGGLE */}
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-3">
        {(
          [
            { key: "owed_to_me", label: "On me doit", icon: ArrowDownLeft },
            { key: "i_owe", label: "Je dois", icon: ArrowUpRight },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              typeFilter === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* STATUS FILTERS */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* LIST */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <User className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucune dette à afficher</p>
          <Button
            variant="hero"
            className="mt-4"
            onClick={openNew}
          >
            <Plus className="w-4 h-4" />
            Nouvelle dette
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {filteredGroups.map((g, i) => (
            <motion.div
              key={(g.person.id || g.person.name) + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <PersonDebtContainer
                group={g}
                onEdit={(d) => setEditing(d)}
                onPay={(d) => setPaying(d)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openNew}
        className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Nouvelle dette"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* NEW DEBT DIALOG */}
      <Dialog open={showNew} onOpenChange={(v) => !v && setShowNew(false)}>
        <DialogContent className="glass-card border-border mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base font-black">
            Nouvelle dette
          </DialogTitle>

          <div className="space-y-3 mt-2">
            {/* Type */}
            <div className="flex gap-1 p-1 bg-secondary rounded-xl">
              {(
                [
                  { key: "owed_to_me", label: "On me doit" },
                  { key: "i_owe", label: "Je dois" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setNewType(t.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                    newType === t.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contact */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Personne *
              </Label>
              {selectedContact ? (
                <div className="flex items-center gap-3 p-3 glass rounded-xl border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {selectedContact.photoUri ? (
                      <img
                        src={selectedContact.photoUri}
                        alt={selectedContact.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-black text-primary">
                        {selectedContact.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {selectedContact.name}
                    </p>
                    {selectedContact.phone && (
                      <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                        {formatPhoneDisplay(selectedContact.phone)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Retirer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setContactOpen(true)}
                  className="w-full p-3 glass rounded-xl border border-dashed border-border flex items-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                >
                  <ContactRound className="w-4 h-4" />
                  <span className="text-xs">
                    Choisir dans le répertoire ou saisir manuellement
                  </span>
                </button>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Montant *
              </Label>
              <MoneyInput
                value={newAmount}
                onChange={setNewAmount}
                showCurrency
                className="[&>input]:bg-secondary [&>input]:border-border"
              />
            </div>

            {/* Payment type */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Mode de remboursement
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { val: "lump_sum", icon: "💵", label: "En une fois" },
                    { val: "monthly", icon: "📅", label: "Mensuel" },
                    { val: "custom", icon: "🗓️", label: "Dates fixes" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setPaymentType(opt.val)}
                    className={`p-2.5 rounded-xl text-center transition-all ${
                      paymentType === opt.val
                        ? "gradient-primary text-primary-foreground"
                        : "glass text-muted-foreground"
                    }`}
                  >
                    <div className="text-lg leading-none mb-1">{opt.icon}</div>
                    <div className="text-[10px] font-bold leading-tight">
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {paymentType === "monthly" && (
              <div className="space-y-3 p-3 rounded-xl bg-secondary/40 border border-border">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Montant mensuel (F CFA) *
                  </Label>
                  <MoneyInput
                    value={monthlyAmount}
                    onChange={setMonthlyAmount}
                    showCurrency
                    className="[&>input]:bg-secondary [&>input]:border-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Jour du mois pour le paiement
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={28}
                      value={monthlyDay}
                      onChange={(e) => setMonthlyDay(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-bold tabular-nums w-8 text-right">
                      {monthlyDay}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Paiement attendu le {monthlyDay} de chaque mois
                  </p>
                </div>
                {monthlyAmount > 0 && newAmount > 0 && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-2.5">
                    {(() => {
                      const nbMonths = Math.ceil(newAmount / monthlyAmount);
                      const lastDate = new Date();
                      lastDate.setMonth(
                        lastDate.getMonth() + nbMonths - 1,
                      );
                      lastDate.setDate(monthlyDay);
                      const lastInst =
                        newAmount - monthlyAmount * (nbMonths - 1);
                      return (
                        <>
                          <p className="text-[11px] font-bold text-primary mb-1">
                            📊 Aperçu du plan
                          </p>
                          <p className="text-xs text-foreground">
                            {nbMonths} versement(s) de{" "}
                            {formatThousands(monthlyAmount)} F
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Fin estimée :{" "}
                            {lastDate.toLocaleDateString("fr-FR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          {lastInst !== monthlyAmount && (
                            <p className="text-[11px] text-muted-foreground">
                              Dernier versement : {formatThousands(lastInst)} F
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {paymentType === "custom" && (
              <div className="space-y-2 p-3 rounded-xl bg-secondary/40 border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Échéances personnalisées
                  </Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatThousands(
                      customInstallments.reduce((s, i) => s + i.amount, 0),
                    )}{" "}
                    / {formatThousands(newAmount)} F
                  </span>
                </div>
                {customInstallments.map((inst, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold tabular-nums">
                        {formatThousands(inst.amount)} F
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(inst.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setCustomInstallments((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                      aria-label="Retirer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <AddInstallmentRow
                  onAdd={(date, amount) =>
                    setCustomInstallments((prev) => [
                      ...prev,
                      { date, amount },
                    ])
                  }
                />
                {(() => {
                  const allocated = customInstallments.reduce(
                    (s, i) => s + i.amount,
                    0,
                  );
                  const remaining = newAmount - allocated;
                  if (newAmount === 0) return null;
                  if (remaining === 0)
                    return (
                      <p className="text-[11px] text-primary font-bold">
                        ✓ Plan complet — 100% alloué
                      </p>
                    );
                  if (remaining < 0)
                    return (
                      <p className="text-[11px] text-destructive font-bold">
                        ⚠️ Dépasse de {formatThousands(-remaining)} F
                      </p>
                    );
                  return (
                    <p className="text-[11px] text-muted-foreground">
                      Reste {formatThousands(remaining)} F à allouer
                    </p>
                  );
                })()}
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Motif
              </Label>
              <Input
                value={newMotif}
                onChange={(e) => setNewMotif(e.target.value)}
                placeholder="Ex: Scolarité"
                maxLength={200}
                className="bg-secondary border-border"
              />
            </div>

            {/* Due date */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Date d'échéance
              </Label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            {/* Note */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Note
              </Label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowNew(false)}
              >
                Annuler
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={createDebt}
                disabled={creating || !selectedContact || newAmount <= 0}
              >
                {creating ? "..." : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONTACT PICKER */}
      <ContactPicker
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        onSelect={(c) => {
          setSelectedContact(c);
          setContactOpen(false);
        }}
      />

      {/* EDIT MODAL */}
      <EditDebtModal
        debt={editing}
        userId={user?.id || ""}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={loadDebts}
      />

      {/* PAYMENT MODAL */}
      <PaymentModal
        debt={paying}
        userId={user?.id || ""}
        open={!!paying}
        onClose={() => setPaying(null)}
        onSaved={loadDebts}
      />
    </DashboardLayout>
  );
};

const AddInstallmentRow = ({
  onAdd,
}: {
  onAdd: (date: string, amount: number) => void;
}) => {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState<number>(0);
  return (
    <div className="flex items-end gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
      />
      <div className="flex-1">
        <MoneyInput
          value={amount}
          onChange={setAmount}
          showCurrency
          className="[&>input]:bg-secondary [&>input]:border-border"
        />
      </div>
      <button
        onClick={() => {
          if (!date || amount <= 0) return;
          onAdd(date, amount);
          setDate("");
          setAmount(0);
        }}
        disabled={!date || amount <= 0}
        className="w-9 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all active:scale-95"
        aria-label="Ajouter"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Debts;
