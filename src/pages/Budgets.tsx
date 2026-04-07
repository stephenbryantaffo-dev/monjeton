import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Wallet, TrendingDown, TrendingUp, Minus as MinusIcon, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CardSkeleton } from "@/components/DashboardSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { calculatePredictions, type SpendingPrediction } from "@/lib/predictions";
import { checkBudgetAlerts, type BudgetAlert } from "@/lib/budgetAlerts";
import BudgetAlertBanner from "@/components/BudgetAlertBanner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface CategoryBudget {
  id: string;
  category_id: string;
  budget_amount: number;
  category?: Category;
  spent?: number;
}

interface AISuggestion {
  category_id: string;
  category_name: string;
  avg_amount: number;
}

// Color-coded progress bar
const BudgetProgressBar = ({ percent, className = "" }: { percent: number; className?: string }) => {
  const actualPercent = Math.min(percent, 100);
  const isExceeded = percent > 100;

  const getColor = () => {
    if (percent > 100) return "hsl(0, 70%, 55%)";
    if (percent >= 85) return "hsl(0, 70%, 55%)";
    if (percent >= 60) return "hsl(30, 90%, 55%)";
    return "hsl(var(--primary))";
  };

  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${isExceeded ? "animate-pulse" : ""}`}
        style={{
          width: `${actualPercent}%`,
          backgroundColor: getColor(),
        }}
      />
    </div>
  );
};

const Budgets = () => {
  const { user } = useAuth();
  const { formatAmount } = usePrivacy();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [totalBudget, setTotalBudget] = useState(0);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<SpendingPrediction[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  useEffect(() => {
    if (user) loadData();
  }, [user, month, year]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [budgetRes, catRes, txRes, catBudgetRes] = await Promise.all([
        supabase.from("budgets").select("*").eq("user_id", user.id).eq("month", month).eq("year", year).maybeSingle(),
        supabase.from("categories").select("*").eq("user_id", user.id).eq("type", "expense"),
        supabase.from("transactions").select("amount, category_id").eq("user_id", user.id).eq("type", "expense")
          .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
          .lt("date", month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`),
        supabase.from("category_budgets").select("*").eq("user_id", user.id).eq("month", month).eq("year", year),
      ]);

      if (budgetRes.data) {
        setTotalBudget(budgetRes.data.total_budget);
        setBudgetId(budgetRes.data.id);
      } else {
        setTotalBudget(0);
        setBudgetId(null);
      }

      const cats = catRes.data || [];
      setCategories(cats);

      const transactions = txRes.data || [];
      const spent = transactions.reduce((s, t) => s + Number(t.amount), 0);
      setTotalSpent(spent);

      const spentByCategory: Record<string, number> = {};
      transactions.forEach((t) => {
        if (t.category_id) {
          spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Number(t.amount);
        }
      });

      const cBudgets = (catBudgetRes.data || []).map((cb: any) => ({
        ...cb,
        category: cats.find((c) => c.id === cb.category_id),
        spent: spentByCategory[cb.category_id] || 0,
      }));
      setCategoryBudgets(cBudgets);

      // Calculate predictions for current month
      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();
      if (month === curMonth && year === curYear && cBudgets.length > 0) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const { data: histTx } = await supabase
          .from("transactions")
          .select("*, categories:category_id(name, icon, color)")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .gte("date", threeMonthsAgo.toISOString().split("T")[0]);

        const allTx = histTx || [];
        const preds = calculatePredictions(allTx, cBudgets);
        setPredictions(preds);
        const alerts = checkBudgetAlerts(cBudgets, allTx, preds);
        setBudgetAlerts(alerts);
      } else {
        setPredictions([]);
        setBudgetAlerts([]);
      }
    } catch {
      toast({ title: "Erreur de chargement", description: "Impossible de charger les budgets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveTotalBudget = async () => {
    if (!user) return;
    const amount = Number(newBudgetAmount);
    if (!amount || amount <= 0) return;

    if (budgetId) {
      await supabase.from("budgets").update({ total_budget: amount }).eq("id", budgetId);
    } else {
      await supabase.from("budgets").insert({ user_id: user.id, month, year, total_budget: amount });
    }
    setNewBudgetAmount("");
    toast({ title: "Budget global mis à jour ✅" });
    loadData();
  };

  const addCategoryBudget = async () => {
    if (!user || !selectedCategoryId || !newCatBudget) return;
    const amount = Number(newCatBudget);
    if (amount <= 0) return;

    const { error } = await supabase.from("category_budgets").upsert(
      { user_id: user.id, category_id: selectedCategoryId, month, year, budget_amount: amount },
      { onConflict: "user_id,category_id,month,year" }
    );

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setDialogOpen(false);
    setNewCatBudget("");
    setSelectedCategoryId("");
    toast({ title: "Budget catégorie ajouté ✅" });
    loadData();
  };

  const deleteCategoryBudget = async (id: string) => {
    try {
      const { error } = await supabase.from("category_budgets").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Budget supprimé" });
      loadData();
    } catch {
      toast({ title: "Erreur de suppression", variant: "destructive" });
    }
  };

  // AI Suggestions: analyze last 3 months average per category
  const generateAISuggestions = async () => {
    if (!user) return;
    setSuggestionsLoading(true);
    setShowSuggestions(true);

    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: histTx } = await supabase
        .from("transactions")
        .select("amount, category_id")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", threeMonthsAgo.toISOString().split("T")[0]);

      if (!histTx || histTx.length === 0) {
        toast({ title: "Pas assez de données", description: "Il faut au moins 1 mois d'historique", variant: "destructive" });
        setShowSuggestions(false);
        return;
      }

      // Group by category and compute monthly average
      const byCat: Record<string, number[]> = {};
      histTx.forEach((t) => {
        if (t.category_id) {
          if (!byCat[t.category_id]) byCat[t.category_id] = [];
          byCat[t.category_id].push(Number(t.amount));
        }
      });

      // Calculate average (total / 3 months)
      const suggestions: AISuggestion[] = [];
      for (const [catId, amounts] of Object.entries(byCat)) {
        const total = amounts.reduce((s, a) => s + a, 0);
        const avg = Math.round(total / 3);
        if (avg > 0) {
          const cat = categories.find((c) => c.id === catId);
          if (cat) {
            // Only suggest if no budget exists yet for this category
            const existing = categoryBudgets.find((cb) => cb.category_id === catId);
            suggestions.push({
              category_id: catId,
              category_name: cat.name,
              avg_amount: existing ? Math.round(avg * 1.1) : avg, // +10% buffer if already budgeted
            });
          }
        }
      }

      suggestions.sort((a, b) => b.avg_amount - a.avg_amount);
      setAiSuggestions(suggestions);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const applySuggestion = async (suggestion: AISuggestion) => {
    if (!user) return;
    const { error } = await supabase.from("category_budgets").upsert(
      { user_id: user.id, category_id: suggestion.category_id, month, year, budget_amount: suggestion.avg_amount },
      { onConflict: "user_id,category_id,month,year" }
    );
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setAiSuggestions((prev) => prev.filter((s) => s.category_id !== suggestion.category_id));
    toast({ title: `Budget ${suggestion.category_name} appliqué ✅` });
    loadData();
  };

  const budgetUsedPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = totalSpent > totalBudget && totalBudget > 0;
  const fmt = (n: number) => formatAmount(n);

  // Count exceeded category budgets
  const exceededCount = useMemo(
    () => categoryBudgets.filter((cb) => (cb.spent || 0) > cb.budget_amount && cb.budget_amount > 0).length,
    [categoryBudgets]
  );

  // Total budgeted across categories
  const totalCategoryBudgeted = useMemo(
    () => categoryBudgets.reduce((s, cb) => s + cb.budget_amount, 0),
    [categoryBudgets]
  );
  const totalCategorySpent = useMemo(
    () => categoryBudgets.reduce((s, cb) => s + (cb.spent || 0), 0),
    [categoryBudgets]
  );

  const getStatusLabel = (pct: number) => {
    if (pct > 100) return { text: "Dépassé !", color: "text-destructive" };
    if (pct >= 85) return { text: "Critique", color: "text-destructive" };
    if (pct >= 60) return { text: "Attention", color: "text-[hsl(30,90%,55%)]" };
    return { text: "En bonne voie", color: "text-primary" };
  };

  return (
    <DashboardLayout title="Budgets">
      {/* Month selector */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={() => setYear(y => y - 1)}
          className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-foreground">{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= new Date().getFullYear()}
          className="w-8 h-8 rounded-full glass flex items-center justify-center text-muted-foreground disabled:opacity-30"
        >
          →
        </button>
      </div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {monthNames.map((name, i) => (
          <button
            key={i}
            onClick={() => setMonth(i + 1)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              month === i + 1 ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Exceeded budgets banner */}
      <AnimatePresence>
        {exceededCount > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/15 border border-destructive/30 mb-4"
          >
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive font-medium">
              ⚠️ {exceededCount} budget{exceededCount > 1 ? "s" : ""} dépassé{exceededCount > 1 ? "s" : ""} ce mois-ci
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <BudgetAlertBanner alerts={budgetAlerts} />

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* ── Monthly Summary Header ── */}
          {(totalBudget > 0 || categoryBudgets.length > 0) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl p-4 mb-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">Résumé du mois</p>
                <p className={`text-xs font-semibold ${getStatusLabel(budgetUsedPercent).color}`}>
                  {getStatusLabel(budgetUsedPercent).text}
                </p>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Budgété</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">{fmt(totalBudget || totalCategoryBudgeted)} F</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Dépensé</p>
                  <p className={`text-lg font-bold tabular-nums ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
                    {fmt(totalSpent)} F
                  </p>
                </div>
              </div>
              <BudgetProgressBar percent={budgetUsedPercent} />
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center tabular-nums">
                {Math.round(budgetUsedPercent)}% utilisé
                {totalBudget > totalSpent && ` · Reste ${fmt(totalBudget - totalSpent)} F`}
              </p>
            </motion.div>
          )}

          {/* Global budget card */}
          <BorderRotate className={`p-5 mb-4 ${isOverBudget ? "border border-destructive/50" : ""}`} animationSpeed={10}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Budget global</h2>
              </div>
              {isOverBudget && <TrendingDown className="w-5 h-5 text-destructive animate-pulse" />}
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground mb-1 truncate tabular-nums">
              {fmt(totalSpent)} / {fmt(totalBudget)} F
            </p>
            <BudgetProgressBar percent={budgetUsedPercent} className="mb-3" />
            {isOverBudget && (
              <p className="text-xs text-destructive font-medium animate-pulse">
                🔴 Budget dépassé de {fmt(totalSpent - totalBudget)} F !
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Input
                type="number"
                placeholder="Nouveau budget"
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(e.target.value)}
                className="glass"
              />
              <Button onClick={saveTotalBudget} size="sm">OK</Button>
            </div>
          </BorderRotate>

          {/* AI Suggestions */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full glass border-primary/30 text-primary"
              onClick={generateAISuggestions}
              disabled={suggestionsLoading}
            >
              {suggestionsLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Suggestion IA
            </Button>

            <AnimatePresence>
              {showSuggestions && aiSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 glass-card rounded-xl p-3 space-y-2"
                >
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    📊 Basé sur tes 3 derniers mois
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestions.map((s) => (
                      <motion.button
                        key={s.category_id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => applySuggestion(s)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs hover:bg-primary/20 transition-colors"
                      >
                        <span className="text-foreground font-medium">{s.category_name}</span>
                        <span className="text-muted-foreground">:</span>
                        <span className="text-primary font-semibold tabular-nums">
                          moy. {fmt(s.avg_amount)} F
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="text-[10px] text-muted-foreground mt-1"
                  >
                    Fermer
                  </button>
                </motion.div>
              )}
              {showSuggestions && !suggestionsLoading && aiSuggestions.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground text-center mt-2"
                >
                  Aucune suggestion disponible. Ajoute plus de transactions.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Category budgets */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Par catégorie</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="glass">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-border">
                <DialogHeader>
                  <DialogTitle>Budget par catégorie</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Choisir une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Montant budget"
                    value={newCatBudget}
                    onChange={(e) => setNewCatBudget(e.target.value)}
                    className="glass"
                  />
                  <Button onClick={addCategoryBudget} className="w-full">Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Category budget summary */}
          {categoryBudgets.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-1">
              <span>Total catégories : {fmt(totalCategoryBudgeted)} F</span>
              <span>Dépensé : {fmt(totalCategorySpent)} F</span>
            </div>
          )}

          <div className="space-y-3">
            {categoryBudgets.map((cb) => {
              const pct = cb.budget_amount > 0 ? ((cb.spent || 0) / cb.budget_amount) * 100 : 0;
              const over = (cb.spent || 0) > cb.budget_amount && cb.budget_amount > 0;
              const pred = predictions.find(p => p.category === (cb.category?.name || ""));
              const trendIcon = pred?.trend === "up"
                ? <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                : pred?.trend === "down"
                  ? <TrendingDown className="w-3.5 h-3.5 text-primary" />
                  : pred ? <MinusIcon className="w-3.5 h-3.5 text-muted-foreground" /> : null;
              const status = getStatusLabel(pct);

              return (
                <motion.div
                  key={cb.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <BorderRotate className={`p-4 ${over ? "border border-destructive/40" : ""}`} animationSpeed={18}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {cb.category?.color && (
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cb.category.color }}
                          />
                        )}
                        <span className="font-medium text-foreground text-sm truncate">{cb.category?.name || "—"}</span>
                        {trendIcon}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-semibold ${status.color}`}>
                          {status.text}
                        </span>
                        <ConfirmDeleteDialog onConfirm={() => deleteCategoryBudget(cb.id)} title="Supprimer ce budget catégorie ?" />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className={`text-xs font-semibold tabular-nums ${over ? "text-destructive" : "text-foreground"}`}>
                        {fmt(cb.spent || 0)} / {fmt(cb.budget_amount)} F
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <BudgetProgressBar percent={pct} />
                    {over && (
                      <p className="text-[10px] text-destructive mt-1 font-medium animate-pulse">
                        🔴 Dépassé de {fmt((cb.spent || 0) - cb.budget_amount)} F !
                      </p>
                    )}
                    {pred && !over && pred.predictedEndOfMonth > cb.budget_amount && (
                      <p className="text-[10px] text-[hsl(30,90%,55%)] mt-1">
                        ⚠️ Prévu : {fmt(Math.round(pred.predictedEndOfMonth))} F en fin de mois
                      </p>
                    )}
                  </BorderRotate>
                </motion.div>
              );
            })}
            {categoryBudgets.length === 0 && !loading && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-muted-foreground text-sm mb-2">Aucun budget par catégorie défini</p>
                <p className="text-xs text-muted-foreground">
                  Utilise le bouton "Suggestion IA" pour commencer
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Budgets;
