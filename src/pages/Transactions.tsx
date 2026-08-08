import { useState, useEffect, useMemo } from "react";
import { UserText } from "@/components/UserText";
import WalletIcon from "@/components/WalletIcon";
import { formatMoneySmart } from "@/lib/formatMoney";
import { motion } from "framer-motion";
import { 
  Search, Filter, X, Utensils, Car, Smartphone, Heart, 
  ShoppingBag, Home, Gamepad2, Users, CreditCard, Briefcase, 
  GraduationCap, Building2, ArrowRightLeft, DollarSign, Wallet,
  ArrowUpDown
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
  const [searchQuery, setSearchQuery] = useState("");
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
  type SortOrder = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");

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
            .order("created_at", { ascending: false })
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
      const { data, error } = await supabase.from("transactions").delete().eq("id", id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({
          title: "Suppression impossible",
          description: "Tu n'as peut-être pas les droits.",
          variant: "destructive",
        });
        return;
      }
      // Reset complet de la pagination pour garantir cohérence
      setTransactions([]);
      setPage(0);
      await fetchData(0);
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
    setSortOrder("date_desc");
  };

  const hasActiveFilters = filterCategory !== "all" || filterWallet !== "all" || filterPeriod !== "all" || filterMinAmount || filterMaxAmount || sortOrder !== "date_desc";

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    let result = transactions;

    // Text search
    if (searchQuery) {
      const s = normalize(searchQuery);
      result = result.filter((t) => {
        const note = normalize(t.note || "");
        const category = normalize(t.categories?.name || "");
        const amount = String(t.amount || "");
        return note.includes(s) || category.includes(s) || amount.includes(s);
      });
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
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (filterPeriod === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filterPeriod === "3months") {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
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

    // Sort
    const dateKey = (t: any) => `${t.date}T${(t.created_at || "").slice(11)}`;
    if (sortOrder === "amount_asc") {
      result = [...result].sort((a, b) => Number(a.amount) - Number(b.amount));
    } else if (sortOrder === "amount_desc") {
      result = [...result].sort((a, b) => Number(b.amount) - Number(a.amount));
    } else if (sortOrder === "date_asc") {
      result = [...result].sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
    } else {
      result = [...result].sort((a, b) => dateKey(b).localeCompare(dateKey(a)));
    }

    return result;
  }, [transactions, searchQuery, filterCategory, filterWallet, filterPeriod, filterMinAmount, filterMaxAmount, sortOrder]);

  /** Nombre de filtres actifs, pour la pastille du bouton Filtres. */
  const activeFilterCount =
    (filterCategory !== "all" ? 1 : 0) +
    (filterWallet !== "all" ? 1 : 0) +
    (filterPeriod !== "all" ? 1 : 0) +
    (filterMinAmount ? 1 : 0) +
    (filterMaxAmount ? 1 : 0) +
    (sortOrder !== "date_desc" ? 1 : 0);

  /** Raccourcis de période — pilotent le MÊME état que le panneau de filtres. */
  const periodChips = [
    { value: "all", label: "Tout" },
    { value: "week", label: "7 jours" },
    { value: "month", label: "Ce mois" },
    { value: "3months", label: "3 mois" },
    { value: "year", label: "Cette année" },
  ];

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date();
    y.setDate(today.getDate() - 1);
    const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Aujourd'hui";
    if (same(d, y)) return "Hier";
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  /**
   * On ne regroupe par jour que si le tri est chronologique.
   * Trié par montant, des en-têtes de date n'auraient aucun sens.
   */
  const groupedByDay = sortOrder === "date_desc" || sortOrder === "date_asc";

  const dayGroups = useMemo(() => {
    if (!groupedByDay) return [];
    const map = new Map<string, any[]>();
    for (const t of filtered) {
      const key = String(t.date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const net = items.reduce(
        (sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
        0
      );
      return { key, items, net };
    });
  }, [filtered, groupedByDay]);

  /** Une ligne de transaction. Rendu identique en liste plate ou groupée. */
  const TxRow = ({ t, i }: { t: any; i: number }) => (
    <motion.div
      key={t.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.03 * i, 0.3) }}
    >
      <div className="glass-card rounded-2xl p-3 flex items-center gap-3">
        <div
          className="category-icon-wrapper"
          style={{
            width: 44,
            height: 44,
            backgroundColor:
              t.categories?.color ||
              (t.type === "income" ? "hsl(var(--primary))" : "hsl(var(--secondary))"),
          }}
        >
          {getCatIcon(t.categories?.name || "", t.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            <UserText>{t.note || t.categories?.name || "Transaction"}</UserText>
          </p>
          <p className="text-xs text-muted-foreground truncate">
            <UserText>{t.categories?.name}</UserText>
            {!groupedByDay && ` · ${new Date(t.date).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
        <span
          className={`text-sm font-extrabold whitespace-nowrap ${
            t.type === "income" ? "text-primary" : "text-foreground"
          }`}
        >
          {t.type === "income" ? "+" : "-"}
          {formatMoneySmart(Number(t.amount))}
        </span>
        <ConfirmDeleteDialog
          onConfirm={() => handleDelete(t.id)}
          title="Supprimer cette transaction ?"
        />
      </div>
    </motion.div>
  );

  return (
    <DashboardLayout title="Transactions">
      <div className="flex gap-2 items-center mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un libellé, une catégorie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 rounded-full bg-card border-border text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Filtres avancés"
          className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center border transition-colors ${
            hasActiveFilters
              ? "bg-primary border-transparent text-primary-foreground"
              : "bg-card border-border text-foreground"
          }`}
        >
          <Filter className="w-[18px] h-[18px]" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center border-2 border-background">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Raccourcis de période — pilotent le même filtre que le panneau */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {periodChips.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setFilterPeriod(p.value)}
            className={`flex-none px-4 py-2 rounded-full text-[12.5px] font-bold border transition-colors ${
              filterPeriod === p.value
                ? "bg-primary/15 border-transparent text-primary"
                : "bg-card border-border text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
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
                {categories.map(c => <SelectItem key={c.id} value={c.id}><UserText>{c.name}</UserText></SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterWallet} onValueChange={setFilterWallet}>
              <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Portefeuille" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous portefeuilles</SelectItem>
                {wallets.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="inline-flex items-center gap-2">
                      <WalletIcon name={w.wallet_name} size={18} />
                      {w.wallet_name}
                    </span>
                  </SelectItem>
                ))}
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

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="bg-secondary border-border text-sm">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Trier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (récent → ancien)</SelectItem>
                <SelectItem value="date_asc">Date (ancien → récent)</SelectItem>
                <SelectItem value="amount_desc">Montant décroissant</SelectItem>
                <SelectItem value="amount_asc">Montant croissant</SelectItem>
              </SelectContent>
            </Select>
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
        {loading && page === 0 ? (
          Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)
        ) : groupedByDay ? (
          dayGroups.map((g) => (
            <div key={g.key}>
              <div className="flex items-baseline justify-between px-1 pt-4 pb-2">
                <span className="text-[12.5px] font-extrabold text-foreground capitalize">
                  {dayLabel(g.key)}
                </span>
                <span
                  className={`text-[11.5px] font-bold ${
                    g.net >= 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {g.net >= 0 ? "+" : "-"}
                  {formatMoneySmart(Math.abs(g.net))}
                </span>
              </div>
              <div className="space-y-2">
                {g.items.map((t: any, i: number) => (
                  <TxRow key={t.id} t={t} i={i} />
                ))}
              </div>
            </div>
          ))
        ) : (
          filtered.map((t, i) => <TxRow key={t.id} t={t} i={i} />)
        )}
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
