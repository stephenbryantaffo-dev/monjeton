import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

interface DashboardChartsProps {
  trendData: { name: string; amount: number }[];
  chartData: { name: string; amount: number; color: string }[];
  totalExpense: number;
  formatAmount: (n: number) => string;
  hasExpenses: boolean;
  trendMode: number;
  setTrendMode: (m: number) => void;
  trendModes: string[];
}

const DashboardCharts = ({
  trendData, chartData, totalExpense, formatAmount,
  hasExpenses, trendMode, setTrendMode, trendModes,
}: DashboardChartsProps) => {
  return (
    <>
      {hasExpenses && (
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
    </>
  );
};

export default DashboardCharts;
