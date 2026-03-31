import { useState, useEffect, useMemo } from "react";
import { formatMoneySmart } from "@/lib/formatMoney";
import { motion } from "framer-motion";
import { 
  Search, Filter, X, Utensils, Car, Smartphone, Heart, 
  ShoppingBag, Home, Gamepad2, Users, CreditCard, Briefcase, 
  GraduationCap, Building2, ArrowRightLeft, DollarSign, Wallet
} from "lucide-react";
import { getCatIcon } from "@/lib/getCatIcon";
import DashboardLayout from "@/components/DashboardLayout";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";

const Transactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  // Filters
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");

  const fetchData = async (pageNum = 0) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const from = pageNum * PAGE_SIZE;
      const [{ data: txData, error: txErr }, { data: catData }, { data: walData }] =
        await Promise.all([
          supabase.from("transactions")
            .select("*, categories(name, icon, color)")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .range(from, from + PAGE_SIZE - 1),
          supabase.from("categories").select("id, name").eq("user_id", user.id),
          supabase.from("wallets").select("id, wallet_name").eq("user_id", user.id),
        ]);
      if (txErr) throw txErr;
      if (pageNum === 0) setTransactions(txData || []);
      else setTransactions(prev => [...prev, ...(txData || [])]);
      setHasMore((txData || []).length === PAGE_SIZE);
      setCategories(catData || []);
      setWallets(walData || []);
    } catch {
      setError("Impossible de charger les transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(0); fetchData(0); }, [user]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: "Transaction supprimée" });
    } catch {
      toast({
        title: "Erreur de suppression",
        description: "Réessaie dans quelques secondes",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterWallet("all");
    setFilterPeriod("all");
    setFilterMinAmount("");
    setFilterMaxAmount("");
  };

  const hasActiveFilters = filterCategory !== "all" || filterWallet !== "all" || filterPeriod !== "all" || filterMinAmount || filterMaxAmount;

  const filtered = useMemo(() => {
    let result = transactions;

    // Text search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        (t.note || "").toLowerCase().includes(s) ||
        (t.categories?.name || "").toLowerCase().includes(s)
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      result = result.filter(t => t.category_id === filterCategory);
    }

    // Wallet filter
    if (filterWallet !== "all") {
      result = result.filter(t => t.wallet_id === filterWallet);
    }

    // Period filter
    if (filterPeriod !== "all") {
      const now = new Date();
      let startDate: Date;
      if (filterPeriod === "week") {
        startDate = new Date(now); startDate.setDate(now.getDate() - 7);
      } else if (filterPeriod === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filterPeriod === "3months") {
        startDate = new Date(now); startDate.setMonth(now.getMonth() - 3);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      result = result.filter(t => new Date(t.date) >= startDate);
    }

    // Amount filters
    if (filterMinAmount) {
      result = result.filter(t => Number(t.amount) >= Number(filterMinAmount));
    }
    if (filterMaxAmount) {
      result = result.filter(t => Number(t.amount) <= Number(filterMaxAmount));
    }

    return result;
  }, [transactions, search, filterCategory, filterWallet, filterPeriod, filterMinAmount, filterMaxAmount]);

  return (
    <DashboardLayout title="Transactions">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>
        <Button
          variant={hasActiveFilters ? "hero" : "glass"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Filtres avancés</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary flex items-center gap-1">
                <X className="w-3 h-3" /> Réinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterWallet} onValueChange={setFilterWallet}>
              <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Portefeuille" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous portefeuilles</SelectItem>
                {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.wallet_name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Période" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute période</SelectItem>
                <SelectItem value="week">7 derniers jours</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="3months">3 derniers mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Input type="number" placeholder="Min" value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} className="bg-secondary border-border text-sm" />
              <Input type="number" placeholder="Max" value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} className="bg-secondary border-border text-sm" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</p>
        </motion.div>
      )}

      <div className="space-y-2">
        {error && (
          <div className="glass-card rounded-2xl p-5 text-center mb-4">
            <p className="text-destructive text-sm mb-3">{error}</p>
            <button onClick={() => { setPage(0); fetchData(0); }} className="text-primary text-sm">
              Réessayer
            </button>
          </div>
        )}
        {loading && page === 0
          ? Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)
          : filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
              <div className="glass-card rounded-xl p-3 flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: `${t.categories?.color || (t.type === "income" ? "hsl(84,81%,44%)" : "hsl(0,0%,50%)")}20`,
                  color: t.categories?.color || (t.type === "income" ? "hsl(84,81%,44%)" : "hsl(150,5%,60%)")
                }}
              >
                {getCatIcon(t.categories?.name || "", t.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.note || t.categories?.name || "Transaction"}</p>
                <p className="text-xs text-muted-foreground">{t.categories?.name} · {new Date(t.date).toLocaleDateString("fr-FR")}</p>
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap ${t.type === "income" ? "text-primary" : "text-foreground"}`}>
                {t.type === "income" ? "+" : "-"}{formatMoneySmart(Number(t.amount))} F
              </span>
              <ConfirmDeleteDialog onConfirm={() => handleDelete(t.id)} title="Supprimer cette transaction ?" />
              </div>
            </motion.div>
          ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Aucune transaction</p>
        )}
        {!loading && hasMore && filtered.length >= PAGE_SIZE && (
          <Button
            variant="glass"
            className="w-full mt-3"
            onClick={() => {
              const next = page + 1;
              setPage(next);
              fetchData(next);
            }}
          >
            {loading ? "Chargement..." : "Charger plus de transactions"}
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
