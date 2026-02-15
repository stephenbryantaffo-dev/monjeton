import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { CardSkeleton, ListItemSkeleton } from "@/components/DashboardSkeleton";

interface TodaySectionProps {
  todayIncome: number;
  todayExpense: number;
  todayTransactions: any[];
  loading: boolean;
}

const todayLabel = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

const TodaySection = ({ todayIncome, todayExpense, todayTransactions, loading }: TodaySectionProps) => {
  const { formatAmount } = usePrivacy();

  if (loading) {
    return (
      <div className="mb-6">
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-3" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ListItemSkeleton />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-foreground mb-3">
        Aujourd'hui · {todayLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[11px] text-muted-foreground">Dépenses</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatAmount(todayExpense)}</p>
          <p className="text-[10px] text-muted-foreground">FCFA</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground">Revenus</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatAmount(todayIncome)}</p>
          <p className="text-[10px] text-muted-foreground">FCFA</p>
        </motion.div>
      </div>

      {todayTransactions.length === 0 ? (
        <p className="text-center text-muted-foreground text-xs py-3">Aucune transaction aujourd'hui</p>
      ) : (
        <div className="space-y-2">
          {todayTransactions.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }} className="glass-card rounded-xl p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.type === "income" ? "bg-primary/20" : "bg-secondary"}`}>
                <Wallet className={`w-4 h-4 ${t.type === "income" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.note || (t.categories as any)?.name || "Transaction"}</p>
                <p className="text-xs text-muted-foreground">{(t.categories as any)?.name}</p>
              </div>
              <span className={`text-sm font-semibold ${t.type === "income" ? "text-primary" : "text-foreground"}`}>
                {t.type === "income" ? "+" : "-"}{formatAmount(Number(t.amount))}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodaySection;
