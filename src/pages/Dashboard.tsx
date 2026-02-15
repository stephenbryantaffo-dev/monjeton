import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Wallet, MessageCircle, Camera } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { supabase } from "@/integrations/supabase/client";
import { CardSkeleton, ListItemSkeleton, ChartSkeleton } from "@/components/DashboardSkeleton";

const periods = ["Semaine", "Mois", "Année"];

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { formatAmount } = usePrivacy();
  const [activePeriod, setActivePeriod] = useState(1);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      let startDate: Date;

      if (activePeriod === 0) {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (activePeriod === 1) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      const { data } = await supabase
        .from("transactions")
        .select("*, categories(name, icon, color)")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      setTransactions(data || []);
      setLoading(false);
    };

    fetchData();
  }, [user, activePeriod]);

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

  return (
    <DashboardLayout>
      <div className="pt-6 pb-4">
        <p className="text-muted-foreground text-sm">Bonjour 👋</p>
        <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || "Tableau de bord"}</h1>
      </div>

      <div className="flex gap-1 p-1 glass-card rounded-xl mb-6">
        {periods.map((p, i) => (
          <button key={p} onClick={() => setActivePeriod(i)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${i === activePeriod ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {p}
          </button>
        ))}
      </div>

      {loading ? (
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
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Revenus</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatAmount(totalIncome)}</p>
              <p className="text-xs text-muted-foreground">FCFA</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Dépenses</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatAmount(totalExpense)}</p>
              <p className="text-xs text-muted-foreground">FCFA</p>
            </motion.div>
          </div>

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
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-foreground">{formatAmount(totalExpense)}</p>
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
              <h2 className="text-sm font-semibold text-foreground">Transactions récentes</h2>
              <Link to="/transactions" className="text-xs text-primary">Voir tout</Link>
            </div>
            <div className="space-y-2">
              {recentTx.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === "income" ? "bg-primary/20" : "bg-secondary"}`}>
                    <Wallet className={`w-5 h-5 ${t.type === "income" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.note || (t.categories as any)?.name || "Transaction"}</p>
                    <p className="text-xs text-muted-foreground">{(t.categories as any)?.name} · {new Date(t.date).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-primary" : "text-foreground"}`}>
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
