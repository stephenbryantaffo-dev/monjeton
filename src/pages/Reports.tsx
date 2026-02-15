import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { Download, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { supabase } from "@/integrations/supabase/client";
import { generateMonthlyPdf } from "@/lib/generatePdf";
import { useToast } from "@/hooks/use-toast";

interface Leak {
  category: string;
  count: number;
  total: number;
}

const Reports = () => {
  const { user } = useAuth();
  const { formatAmount } = usePrivacy();
  const { toast } = useToast();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const { data: transactions } = await supabase
        .from("transactions")
        .select("*, categories(name, color)")
        .eq("user_id", user.id);

      if (!transactions) return;
      setAllTransactions(transactions);

      // Category breakdown for current month
      const monthTx = transactions.filter(t => t.date >= startOfMonth && t.type === "expense");
      const catMap: Record<string, { name: string; value: number; color: string }> = {};
      monthTx.forEach(t => {
        const name = t.categories?.name || "Autre";
        const color = t.categories?.color || "hsl(0,0%,50%)";
        if (!catMap[name]) catMap[name] = { name, value: 0, color };
        catMap[name].value += Number(t.amount);
      });
      setCategoryData(Object.values(catMap));

      // Monthly aggregation (last 6 months)
      const monthly: Record<string, { month: string; depenses: number; revenus: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthly[key] = { month: d.toLocaleDateString("fr-FR", { month: "short" }), depenses: 0, revenus: 0 };
      }
      transactions.forEach(t => {
        const key = t.date.substring(0, 7);
        if (monthly[key]) {
          if (t.type === "expense") monthly[key].depenses += Number(t.amount);
          else monthly[key].revenus += Number(t.amount);
        }
      });
      setMonthlyData(Object.values(monthly));

      // Money leak detection: small expenses (<2000) appearing 3+ times in same category this month
      const smallExpenses = monthTx.filter(t => Number(t.amount) < 2000);
      const leakMap: Record<string, { category: string; count: number; total: number }> = {};
      smallExpenses.forEach(t => {
        const cat = t.categories?.name || "Autre";
        if (!leakMap[cat]) leakMap[cat] = { category: cat, count: 0, total: 0 };
        leakMap[cat].count++;
        leakMap[cat].total += Number(t.amount);
      });
      setLeaks(Object.values(leakMap).filter(l => l.count >= 3));
    };

    fetchData();
  }, [user]);

  const total = categoryData.reduce((s, c) => s + c.value, 0);
  const totalIncome = allTransactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);

  const handleExportPdf = () => {
    const now = new Date();
    const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    generateMonthlyPdf({
      month: monthLabel,
      totalIncome,
      totalExpense: total,
      categories: categoryData.map(c => ({ name: c.name, value: c.value })),
      monthlyData,
    });
    toast({ title: "PDF exporté ✅" });
  };

  return (
    <DashboardLayout title="Rapports">
      {/* Export PDF */}
      <div className="mb-4">
        <Button variant="hero" size="lg" className="w-full" onClick={handleExportPdf}>
          <Download className="w-4 h-4" /> Exporter le rapport PDF
        </Button>
      </div>

      {/* Money Leaks */}
      {leaks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-4 border border-neon-yellow/30" style={{ borderColor: "hsl(45, 96%, 58%, 0.3)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: "hsl(45, 96%, 58%)" }} />
            <h2 className="text-sm font-semibold text-foreground">Fuites d'argent détectées</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Petites dépenses fréquentes (&lt;2000 F) ce mois-ci :</p>
          <div className="space-y-2">
            {leaks.map((l) => (
              <div key={l.category} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">{l.category}</span>
                  <span className="text-xs text-muted-foreground ml-2">{l.count} fois</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: "hsl(45, 96%, 58%)" }}>{formatAmount(l.total)} F</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">💡 Ces petites dépenses s'accumulent. Essayez de les regrouper ou les réduire.</p>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-4">Dépenses par catégorie</h2>
        {categoryData.length > 0 ? (
          <>
            <div className="relative w-44 h-44 mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-foreground">{formatAmount(total)}</p>
                <p className="text-xs text-muted-foreground">FCFA</p>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {categoryData.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-foreground">{c.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatAmount(c.value)} F</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-8">Aucune donnée ce mois</p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Évolution mensuelle</h2>
        {monthlyData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 16%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(150, 5%, 50%)", fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: "hsl(150, 5%, 50%)", fontSize: 10 }} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Bar dataKey="revenus" fill="hsl(84, 81%, 44%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenses" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-xs text-muted-foreground">Revenus</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-accent" /><span className="text-xs text-muted-foreground">Dépenses</span></div>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-8">Aucune donnée</p>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Reports;
