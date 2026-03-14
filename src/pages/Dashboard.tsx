import { useState, useEffect, useMemo, useCallback } from "react";
import Onboarding from "@/components/Onboarding";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, MessageCircle, Camera, CalendarIcon, Sparkles, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { getCategoryIcon } from "@/lib/categoryIcons";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { supabase } from "@/integrations/supabase/client";
import { CardSkeleton, ListItemSkeleton, ChartSkeleton } from "@/components/DashboardSkeleton";
import { CalendarWithPresets } from "@/components/ui/calendar-with-presets";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const trendModes = ["Jour", "Semaine"];

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { formatAmount } = usePrivacy();
  const [activePeriod, setActivePeriod] = useState(1);
  const [trendMode, setTrendMode] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [newTxCount, setNewTxCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Check if first visit (no transactions at all)
  useEffect(() => {
    if (!user || localStorage.getItem("onboarding_done")) {
      setOnboardingChecked(true);
      return;
    }
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (count === 0) setShowOnboarding(true);
        setOnboardingChecked(true);
      });
  }, [user]);

  useEffect(() => {
    return () => {
      localStorage.setItem("dashboard_last_visit", new Date().toISOString());
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    if (activePeriod === 2 && !customRange?.from) return;

    setLoading(true);
    setError(null);
    const now = new Date();
    let startDate: string;
    let endDate: string;

    if (activePeriod === 0) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      startDate = endDate = yesterday.toISOString().split("T")[0];
    } else if (activePeriod === 1) {
      startDate = endDate = now.toISOString().split("T")[0];
    } else {
      startDate = customRange!.from!.toISOString().split("T")[0];
      endDate = (customRange!.to || customRange!.from!).toISOString().split("T")[0];
    }

    const { data, error: fetchError } = await supabase
      .from("transactions")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .limit(500);

    if (fetchError) {
      setError("Impossible de charger les transactions. Vérifiez votre connexion.");
      setLoading(false);
      return;
    }
    const txs = data || [];
    setTransactions(txs);

    const lastVisit = localStorage.getItem("dashboard_last_visit");
    if (lastVisit) {
      const count = txs.filter(t => new Date(t.created_at) > new Date(lastVisit)).length;
      setNewTxCount(count);
    }

    setLoading(false);
  }, [user, activePeriod, customRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const expenseByCategory = transactions
    .filter(t => t.type === "expense")
    .reduce((acc: Record<string, { name: string; amount: number; color: string }>, t) => {
      const cat = t.categories as any;
      const catName = cat?.name || "Autre";
      const catColor = cat?.color || "hsl(0,0%,50%)";
      if (!acc[catName]) acc[catName] = { name: catName, amount: 0, color: catColor };
      acc[catName].amount += Number(t.amount);
      return acc;
    }, {});

  const chartData: { name: string; amount: number; color: string }[] = Object.values(expenseByCategory);
  const recentTx = transactions.slice(0, 5);

  const trendData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === "expense");
    if (expenses.length === 0) return [];

    if (trendMode === 0) {
      const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      const byDay: Record<number, number> = {};
      expenses.forEach(t => {
        let d = new Date(t.date).getDay();
        d = d === 0 ? 6 : d - 1;
        byDay[d] = (byDay[d] || 0) + Number(t.amount);
      });
      return days.map((name, i) => ({ name, amount: byDay[i] || 0 }));
    } else {
      const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      const byMonth: Record<number, number> = {};
      expenses.forEach(t => {
        const m = new Date(t.date).getMonth();
        byMonth[m] = (byMonth[m] || 0) + Number(t.amount);
      });
      const now = new Date();
      const currentMonth = now.getMonth();
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const m = (currentMonth - i + 12) % 12;
        result.push({ name: months[m], amount: byMonth[m] || 0 });
      }
      return result;
    }
  }, [transactions, trendMode]);

  if (showOnboarding) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.setItem("onboarding_done", "1");
          setShowOnboarding(false);
          fetchData();
        }}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="pt-6 pb-4 flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Bonjour 👋</p>
          <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || "Tableau de bord"}</h1>
        </div>
      </div>

      <div className="flex gap-1 p-1 glass-card rounded-xl mb-6">
        <button onClick={() => setActivePeriod(0)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activePeriod === 0 ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          Hier
        </button>
        <button onClick={() => setActivePeriod(1)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activePeriod === 1 ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          Aujourd'hui
        </button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button onClick={() => setActivePeriod(2)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${activePeriod === 2 ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {activePeriod === 2 && customRange?.from
                ? customRange.to
                  ? `${format(customRange.from, "d MMM", { locale: fr })} - ${format(customRange.to, "d MMM", { locale: fr })}`
                  : format(customRange.from, "d MMM", { locale: fr })
                : <CalendarIcon className="w-4 h-4" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <CalendarWithPresets
              selected={customRange}
              onSelect={(range) => {
                setCustomRange(range);
                if (range?.from && range?.to) setCalendarOpen(false);
              }}
              onPresetSelect={(range) => {
                setCustomRange(range);
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Message when custom range not selected */}
      {activePeriod === 2 && !customRange?.from && (
        <div className="glass-card rounded-2xl p-6 mb-6 text-center">
          <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Sélectionnez une plage de dates dans le calendrier ci-dessus.</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-destructive text-sm mb-3">{error}</p>
          <button
            onClick={() => { setError(null); fetchData(); }}
            className="inline-flex items-center gap-2 text-primary text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {!error && loading ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <ChartSkeleton />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
          </div>
        </>
      ) : !error && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">Revenus</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground truncate">{formatAmount(totalIncome)}</p>
              <p className="text-xs text-muted-foreground">FCFA</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-xs text-muted-foreground">Dépenses</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground truncate">{formatAmount(totalExpense)}</p>
              <p className="text-xs text-muted-foreground">FCFA</p>
            </motion.div>
          </div>

          {/* Trend Line Chart */}
          {transactions.filter(t => t.type === "expense").length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Évolution des dépenses</h2>
                <div className="flex gap-1 p-0.5 bg-secondary rounded-lg">
                  {trendModes.map((m, i) => (
                    <button key={m} onClick={() => setTrendMode(i)} className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${i === trendMode ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(0,0%,60%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(0,0%,60%)" }} axisLine={false} tickLine={false} width={45} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <RTooltip
                    contentStyle={{ backgroundColor: "hsl(0,0%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "hsl(0,0%,70%)" }}
                    formatter={(value: number) => [`${value.toLocaleString("fr-FR")} F`, "Dépenses"]}
                  />
                  <Line type="monotone" dataKey="amount" stroke="hsl(84,81%,44%)" strokeWidth={2.5} dot={{ fill: "hsl(84,81%,44%)", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {chartData.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Répartition des dépenses</h2>
              <div className="relative w-48 h-48 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="amount" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-2">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-base sm:text-lg font-bold text-foreground truncate max-w-full">{formatAmount(totalExpense)}</p>
                  <p className="text-xs text-muted-foreground">FCFA</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {chartData.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-muted-foreground">{c.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {chartData.length === 0 && (
            <div className="glass-card rounded-2xl p-8 mb-6 text-center">
              <p className="text-muted-foreground text-sm">Aucune transaction pour cette période.</p>
              <Link to="/transactions/new" className="text-primary text-sm mt-2 inline-block">Ajouter une transaction →</Link>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">Transactions récentes</h2>
                {newTxCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    +{newTxCount} nouvelle{newTxCount > 1 ? "s" : ""}
                  </motion.span>
                )}
              </div>
              <Link to="/transactions" className="text-xs text-primary">Voir tout</Link>
            </div>
            <div className="space-y-2">
              {recentTx.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  {(() => { const CatIcon = getCategoryIcon((t.categories as any)?.name); return (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${(t.categories as any)?.color || (t.type === "income" ? "hsl(84,81%,44%)" : "hsl(0,0%,50%)")}20` }}>
                    <CatIcon className="w-5 h-5" style={{ color: (t.categories as any)?.color || (t.type === "income" ? "hsl(84,81%,44%)" : "hsl(0,0%,60%)") }} />
                  </div>); })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.note || (t.categories as any)?.name || "Transaction"}</p>
                    <p className="text-xs text-muted-foreground">{(t.categories as any)?.name} · {new Date(t.date).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={`text-sm font-semibold whitespace-nowrap ${t.type === "income" ? "text-primary" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "-"}{formatAmount(Number(t.amount))}
                  </span>
                </motion.div>
              ))}
              {recentTx.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">Aucune transaction</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="fixed bottom-24 right-5 z-50 flex flex-col gap-3">
        <Link
          to="/scan"
          className="w-12 h-12 rounded-full glass shadow-lg flex items-center justify-center border border-primary/30"
        >
          <Camera className="w-5 h-5 text-primary" />
        </Link>
        <Link
          to="/assistant"
          className="w-14 h-14 rounded-full gradient-primary neon-glow shadow-lg flex items-center justify-center animate-bounce-slow"
        >
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </Link>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
