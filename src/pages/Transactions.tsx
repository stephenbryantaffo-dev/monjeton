import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Filter, Search } from "lucide-react";
import { Utensils, Car, Smartphone, ShoppingBag, Zap, Wallet } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";

const MOCK = [
  { id: 1, category: "Alimentation", icon: Utensils, amount: -5000, date: "13 Fév 2026", note: "Déjeuner Maquis" },
  { id: 2, category: "Transport", icon: Car, amount: -2000, date: "13 Fév 2026", note: "Taxi Yopougon" },
  { id: 3, category: "Revenu", icon: Wallet, amount: 150000, date: "12 Fév 2026", note: "Salaire Février" },
  { id: 4, category: "Téléphone", icon: Smartphone, amount: -5000, date: "12 Fév 2026", note: "Forfait Orange" },
  { id: 5, category: "Shopping", icon: ShoppingBag, amount: -15000, date: "11 Fév 2026", note: "Vêtements Treichville" },
  { id: 6, category: "Factures", icon: Zap, amount: -8000, date: "10 Fév 2026", note: "Électricité CIE" },
];

const Transactions = () => {
  return (
    <DashboardLayout title="Transactions">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-10 bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        {MOCK.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i }}
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
              {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("fr-FR")} F
            </span>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
