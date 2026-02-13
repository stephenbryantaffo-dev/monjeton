import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, TrendingDown, Wallet, ShoppingBag, Utensils, Car, Smartphone, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";

const MOCK_CATEGORIES = [
  { name: "Alimentation", amount: 45000, color: "hsl(84, 81%, 44%)", icon: Utensils },
  { name: "Transport", amount: 30000, color: "hsl(270, 70%, 60%)", icon: Car },
  { name: "Téléphone", amount: 15000, color: "hsl(45, 96%, 58%)", icon: Smartphone },
  { name: "Shopping", amount: 25000, color: "hsl(200, 70%, 50%)", icon: ShoppingBag },
  { name: "Factures", amount: 20000, color: "hsl(0, 70%, 55%)", icon: Zap },
];

const MOCK_TRANSACTIONS = [
  { id: 1, category: "Alimentation", icon: Utensils, amount: -5000, date: "Aujourd'hui", note: "Déjeuner Maquis" },
  { id: 2, category: "Transport", icon: Car, amount: -2000, date: "Aujourd'hui", note: "Taxi Yopougon" },
  { id: 3, category: "Revenu", icon: Wallet, amount: 150000, date: "Hier", note: "Salaire" },
  { id: 4, category: "Téléphone", icon: Smartphone, amount: -5000, date: "Hier", note: "Forfait Orange" },
];

const periods = ["Semaine", "Mois", "Année"];

const Dashboard = () => {
  const totalSpent = MOCK_CATEGORIES.reduce((sum, c) => sum + c.amount, 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="pt-6 pb-4">
        <p className="text-muted-foreground text-sm">Bonjour 👋</p>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-6">
        {periods.map((p, i) => (
          <button
            key={p}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              i === 1 ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Revenus</span>
          </div>
          <p className="text-xl font-bold text-foreground">150 000</p>
          <p className="text-xs text-muted-foreground">FCFA</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Dépenses</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalSpent.toLocaleString("fr-FR")}</p>
          <p className="text-xs text-muted-foreground">FCFA</p>
        </motion.div>
      </div>

      {/* Donut Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-5 mb-6"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Répartition des dépenses</h2>
        <div className="relative w-48 h-48 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={MOCK_CATEGORIES}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="amount"
                stroke="none"
              >
                {MOCK_CATEGORIES.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{totalSpent.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {MOCK_CATEGORIES.map((c) => (
            <div key={c.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-muted-foreground">{c.name}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Transactions récentes</h2>
          <Link to="/transactions" className="text-xs text-primary">Voir tout</Link>
        </div>

        <div className="space-y-2">
          {MOCK_TRANSACTIONS.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="glass-card rounded-xl p-3 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                t.amount > 0 ? "bg-primary/20" : "bg-secondary"
              }`}>
                <t.icon className={`w-5 h-5 ${t.amount > 0 ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.note}</p>
                <p className="text-xs text-muted-foreground">{t.category} · {t.date}</p>
              </div>
              <span className={`text-sm font-semibold ${t.amount > 0 ? "text-primary" : "text-foreground"}`}>
                {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("fr-FR")}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
