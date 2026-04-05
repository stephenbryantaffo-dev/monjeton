import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import type { SpendingPrediction } from "@/lib/predictions";

interface Props {
  predictions: SpendingPrediction[];
  formatAmount: (n: number) => string;
}

const trendIcons = {
  up: <TrendingUp className="w-4 h-4 text-destructive" />,
  down: <TrendingDown className="w-4 h-4 text-primary" />,
  stable: <Minus className="w-4 h-4 text-muted-foreground" />,
};

const DashboardPredictions = ({ predictions, formatAmount }: Props) => {
  if (predictions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5 mb-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Aucun budget défini pour ce mois</p>
        <Link to="/budgets" className="text-primary text-sm font-medium">Définir un budget →</Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <h2 className="text-sm font-semibold text-foreground mb-3">Ce mois-ci — Prévisions</h2>
      <div className="space-y-3">
        {predictions.map((p, i) => {
          const pct = p.budgetAmount && p.budgetAmount > 0
            ? Math.min((p.currentMonth / p.budgetAmount) * 100, 100)
            : 0;
          const willExceed = p.budgetAmount && p.predictedEndOfMonth > p.budgetAmount;
          const exceedDay = willExceed && p.budgetAmount && p.currentMonth < p.budgetAmount
            ? (() => {
                const now = new Date();
                const dailyRate = now.getDate() > 0 ? p.currentMonth / now.getDate() : 0;
                if (dailyRate <= 0) return null;
                const daysToExceed = Math.ceil((p.budgetAmount - p.currentMonth) / dailyRate);
                const d = new Date();
                d.setDate(d.getDate() + daysToExceed);
                return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
              })()
            : null;

          const barColor = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-[hsl(30,90%,55%)]" : "bg-primary";

          return (
            <BorderRotate key={p.category} className="p-4" animationSpeed={18}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{p.category}</span>
                {trendIcons[p.trend]}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                <p>Dépensé : <span className="text-foreground font-medium">{formatAmount(p.currentMonth)} FCFA</span></p>
                <p>Prévu fin de mois : <span className="text-foreground font-medium">{formatAmount(Math.round(p.predictedEndOfMonth))} F</span></p>
                {p.budgetAmount ? (
                  <p>Budget : <span className="text-foreground font-medium">{formatAmount(p.budgetAmount)} FCFA</span></p>
                ) : null}
              </div>
              {p.budgetAmount ? (
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              ) : null}
              {willExceed && exceedDay && (
                <div className="flex items-center gap-1 mt-1.5">
                  <AlertTriangle className="w-3 h-3 text-[hsl(30,90%,55%)]" />
                  <span className="text-[10px] text-[hsl(30,90%,55%)] font-medium">
                    Risque dépassement le {exceedDay}
                  </span>
                </div>
              )}
              {willExceed && !exceedDay && p.currentMonth >= (p.budgetAmount || 0) && (
                <p className="text-[10px] text-destructive font-medium mt-1">Budget dépassé !</p>
              )}
            </BorderRotate>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DashboardPredictions;
