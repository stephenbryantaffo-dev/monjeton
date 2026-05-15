import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown } from "lucide-react";
import { formatMoneyDisplay } from "@/lib/formatAmount";

export interface InstallmentItem {
  id: string;
  due_date: string;
  expected_amount: number;
  paid_amount?: number;
  paid_date?: string | null;
  status: string;
  installment_number?: number | null;
}

interface Props {
  installments: InstallmentItem[];
  onPayInstallment: (inst: InstallmentItem) => void;
}

const STATUS_CFG: Record<
  string,
  { emoji: string; color: string; bg: string }
> = {
  pending: {
    emoji: "⏳",
    color: "text-muted-foreground",
    bg: "bg-secondary",
  },
  partial: {
    emoji: "🔄",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  paid: { emoji: "✅", color: "text-primary", bg: "bg-primary/10" },
  overdue: {
    emoji: "🚨",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
};

export const InstallmentCalendar = ({ installments, onPayInstallment }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const total = installments.length;
  const paidCount = installments.filter((i) => i.status === "paid").length;
  const pct = total > 0 ? (paidCount / total) * 100 : 0;

  if (total === 0) return null;

  return (
    <div className="rounded-xl bg-secondary/30 border border-border/50 p-2.5 space-y-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-bold">
            {paidCount}/{total} versement{total > 1 ? "s" : ""}
          </span>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1">
              {installments.map((inst) => {
                const cfg = STATUS_CFG[inst.status] || STATUS_CFG.pending;
                const isPaid = inst.status === "paid";
                const isOverdue = inst.status === "overdue";
                return (
                  <div
                    key={inst.id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${cfg.bg}`}
                  >
                    <span className="text-base shrink-0">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold tabular-nums ${cfg.color}`}>
                        {formatMoneyDisplay(inst.expected_amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(inst.due_date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {inst.paid_date && (
                          <span>
                            {" · Payé le "}
                            {new Date(inst.paid_date).toLocaleDateString(
                              "fr-FR",
                              { day: "2-digit", month: "short" },
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                    {!isPaid && (
                      <button
                        onClick={() => onPayInstallment(inst)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                          isOverdue
                            ? "bg-destructive text-white"
                            : "gradient-primary text-primary-foreground"
                        }`}
                      >
                        Payer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
