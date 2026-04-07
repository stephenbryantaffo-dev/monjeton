import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { Target, Plus, ChevronDown, ChevronUp, ArrowDownToLine, PartyPopper, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { CardSkeleton } from "@/components/DashboardSkeleton";
import { formatMoneySmart } from "@/lib/formatMoney";
import confetti from "canvas-confetti";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

interface Deposit {
  id: string;
  amount: number;
  created_at: string;
  wallet_id: string | null;
}

interface WalletItem {
  id: string;
  wallet_name: string;
}

const TEMPLATES = [
  { emoji: "📱", name: "Nouveau téléphone", amount: 150000 },
  { emoji: "🏠", name: "Loyer", amount: 75000 },
  { emoji: "🎓", name: "Formation", amount: 200000 },
];

const Savings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);

  // Deposit states
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositWalletId, setDepositWalletId] = useState("");
  const [wallets, setWallets] = useState<WalletItem[]>([]);

  // History states
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<Record<string, Deposit[]>>({});

  // Confetti fired tracker
  const [confettiFired, setConfettiFired] = useState<Set<string>>(new Set());

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");
      if (error) throw error;
      setGoals((data as SavingsGoal[]) || []);
    } catch {
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchWallets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallets")
      .select("id, wallet_name")
      .eq("user_id", user.id);
    setWallets((data as WalletItem[]) || []);
  }, [user]);

  const fetchDeposits = async (goalId: string) => {
    const { data } = await supabase
      .from("savings_deposits")
      .select("id, amount, created_at, wallet_id")
      .eq("savings_goal_id", goalId)
      .order("created_at", { ascending: false })
      .limit(3);
    setDeposits(prev => ({ ...prev, [goalId]: (data as Deposit[]) || [] }));
  };

  useEffect(() => {
    fetchGoals();
    fetchWallets();
  }, [fetchGoals, fetchWallets]);

  // Fire confetti for achieved goals
  useEffect(() => {
    goals.forEach(g => {
      if (g.current_amount >= g.target_amount && g.target_amount > 0 && !confettiFired.has(g.id)) {
        setConfettiFired(prev => new Set(prev).add(g.id));
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    });
  }, [goals, confettiFired]);

  const handleAdd = async (templateName?: string, templateAmount?: number) => {
    const goalName = templateName || name;
    const goalTarget = templateAmount || Number(target);
    if (!goalName || !goalTarget || !user) return;
    try {
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        name: goalName,
        target_amount: goalTarget,
        deadline: deadline || null,
      });
      if (error) throw error;
      toast({ title: "Objectif créé ✅" });
      setName(""); setTarget(""); setDeadline(""); setShowAdd(false);
      fetchGoals();
    } catch {
      toast({ title: "Erreur de création", variant: "destructive" });
    }
  };

  const handleDeposit = async (goalId: string, currentAmount: number, targetAmount: number) => {
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    if (currentAmount + val > targetAmount) {
      toast({ title: "Dépassement", description: `Max ${formatMoneySmart(targetAmount - currentAmount)} F restants`, variant: "destructive" });
      return;
    }
    if (!depositWalletId) {
      toast({ title: "Sélectionne un portefeuille", variant: "destructive" });
      return;
    }
    if (!user) return;

    try {
      // Find or create "Épargne" category
      let { data: catData } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", "Épargne")
        .maybeSingle();

      let categoryId = catData?.id;
      if (!categoryId) {
        const { data: newCat } = await supabase
          .from("categories")
          .insert({ user_id: user.id, name: "Épargne", type: "expense", icon: "PiggyBank", color: "hsl(160,60%,45%)" })
          .select("id")
          .single();
        categoryId = newCat?.id;
      }

      // Create transaction
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "expense",
          amount: val,
          category_id: categoryId,
          wallet_id: depositWalletId,
          note: `Épargne : ${goals.find(g => g.id === goalId)?.name}`,
          date: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();
      if (txErr) throw txErr;

      // Record deposit
      const { error: depErr } = await supabase
        .from("savings_deposits")
        .insert({
          savings_goal_id: goalId,
          user_id: user.id,
          wallet_id: depositWalletId,
          amount: val,
          transaction_id: txData?.id,
        });
      if (depErr) throw depErr;

      // Update goal current_amount
      const { error: upErr } = await supabase
        .from("savings_goals")
        .update({ current_amount: currentAmount + val })
        .eq("id", goalId);
      if (upErr) throw upErr;

      toast({ title: `${formatMoneySmart(val)} F versés ✅` });
      setDepositGoalId(null);
      setDepositAmount("");
      setDepositWalletId("");
      fetchGoals();
      fetchDeposits(goalId);
    } catch {
      toast({ title: "Erreur de versement", variant: "destructive" });
    }
  };

  const handleWithdraw = async (goal: SavingsGoal) => {
    if (!user || wallets.length === 0) return;
    // Withdraw to first wallet by default (could add picker)
    try {
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "income",
        amount: goal.current_amount,
        wallet_id: wallets[0].id,
        note: `Retrait épargne : ${goal.name}`,
        date: new Date().toISOString().split("T")[0],
      });
      if (txErr) throw txErr;

      await supabase.from("savings_goals").update({ current_amount: 0 }).eq("id", goal.id);
      toast({ title: `${formatMoneySmart(goal.current_amount)} F retirés vers ${wallets[0].wallet_name} ✅` });
      fetchGoals();
    } catch {
      toast({ title: "Erreur de retrait", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
      fetchGoals();
    } catch {
      toast({ title: "Erreur de suppression", variant: "destructive" });
    }
  };

  const getDailyTarget = (g: SavingsGoal) => {
    if (!g.deadline) return null;
    const remaining = g.target_amount - g.current_amount;
    if (remaining <= 0) return null;
    const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return null;
    return Math.ceil(remaining / daysLeft);
  };

  const toggleHistory = (goalId: string) => {
    if (expandedGoalId === goalId) {
      setExpandedGoalId(null);
    } else {
      setExpandedGoalId(goalId);
      if (!deposits[goalId]) fetchDeposits(goalId);
    }
  };

  return (
    <DashboardLayout title="Épargne">
      <div className="space-y-3 mb-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : goals.length === 0 && !showAdd ? (
          /* ─── EMPTY STATE WITH TEMPLATES ─── */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="text-center py-6">
              <p className="text-4xl mb-3">🎯</p>
              <p className="font-semibold text-foreground mb-1">Commence à épargner</p>
              <p className="text-sm text-muted-foreground mb-5">Choisis un objectif ou crée le tien</p>
            </div>
            <div className="grid gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleAdd(t.name, t.amount)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border hover:bg-secondary transition-colors text-left"
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{formatMoneySmart(t.amount)} F</p>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ─── GOALS LIST ─── */
          goals.map((g, i) => {
            const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            const remaining = Math.max(g.target_amount - g.current_amount, 0);
            const daysLeft = g.deadline
              ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            const dailyTarget = getDailyTarget(g);
            const isAchieved = g.current_amount >= g.target_amount && g.target_amount > 0;
            const goalDeposits = deposits[g.id] || [];

            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
              >
                <BorderRotate className="p-4" animationSpeed={18}>
                  {/* ─── HEADER ─── */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAchieved ? "bg-green-500/20" : "bg-primary/20"}`}>
                      {isAchieved ? <PartyPopper className="w-5 h-5 text-green-500" /> : <Target className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                      {g.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Échéance : {new Date(g.deadline).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary">{pct}%</span>
                    <ConfirmDeleteDialog onConfirm={() => handleDelete(g.id)} title="Supprimer cet objectif ?" />
                  </div>

                  {/* ─── ACHIEVED BADGE ─── */}
                  {isAchieved && (
                    <Badge className="mb-3 bg-green-500/20 text-green-500 border-green-500/30">
                      Objectif atteint ! 🎉
                    </Badge>
                  )}

                  {/* ─── PROGRESS BAR ─── */}
                  <Progress value={Math.min(pct, 100)} className="h-2 bg-secondary" />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{formatMoneySmart(g.current_amount)} F</span>
                    <span className="text-xs text-muted-foreground">{formatMoneySmart(g.target_amount)} F</span>
                  </div>

                  {/* ─── SMART INFO ─── */}
                  {!isAchieved && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Reste : <span className="font-medium text-foreground">{formatMoneySmart(remaining)} F</span>
                      </p>
                      {daysLeft !== null && daysLeft > 0 && dailyTarget && (
                        <p className="text-xs text-muted-foreground">
                          Épargne <span className="font-medium text-primary">{formatMoneySmart(dailyTarget)} F/jour</span> pour atteindre l'objectif avant le{" "}
                          {new Date(g.deadline!).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                      {daysLeft !== null && daysLeft <= 0 && (
                        <p className="text-xs font-medium text-destructive">Échéance dépassée ⚠️</p>
                      )}
                    </div>
                  )}

                  {/* ─── DEPOSIT FORM ─── */}
                  <AnimatePresence>
                    {depositGoalId === g.id ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 pt-3 border-t border-border">
                          <Input
                            type="number"
                            placeholder="Montant à verser"
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            className="bg-secondary border-border"
                            autoFocus
                          />
                          <Select value={depositWalletId} onValueChange={setDepositWalletId}>
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Depuis quel portefeuille ?" />
                            </SelectTrigger>
                            <SelectContent>
                              {wallets.map(w => (
                                <SelectItem key={w.id} value={w.id}>
                                  <div className="flex items-center gap-2">
                                    <Wallet className="w-3.5 h-3.5" />
                                    {w.wallet_name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setDepositGoalId(null); setDepositAmount(""); setDepositWalletId(""); }}>
                              Annuler
                            </Button>
                            <Button size="sm" variant="hero" className="flex-1" onClick={() => handleDeposit(g.id, g.current_amount, g.target_amount)}>
                              Verser
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ) : isAchieved ? (
                      <Button variant="glass" size="sm" className="w-full mt-3" onClick={() => handleWithdraw(g)}>
                        <ArrowDownToLine className="w-4 h-4 mr-1" /> Retirer les fonds
                      </Button>
                    ) : (
                      <Button variant="glass" size="sm" className="w-full mt-3" onClick={() => { setDepositGoalId(g.id); if (wallets.length === 1) setDepositWalletId(wallets[0].id); }}>
                        + Verser un montant
                      </Button>
                    )}
                  </AnimatePresence>

                  {/* ─── HISTORY TOGGLE ─── */}
                  <button
                    onClick={() => toggleHistory(g.id)}
                    className="w-full flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Historique
                    {expandedGoalId === g.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {expandedGoalId === g.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-1.5">
                          {goalDeposits.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Aucun versement</p>
                          ) : (
                            goalDeposits.map(d => (
                              <div key={d.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-secondary/50">
                                <span className="text-muted-foreground">
                                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                                </span>
                                <span className="font-medium text-foreground">+{formatMoneySmart(d.amount)} F</span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </BorderRotate>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── ADD FORM ─── */}
      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <Input placeholder="Nom de l'objectif" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
          <Input type="number" placeholder="Montant cible (FCFA)" value={target} onChange={(e) => setTarget(e.target.value)} className="bg-secondary border-border" />
          <div className="space-y-1">
            <Label className="text-xs">Échéance (optionnel)</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => setShowAdd(false)} className="flex-1">Annuler</Button>
            <Button variant="hero" onClick={() => handleAdd()} className="flex-1">Créer</Button>
          </div>
        </motion.div>
      ) : (
        goals.length > 0 && (
          <Button variant="glass" size="lg" className="w-full" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Nouvel objectif
          </Button>
        )
      )}
    </DashboardLayout>
  );
};

export default Savings;
