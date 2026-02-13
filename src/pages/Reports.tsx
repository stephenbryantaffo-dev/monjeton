import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";

const categoryData = [
  { name: "Alimentation", value: 45000, color: "hsl(84, 81%, 44%)" },
  { name: "Transport", value: 30000, color: "hsl(270, 70%, 60%)" },
  { name: "Téléphone", value: 15000, color: "hsl(45, 96%, 58%)" },
  { name: "Shopping", value: 25000, color: "hsl(200, 70%, 50%)" },
  { name: "Factures", value: 20000, color: "hsl(0, 70%, 55%)" },
];

const monthlyData = [
  { month: "Sep", depenses: 95000, revenus: 150000 },
  { month: "Oct", depenses: 120000, revenus: 150000 },
  { month: "Nov", depenses: 85000, revenus: 160000 },
  { month: "Déc", depenses: 145000, revenus: 180000 },
  { month: "Jan", depenses: 110000, revenus: 155000 },
  { month: "Fév", depenses: 135000, revenus: 150000 },
];

const Reports = () => {
  const total = categoryData.reduce((s, c) => s + c.value, 0);

  return (
    <DashboardLayout title="Rapports">
      {/* Pie chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 mb-4"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Dépenses par catégorie</h2>
        <div className="relative w-44 h-44 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold text-foreground">{total.toLocaleString("fr-FR")}</p>
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
              <span className="text-sm text-muted-foreground">{c.value.toLocaleString("fr-FR")} F</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5"
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Évolution mensuelle</h2>
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
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Revenus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground">Dépenses</span>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Reports;
