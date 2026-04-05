import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Wallet, TrendingDown, TrendingUp, Minus as MinusIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CardSkeleton } from "@/components/DashboardSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { calculatePredictions, type SpendingPrediction } from "@/lib/predictions";
import { checkBudgetAlerts, type BudgetAlert } from "@/lib/budgetAlerts";
import BudgetAlertBanner from "@/components/BudgetAlertBanner";
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
      const now = new Date();
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

  const budgetUsedPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const isOverBudget = totalSpent > totalBudget && totalBudget > 0;
  const fmt = (n: number) => formatAmount(n);

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

      <BudgetAlertBanner alerts={budgetAlerts} />

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
      {/* Global budget card */}
      <BorderRotate className={`p-5 mb-4 ${isOverBudget ? "border border-destructive/50" : ""}`} animationSpeed={10}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Budget global</h2>
          </div>
          {isOverBudget && <TrendingDown className="w-5 h-5 text-destructive animate-pulse" />}
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1 truncate">
          {fmt(totalSpent)} / {fmt(totalBudget)} F
        </p>
        <Progress value={budgetUsedPercent} className="h-2 mb-3" />
        {isOverBudget && (
          <p className="text-xs text-destructive font-medium">
            ⚠️ Budget dépassé de {fmt(totalSpent - totalBudget)} F
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

      <div className="space-y-3">
        {categoryBudgets.map((cb) => {
          const pct = cb.budget_amount > 0 ? Math.min(((cb.spent || 0) / cb.budget_amount) * 100, 100) : 0;
          const over = (cb.spent || 0) > cb.budget_amount;
          return (
            <BorderRotate key={cb.id} className={`p-4 ${over ? "border border-destructive/40" : ""}`} animationSpeed={18}>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="font-medium text-foreground text-sm">{cb.category?.name || "—"}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${over ? "text-destructive" : "text-muted-foreground"}`}>
                    {fmt(cb.spent || 0)} / {fmt(cb.budget_amount)} F
                  </span>
                  <ConfirmDeleteDialog onConfirm={() => deleteCategoryBudget(cb.id)} title="Supprimer ce budget catégorie ?" />
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
              {over && <p className="text-[10px] text-destructive mt-1">Dépassement !</p>}
            </BorderRotate>
          );
        })}
        {categoryBudgets.length === 0 && !loading && (
          <p className="text-center text-muted-foreground text-sm py-8">Aucun budget par catégorie défini</p>
        )}
      </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Budgets;
