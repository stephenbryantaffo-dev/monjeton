import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BudgetAlert } from "@/lib/budgetAlerts";

interface Props {
  alerts: BudgetAlert[];
}

const BudgetAlertBanner = ({ alerts }: Props) => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed || alerts.length === 0) return null;

  const top = alerts[0];
  const othersCount = alerts.length - 1;

  const levelStyles = {
    warning: "bg-[hsl(45,96%,58%)]/15 border-[hsl(45,96%,58%)]/40 text-[hsl(45,96%,58%)]",
    danger: "bg-destructive/15 border-destructive/40 text-destructive",
    exceeded: "bg-destructive/20 border-destructive/50 text-destructive animate-pulse",
  };

  const icons = { warning: "⚠️", danger: "🔴", exceeded: "🚨" };
  const btnLabel = {
    warning: "Voir budget",
    danger: "Ajuster",
    exceeded: "Voir rapport",
  };
  const btnTarget = {
    warning: "/budgets",
    danger: "/budgets",
    exceeded: "/reports",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`rounded-xl border p-3 mb-4 ${levelStyles[top.level]}`}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg shrink-0">{icons[top.level]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{top.message}</p>
            {othersCount > 0 && (
              <p className="text-xs opacity-70 mt-0.5">+{othersCount} autre{othersCount > 1 ? "s" : ""} alerte{othersCount > 1 ? "s" : ""}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate(btnTarget[top.level])}
              className="text-xs font-semibold flex items-center gap-1 hover:underline"
            >
              {btnLabel[top.level]} <ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={() => setDismissed(true)} className="p-1 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BudgetAlertBanner;
