import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Plus, Wallet, TrendingDown, TrendingUp, Minus as MinusIcon, Sparkles, AlertTriangle, Loader2, Pencil, X, CheckCircle2, RefreshCw } from "lucide-react";
import { BudgetCoachingFlow } from "@/components/budget/BudgetCoachingFlow";
import { PlanHistoryView } from "@/components/budget/PlanHistoryView";
import { History as HistoryIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CardSkeleton } from "@/components/DashboardSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { calculatePredictions, type SpendingPrediction } from "@/lib/predictions";
import { checkBudgetAlerts, type BudgetAlert } from "@/lib/budgetAlerts";
import BudgetAlertBanner from "@/components/BudgetAlertBanner";
import { syncAllAutoBudgets } from "@/lib/autoBudget";
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
  categorie: string;
  montant_suggere: number;
  pourcentage: number;
  conseil: string;
  category_id?: string;
  already_spent?: number;
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
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
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
  const [aiGlobalAdvice, setAiGlobalAdvice] = useState<string>("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editableSuggestions, setEditableSuggestions] = useState<AISuggestion[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [coachingDone, setCoachingDone] = useState<boolean | null>(null);
  const [showCoaching, setShowCoaching] = useState(false);
  const [coachingPlan, setCoachingPlan] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingCoaching, setLoadingCoaching] = useState(true);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  useEffect(() => {
    if (user) loadData();
  }, [user, month, year]);

  useEffect(() => {
    const checkCoaching = async () => {
      if (!user) return;
      setLoadingCoaching(true);
      const { data } = await supabase
        .from('budget_coaching')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();
      const isApprouve = data?.statut === 'approuve';
      setCoachingDone(isApprouve);
      setShowCoaching(!isApprouve);
      setCoachingPlan(data);
      setLoadingCoaching(false);
    };
    checkCoaching();
  }, [user, month, year]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Auto-ajuste les budgets sur le mois en cours uniquement
      const today = new Date();
      const curMonthCheck = today.getMonth() + 1;
      const curYearCheck = today.getFullYear();
      if (month === curMonthCheck && year === curYearCheck) {
        await syncAllAutoBudgets(user.id, month, year).catch((e) =>
          console.error("syncAllAutoBudgets error:", e)
        );
      }

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
      const todayPred = new Date();
      const curMonth = todayPred.getMonth() + 1;
      const curYear = todayPred.getFullYear();
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
    const amount = clampAmount(newBudgetAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Montant invalide", description: "Entre un nombre supérieur à 0", variant: "destructive" });
      return;
    }
    try {
      if (budgetId) {
        const { error } = await supabase.from("budgets").update({ total_budget: amount }).eq("id", budgetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budgets").insert({ user_id: user.id, month, year, total_budget: amount });
        if (error) throw error;
      }
      setNewBudgetAmount("");
      toast({ title: "Budget global mis à jour ✅" });
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur sauvegarde", description: e?.message, variant: "destructive" });
    }
  };

  const addCategoryBudget = async () => {
    if (!user || !selectedCategoryId) return;
    const amount = clampAmount(newCatBudget);
    if (!amount || amount <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }

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

  const saveInlineEdit = async (cbId: string) => {
    const amount = clampAmount(editValue);
    if (!amount || amount <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("category_budgets").update({ budget_amount: amount }).eq("id", cbId);
      if (error) throw error;
      toast({ title: "Budget mis à jour ✅" });
      setEditingId(null);
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur mise à jour", description: e?.message, variant: "destructive" });
    }
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

  // AI Suggestions: ask Claude to allocate the actual user budget across categories
  const generateAISuggestions = async () => {
    if (!user) return;

    if (!totalBudget || totalBudget <= 0) {
      toast({
        title: "Définis d'abord ton budget global",
        description: "L'IA répartit ton budget total réel — fixe-le avant de demander des suggestions.",
        variant: "destructive",
      });
      return;
    }

    setSuggestionsLoading(true);
    setShowSuggestions(true);
    setAiGlobalAdvice("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Non authentifié");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/budget-suggest`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          year,
          totalBudget,
          userCategories: categories
            .filter((c) => c.type === "expense")
            .map((c) => c.name),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur du service IA");
      }

      const data = await res.json();
      let suggestions: AISuggestion[] = Array.isArray(data.suggestions) ? data.suggestions : [];
      const expensesByCategory: Record<string, number> = data.expensesByCategory || {};

      // Frontend safeguard: re-calibrate if AI somehow exceeds budget
      const totalSuggere = suggestions.reduce((sum, s) => sum + s.montant_suggere, 0);
      if (totalSuggere > totalBudget && totalSuggere > 0) {
        const ratio = totalBudget / totalSuggere;
        suggestions = suggestions.map((s) => ({
          ...s,
          montant_suggere: Math.floor(s.montant_suggere * ratio),
          pourcentage: Math.round(((s.montant_suggere * ratio) / totalBudget) * 100),
        }));
      }

      // Match each suggestion to a real category id with robust fallbacks
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[&/,()._-]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const SYNONYMS: Record<string, string[]> = {
        epargne: ["autre", "freelance", "salaire"],
        investissement: ["autre"],
        business: ["freelance", "autre"],
        entreprise: ["freelance", "autre"],
        pro: ["freelance"],
        imprevus: ["autre"],
        famille: ["autre"],
        soutien: ["autre"],
        education: ["autre", "loisirs"],
        scolarite: ["autre"],
        logement: ["factures", "autre"],
        loyer: ["factures", "autre"],
      };

      const normCats = categories.map((c) => ({ ...c, _norm: normalize(c.name) }));

      const findCategoryId = (rawName: string): string | undefined => {
        const norm = normalize(rawName);
        // 1) exact normalized match
        const exact = normCats.find((c) => c._norm === norm);
        if (exact) return exact.id;
        // 2) any meaningful word from suggestion matches a category name (or vice versa)
        const words = norm.split(" ").filter((w) => w.length >= 4);
        for (const w of words) {
          const hit = normCats.find((c) => c._norm === w || c._norm.includes(w) || w.includes(c._norm));
          if (hit) return hit.id;
        }
        // 3) synonym mapping
        for (const w of words) {
          const targets = SYNONYMS[w];
          if (!targets) continue;
          for (const t of targets) {
            const hit = normCats.find((c) => c._norm === t);
            if (hit) return hit.id;
          }
        }
        return undefined;
      };

      const enriched: AISuggestion[] = suggestions.map((s) => {
        const norm = normalize(s.categorie);
        const category_id = findCategoryId(s.categorie);
        const spent =
          Object.entries(expensesByCategory).find(
            ([k]) => normalize(k) === norm
          )?.[1] ?? 0;
        return {
          ...s,
          category_id,
          already_spent: Number(spent) || 0,
        };
      });

      setEditableSuggestions(enriched);
      setAiGlobalAdvice(String(data.conseil_global || ""));

      if (enriched.length === 0) {
        toast({
          title: "Aucune suggestion",
          description: "L'IA n'a pas pu générer de répartition pour ce budget.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Erreur IA",
        description: e?.message || "Impossible de générer les suggestions",
        variant: "destructive",
      });
      setShowSuggestions(false);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const SAFE_MAX = 999999999;
  const clampAmount = (n: number | string) => {
    const num = typeof n === "string" ? Number(n.replace(/\s/g, "")) : Number(n);
    if (isNaN(num)) return 0;
    return Math.min(SAFE_MAX, Math.max(0, Math.floor(num)));
  };

  const updateSuggestionAmount = (categorie: string, newAmount: number) => {
    const safe = clampAmount(newAmount);
    setEditableSuggestions((prev) =>
      prev.map((s) => {
        if (s.categorie !== categorie) return s;
        const newPercent = totalBudget > 0
          ? Math.round((safe / totalBudget) * 100)
          : 0;
        return { ...s, montant_suggere: safe, pourcentage: newPercent };
      })
    );
  };

  const upsertCategoryBudgetFromSuggestion = async (s: AISuggestion) => {
    if (!user) return false;
    let categoryId = s.category_id;
    if (!categoryId) {
      const { data: newCat, error: createErr } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: s.categorie,
          type: "expense",
          icon: "MoreHorizontal",
          color: "hsl(0, 0%, 60%)",
        })
        .select("id")
        .single();
      if (createErr || !newCat) {
        throw new Error(createErr?.message || "Impossible de créer la catégorie");
      }
      categoryId = newCat.id;
    }
    const { error } = await supabase.from("category_budgets").upsert(
      {
        user_id: user.id,
        category_id: categoryId,
        month,
        year,
        budget_amount: clampAmount(s.montant_suggere),
      },
      { onConflict: "user_id,category_id,month,year" }
    );
    if (error) throw error;
    return true;
  };

  const approveSuggestion = async (s: AISuggestion) => {
    if (approvingId === s.categorie) return;
    if (!user) return;
    if (suggestionsTotal > totalBudget) {
      toast({
        title: "Total dépasse ton budget",
        description: `Réduis d'abord d'au moins ${fmt(suggestionsTotal - totalBudget)} F`,
        variant: "destructive",
      });
      return;
    }
    setApprovingId(s.categorie);
    try {
      await upsertCategoryBudgetFromSuggestion(s);
      setEditableSuggestions((prev) => prev.filter((item) => item.categorie !== s.categorie));
      toast({
        title: `Budget ${s.categorie} approuvé ✅`,
        description: `${fmt(s.montant_suggere)} F alloués`,
      });
      await loadData();
    } catch (e: any) {
      toast({ title: "Erreur approbation", description: e?.message, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const approveAllSuggestions = async () => {
    if (approvingAll) return;
    if (!user || editableSuggestions.length === 0) return;
    if (suggestionsTotal > totalBudget) {
      toast({
        title: "Total dépasse ton budget",
        description: `Ajuste d'abord les montants pour rester sous ${fmt(totalBudget)} F`,
        variant: "destructive",
      });
      return;
    }
    setApprovingAll(true);
    const snapshot = [...editableSuggestions];
    try {
      let successCount = 0;
      const failed: AISuggestion[] = [];
      for (const s of snapshot) {
        try {
          await upsertCategoryBudgetFromSuggestion(s);
          successCount++;
        } catch (err) {
          console.error(`Approve failed for ${s.categorie}:`, err);
          failed.push(s);
        }
      }
      setEditableSuggestions(failed);
      if (failed.length === 0) setShowSuggestions(false);
      toast({
        title: `${successCount} budget(s) approuvé(s) ✅`,
        description: failed.length > 0
          ? `${failed.length} échec(s) — réessaie`
          : "Ta répartition est maintenant active",
      });
      await loadData();
    } catch (e: any) {
      toast({ title: "Erreur approbation globale", description: e?.message, variant: "destructive" });
    } finally {
      setApprovingAll(false);
    }
  };

  const budgetUsedPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const suggestionsTotal = useMemo(
    () => editableSuggestions.reduce((s, item) => s + (Number(item.montant_suggere) || 0), 0),
    [editableSuggestions]
  );
  const suggestionsRestant = totalBudget - suggestionsTotal;
  const isOverAllocated = suggestionsTotal > totalBudget;
  const allocationPercent = totalBudget > 0
    ? Math.round((suggestionsTotal / totalBudget) * 100)
    : 0;
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

      {loadingCoaching ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : showCoaching ? (
        <BudgetCoachingFlow
          month={month}
          year={year}
          onComplete={() => {
            setShowCoaching(false);
            setCoachingDone(true);
            // Recharger pour afficher les budgets générés
            setTimeout(() => window.location.reload(), 300);
          }}
        />
      ) : (
        <>
          {/* Bouton refaire le coaching */}
          <Button
            variant="outline"
            onClick={() => setShowCoaching(true)}
            className="w-full glass mb-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refaire le coaching budget
          </Button>

          {coachingPlan?.id && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full text-xs glass"
              >
                <HistoryIcon className="w-3.5 h-3.5 mr-1.5" />
                {showHistory ? "Masquer l'historique" : "Voir mes modifications"}
              </Button>
              {showHistory && (
                <div className="mt-3">
                  <PlanHistoryView coachingId={coachingPlan.id} />
                </div>
              )}
            </div>
          )}

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
              {/* Score de santé global */}
              {(() => {
                const score = Math.max(0, Math.min(100, Math.round(100 - budgetUsedPercent)));
                const health =
                  score >= 70
                    ? { label: "🟢 Bonne santé", color: "text-primary", bg: "bg-primary/10" }
                    : score >= 40
                      ? { label: "🟡 Attention", color: "text-yellow-500", bg: "bg-yellow-500/10" }
                      : { label: "🔴 Critique", color: "text-destructive", bg: "bg-destructive/10" };
                return (
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl mt-2 ${health.bg}`}>
                    <span className={`text-xs font-bold ${health.color}`}>{health.label}</span>
                    <span className={`text-lg font-black tabular-nums ${health.color}`}>{score}/100</span>
                  </div>
                );
              })()}
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
            {/* Projection fin de mois */}
            {(() => {
              if (!totalBudget) return null;
              const today = new Date();
              const daysInMonth = new Date(year, month, 0).getDate();
              const todayCheck = new Date();
              const isCurrent = month === todayCheck.getMonth() + 1 && year === todayCheck.getFullYear();
              const daysPassed = isCurrent ? today.getDate() : daysInMonth;
              const daysLeft = daysInMonth - daysPassed;
              if (daysPassed === 0) return null;
              const avgPerDay = totalSpent / daysPassed;
              const projectedTotal = Math.round(totalSpent + avgPerDay * daysLeft);
              const isProjectedOver = projectedTotal > totalBudget;
              return (
                <div
                  className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs ${
                    isProjectedOver
                      ? "bg-destructive/10 border border-destructive/20"
                      : "bg-secondary/50"
                  }`}
                >
                  <span className="text-base flex-shrink-0">{isProjectedOver ? "⚠️" : "📈"}</span>
                  <p className={isProjectedOver ? "text-destructive" : "text-muted-foreground"}>
                    À ce rythme, fin de mois :{" "}
                    <span className="font-bold text-foreground tabular-nums">{fmt(projectedTotal)} F</span>
                    {isProjectedOver
                      ? ` (+${fmt(projectedTotal - totalBudget)} F de dépassement prévu)`
                      : isCurrent
                        ? ` · Il te reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`
                        : ""}
                  </p>
                </div>
              );
            })()}
            <div className="flex gap-2 mt-3">
              <MoneyInput
                placeholder="Nouveau budget"
                value={newBudgetAmount}
                onChange={(n) => setNewBudgetAmount(n ? String(n) : "")}
                showCurrency={false}
                className="flex-1 [&>input]:glass"
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
              {showSuggestions && editableSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-3 overflow-hidden"
                >
                  {/* Récap total temps réel */}
                  <div className={`glass-card rounded-2xl p-4 border ${isOverAllocated ? "border-destructive/40" : "border-primary/25"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Budget total du mois</p>
                        <p className="text-xl font-black text-foreground tabular-nums">{fmt(totalBudget)} F</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Suggéré</p>
                        <p className={`text-xl font-black tabular-nums ${isOverAllocated ? "text-destructive" : "text-primary"}`}>
                          {fmt(suggestionsTotal)} F
                        </p>
                      </div>
                    </div>
                    <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(allocationPercent, 100)}%` }}
                        transition={{ duration: 0.3 }}
                        className={`h-full rounded-full ${
                          isOverAllocated ? "bg-destructive" : allocationPercent > 90 ? "bg-yellow-500" : "gradient-primary"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{allocationPercent}% alloué</span>
                      <span className={isOverAllocated ? "text-destructive font-bold" : "text-muted-foreground"}>
                        {isOverAllocated
                          ? `Dépassement de ${fmt(suggestionsTotal - totalBudget)} F`
                          : `Reste ${fmt(suggestionsRestant)} F à allouer`}
                      </span>
                    </div>
                    {isOverAllocated && (
                      <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">
                          Réduis les montants pour rester dans ton budget avant d'approuver.
                        </p>
                      </div>
                    )}
                  </div>

                  {aiGlobalAdvice && (
                    <div className="glass-card rounded-xl p-3 border border-primary/15 flex gap-2 items-start">
                      <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground italic leading-relaxed">{aiGlobalAdvice}</p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {editableSuggestions.map((s) => {
                      const restant = Math.max(0, s.montant_suggere - (s.already_spent || 0));
                      const noMatch = !s.category_id;
                      const isApproving = approvingId === s.categorie;
                      return (
                        <motion.div
                          key={s.categorie}
                          initial={{ scale: 0.97, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="glass-card rounded-xl p-3.5 border border-primary/15"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{s.categorie}</p>
                              <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium flex-shrink-0 tabular-nums">
                                {s.pourcentage}%
                              </span>
                              {noMatch && (
                                <span className="text-[10px] bg-yellow-500/15 text-yellow-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                  Nouvelle
                                </span>
                              )}
                            </div>
                          </div>
                          {s.conseil && (
                            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{s.conseil}</p>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-[11px] text-muted-foreground flex-shrink-0">Montant :</label>
                            <MoneyInput
                              value={s.montant_suggere}
                              onChange={(n) => updateSuggestionAmount(s.categorie, n)}
                              onBlur={(e) => updateSuggestionAmount(s.categorie, clampAmount(Number((e.target as HTMLInputElement).value.replace(/\D/g, ''))))}
                              min={0}
                              showCurrency={false}
                              className="flex-1 [&>input]:bg-secondary [&>input]:border-border [&>input]:text-sm [&>input]:h-8 [&>input]:tabular-nums"
                            />
                            <span className="text-xs text-muted-foreground flex-shrink-0">F</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground tabular-nums mb-2.5">
                            Déjà dépensé : {fmt(s.already_spent || 0)} F
                            {" · "}Restant à dépenser :{" "}
                            <span className={restant > 0 ? "text-primary font-semibold" : "text-destructive"}>
                              {fmt(restant)} F
                            </span>
                          </p>
                          <button
                            onClick={() => approveSuggestion(s)}
                            disabled={isOverAllocated || isApproving || s.montant_suggere <= 0}
                            className="w-full gradient-primary text-primary-foreground rounded-lg py-2 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            {isApproving ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Approbation...
                              </span>
                            ) : noMatch ? (
                              `Créer "${s.categorie}" et appliquer`
                            ) : (
                              `Approuver ${fmt(s.montant_suggere)} F`
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mt-4 sticky bottom-0 bg-background pt-3 pb-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 glass"
                      onClick={() => {
                        setShowSuggestions(false);
                        setEditableSuggestions([]);
                      }}
                      disabled={approvingAll}
                    >
                      Fermer
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gradient-primary text-primary-foreground font-bold"
                      onClick={approveAllSuggestions}
                      disabled={isOverAllocated || approvingAll || editableSuggestions.length === 0}
                    >
                      {approvingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Approbation...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Approuver tout ({editableSuggestions.length})
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground italic px-1 text-center">
                    💡 Modifie chaque montant pour ajuster ta répartition. Les budgets s'ajustent automatiquement à mesure que tu dépenses.
                  </p>
                </motion.div>
              )}
              {showSuggestions && !suggestionsLoading && editableSuggestions.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground text-center mt-2"
                >
                  Aucune suggestion disponible.
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
                  <MoneyInput
                    placeholder="Montant budget"
                    value={newCatBudget}
                    onChange={(n) => setNewCatBudget(n ? String(n) : "")}
                    showCurrency={false}
                    className="[&>input]:glass"
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
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-semibold ${status.color}`}>
                          {status.text}
                        </span>
                        {editingId !== cb.id ? (
                          <button
                            onClick={() => {
                              setEditingId(cb.id);
                              setEditValue(String(cb.budget_amount));
                            }}
                            className="p-1 rounded-lg hover:bg-secondary transition-colors"
                            title="Modifier le budget"
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg hover:bg-secondary transition-colors"
                            title="Annuler"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        <ConfirmDeleteDialog onConfirm={() => deleteCategoryBudget(cb.id)} title="Supprimer ce budget catégorie ?" />
                      </div>
                    </div>
                    {/* Champ d'édition inline */}
                    <AnimatePresence>
                      {editingId === cb.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 mt-2 mb-2">
                            <MoneyInput
                              value={editValue}
                              autoFocus
                              onChange={(n) => setEditValue(n ? String(n) : "")}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") await saveInlineEdit(cb.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              showCurrency={false}
                              className="flex-1 [&>input]:glass [&>input]:text-sm [&>input]:h-8"
                              placeholder="Nouveau montant"
                            />
                            <Button
                              size="sm"
                              className="h-8 gradient-primary text-primary-foreground"
                              onClick={() => saveInlineEdit(cb.id)}
                            >
                              OK
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                    {(() => {
                      const tip = (coachingPlan?.conseils_par_categorie as any)?.[cb.category?.name || ""];
                      return tip ? (
                        <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/15">
                          <Sparkles className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{tip}</p>
                        </div>
                      ) : null;
                    })()}
                  </BorderRotate>
                </motion.div>
              );
            })}
            {categoryBudgets.length === 0 && !loading && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-muted-foreground text-sm mb-2">Aucun budget par catégorie défini</p>
                <p className="text-xs text-muted-foreground">
                  Tes budgets se créent automatiquement dès que tu enregistres une dépense.
                </p>
              </div>
            )}
          </div>
        </>
      )}
        </>
      )}
    </DashboardLayout>
  );
};

export default Budgets;
