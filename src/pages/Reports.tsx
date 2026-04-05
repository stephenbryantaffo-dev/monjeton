import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";
import { motion } from "framer-motion";
import { Download, AlertTriangle, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from "lucide-react";
import { ChartSkeleton, CardSkeleton } from "@/components/DashboardSkeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { supabase } from "@/integrations/supabase/client";
import { generateMonthlyPdf } from "@/lib/generatePdf";
import { useToast } from "@/hooks/use-toast";
import { calculatePredictions, type SpendingPrediction } from "@/lib/predictions";

interface Leak {
  category: string;
  count: number;
  total: number;
}

const tabs = ["Rapport", "Prévisions"];

const Reports = () => {
  const { user } = useAuth();
  const { formatAmount } = usePrivacy();
  const { toast } = useToast();

  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth());
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [predictions, setPredictions] = useState<SpendingPrediction[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const goToPrevMonth = () => {
    if (reportMonth === 0) { setReportMonth(11); setReportYear(y => y - 1); }
    else setReportMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (reportMonth === 11) { setReportMonth(0); setReportYear(y => y + 1); }
    else setReportMonth(m => m + 1);
  };
  const isCurrentMonth = reportMonth === now.getMonth() && reportYear === now.getFullYear();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sixMonthsAgo = new Date(reportYear, reportMonth - 5, 1).toISOString().split("T")[0];
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*, categories(name, color)")
        .eq("user_id", user.id)
        .gte("date", sixMonthsAgo)
        .order("date", { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (!transactions) return;
      setAllTransactions(transactions);

      const startOfMonth = new Date(reportYear, reportMonth, 1).toISOString().split("T")[0];
      const endOfMonth = new Date(reportYear, reportMonth + 1, 0).toISOString().split("T")[0];
      const monthTx = transactions.filter(t => t.date >= startOfMonth && t.date <= endOfMonth && t.type === "expense");
      const catMap: Record<string, { name: string; value: number; color: string }> = {};
      monthTx.forEach(t => {
        const name = t.categories?.name || "Autre";
        const color = t.categories?.color || "hsl(0,0%,50%)";
        if (!catMap[name]) catMap[name] = { name, value: 0, color };
        catMap[name].value += Number(t.amount);
      });
      setCategoryData(Object.values(catMap));

      const monthly: Record<string, { month: string; depenses: number; revenus: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(reportYear, reportMonth - i, 1);
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

      const smallExpenses = monthTx.filter(t => Number(t.amount) < 2000);
      const leakMap: Record<string, { category: string; count: number; total: number }> = {};
      smallExpenses.forEach(t => {
        const cat = t.categories?.name || "Autre";
        if (!leakMap[cat]) leakMap[cat] = { category: cat, count: 0, total: 0 };
        leakMap[cat].count++;
        leakMap[cat].total += Number(t.amount);
      });
      setLeaks(Object.values(leakMap).filter(l => l.count >= 3));

      // Predictions
      if (isCurrentMonth) {
        const { data: catBudgets } = await supabase
          .from("category_budgets")
          .select("*, categories:category_id(name, icon, color)")
          .eq("user_id", user.id)
          .eq("month", now.getMonth() + 1)
          .eq("year", now.getFullYear());

        if (catBudgets && catBudgets.length > 0) {
          const preds = calculatePredictions(transactions, catBudgets);
          setPredictions(preds);
        } else {
          setPredictions([]);
        }
      }
    } catch {
      toast({ title: "Erreur de chargement", description: "Impossible de charger les rapports", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, reportMonth, reportYear, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchAiInsight = async () => {
    if (aiInsight || aiLoading || predictions.length === 0) return;
    setAiLoading(true);
    try {
      const context = predictions.map(p =>
        `${p.category}: dépensé ${p.currentMonth} FCFA, prévu ${Math.round(p.predictedEndOfMonth)} FCFA${p.budgetAmount ? `, budget ${p.budgetAmount} FCFA` : ""}, tendance ${p.trend}`
      ).join("\n");

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            { role: "user", content: `Voici mes prévisions de dépenses ce mois :\n${context}\n\nDonne-moi 2-3 conseils concrets et courts (max 3 lignes) pour finir le mois sereinement. Parle comme un coach financier ivoirien sympa.` }
          ]
        }
      });
      if (error) throw error;

      // Handle streaming response
      if (typeof data === "string") {
        const lines = data.split("\n").filter(l => l.startsWith("data: "));
        let full = "";
        for (const line of lines) {
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            full += parsed.choices?.[0]?.delta?.content || "";
          } catch {}
        }
        setAiInsight(full || "Pas de conseil disponible pour le moment.");
      } else if (data?.choices?.[0]?.message?.content) {
        setAiInsight(data.choices[0].message.content);
      } else {
        setAiInsight("Pas de conseil disponible pour le moment.");
      }
    } catch {
      setAiInsight("Impossible de charger les conseils IA.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 1 && predictions.length > 0 && !aiInsight) {
      fetchAiInsight();
    }
  }, [activeTab, predictions]);

  const total = categoryData.reduce((s, c) => s + c.value, 0);
  const totalIncome = allTransactions
    .filter(t => {
      const startOfMonth = new Date(reportYear, reportMonth, 1).toISOString().split("T")[0];
      const endOfMonth = new Date(reportYear, reportMonth + 1, 0).toISOString().split("T")[0];
      return t.type === "income" && t.date >= startOfMonth && t.date <= endOfMonth;
    })
    .reduce((s, t) => s + Number(t.amount), 0);

  const handleExportPdf = () => {
    const monthLabel = new Date(reportYear, reportMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    generateMonthlyPdf({
      month: monthLabel,
      totalIncome,
      totalExpense: total,
      categories: categoryData.map(c => ({ name: c.name, value: c.value })),
      monthlyData,
      userName: user?.user_metadata?.full_name || "",
      userEmail: user?.email || "",
    });
    toast({ title: "PDF exporté ✅" });
  };

  const predChartData = predictions.map(p => ({
    name: p.category.length > 8 ? p.category.substring(0, 8) + "…" : p.category,
    depense: p.currentMonth,
    prevu: Math.round(p.predictedEndOfMonth),
    budget: p.budgetAmount || 0,
  }));

  const trendIcons = {
    up: <TrendingUp className="w-3.5 h-3.5 text-destructive" />,
    down: <TrendingDown className="w-3.5 h-3.5 text-primary" />,
    stable: <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
  };

  return (
    <DashboardLayout title="Rapports">
      {/* Month selector */}
      <div className="flex items-center justify-between mb-4 glass-card rounded-2xl px-4 py-3">
        <button onClick={goToPrevMonth} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">
          {new Date(reportYear, reportMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </span>
        <button onClick={goToNextMonth} disabled={isCurrentMonth} className="text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-4">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${i === activeTab ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4"><CardSkeleton /><ChartSkeleton /><ChartSkeleton /></div>
      ) : activeTab === 0 ? (
        <>
          <div className="mb-4">
            <Button variant="hero" size="lg" className="w-full" onClick={handleExportPdf}>
              <Download className="w-4 h-4" /> Exporter le rapport PDF
            </Button>
          </div>

          {leaks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-4 border border-[hsl(45,96%,58%)]/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-[hsl(45,96%,58%)]" />
                <h2 className="text-sm font-semibold text-foreground">Fuites d'argent détectées</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Petites dépenses fréquentes (&lt;2000 F) ce mois :</p>
              <div className="space-y-2">
                {leaks.map((l) => (
                  <div key={l.category} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-foreground">{l.category}</span>
                      <span className="text-xs text-muted-foreground ml-2">{l.count} fois</span>
                    </div>
                    <span className="text-sm font-semibold text-[hsl(45,96%,58%)]">{formatAmount(l.total)} F</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">💡 Ces petites dépenses s'accumulent. Essayez de les regrouper ou les réduire.</p>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <BorderRotate className="p-5 mb-4" animationSpeed={14}>
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-2">
                      <p className="text-base sm:text-lg font-bold text-foreground truncate max-w-full">{formatAmount(total)}</p>
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
            </BorderRotate>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <BorderRotate className="p-5" animationSpeed={14}>
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
            </BorderRotate>
          </motion.div>
        </>
      ) : (
        /* PREDICTIONS TAB */
        <>
          {predictions.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-muted-foreground text-sm">Aucun budget catégorie défini pour ce mois.</p>
              <p className="text-xs text-muted-foreground mt-1">Définis des budgets pour voir les prévisions.</p>
            </div>
          ) : (
            <>
              {/* Chart: Dépensé vs Prévu vs Budget */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <BorderRotate className="p-5 mb-4" animationSpeed={14}>
                  <h2 className="text-sm font-semibold text-foreground mb-4">Dépensé vs Prévu vs Budget</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={predChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 16%)" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(150, 5%, 50%)", fontSize: 10 }} axisLine={false} />
                      <YAxis tick={{ fill: "hsl(150, 5%, 50%)", fontSize: 10 }} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                      <RTooltip
                        contentStyle={{ backgroundColor: "hsl(0,0%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 12, fontSize: 12 }}
                        formatter={(value: number, name: string) => [`${value.toLocaleString("fr-FR")} F`, name === "depense" ? "Dépensé" : name === "prevu" ? "Prévu" : "Budget"]}
                      />
                      <Bar dataKey="depense" fill="hsl(84, 81%, 44%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="prevu" fill="hsl(45, 96%, 58%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="budget" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(84, 81%, 44%)" }} /><span className="text-xs text-muted-foreground">Dépensé</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(45, 96%, 58%)" }} /><span className="text-xs text-muted-foreground">Prévu</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(270, 70%, 60%)" }} /><span className="text-xs text-muted-foreground">Budget</span></div>
                  </div>
                </BorderRotate>
              </motion.div>

              {/* Predictions table */}
              <div className="space-y-3 mb-4">
                {predictions.map(p => {
                  const pct = p.budgetAmount && p.budgetAmount > 0 ? Math.min((p.currentMonth / p.budgetAmount) * 100, 100) : 0;
                  const willExceed = p.budgetAmount && p.predictedEndOfMonth > p.budgetAmount;
                  return (
                    <BorderRotate key={p.category} className="p-4" animationSpeed={18}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{p.category}</span>
                          {trendIcons[p.trend]}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          p.confidence === "high" ? "bg-primary/20 text-primary" :
                          p.confidence === "medium" ? "bg-[hsl(45,96%,58%)]/20 text-[hsl(45,96%,58%)]" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {p.confidence === "high" ? "Fiable" : p.confidence === "medium" ? "Moyen" : "Peu de données"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                        <p>Dépensé : <span className="text-foreground font-medium">{formatAmount(p.currentMonth)} F</span></p>
                        <p>Prévu fin de mois : <span className="text-foreground font-medium">{formatAmount(Math.round(p.predictedEndOfMonth))} F</span></p>
                        <p>Moy. 3 mois : <span className="text-foreground font-medium">{formatAmount(Math.round(p.avgMonthly))} F</span></p>
                      </div>
                      {p.budgetAmount ? (
                        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-[hsl(30,90%,55%)]" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      ) : null}
                      {willExceed && (
                        <p className="text-[10px] text-[hsl(30,90%,55%)] mt-1">⚠️ Dépassement prévu</p>
                      )}
                    </BorderRotate>
                  );
                })}
              </div>

              {/* AI Insight */}
              <BorderRotate className="p-5" animationSpeed={14}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Conseil IA</h2>
                </div>
                {aiLoading ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyse en cours...</span>
                  </div>
                ) : aiInsight ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{aiInsight}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Pas de données suffisantes.</p>
                )}
              </BorderRotate>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default Reports;
