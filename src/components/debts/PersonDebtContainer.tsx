import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { formatMoneyDisplay } from "@/lib/formatAmount";
import { DebtCard, type DebtCardData } from "./DebtCard";
import type { InstallmentItem } from "./InstallmentCalendar";

export interface PersonGroup {
  person: {
    id: string | null;
    name: string;
    phone: string | null;
    whatsapp?: string | null;
    photo_uri: string | null;
  };
  debts: DebtCardData[];
}

interface Props {
  group: PersonGroup;
  onEdit: (debt: DebtCardData) => void;
  onPay: (debt: DebtCardData, installment?: InstallmentItem) => void;
}

export const PersonDebtContainer = ({ group, onEdit, onPay }: Props) => {
  const [expanded, setExpanded] = useState(true);
  const { person, debts } = group;

  const totalOwed = debts
    .filter((d) => d.type === "owed_to_me" && d.status !== "paid")
    .reduce(
      (s, d) =>
        s +
        Number(
          d.amount_remaining != null
            ? d.amount_remaining
            : d.amount - (d.paid_amount || 0),
        ),
      0,
    );
  const totalIOwe = debts
    .filter((d) => d.type === "i_owe" && d.status !== "paid")
    .reduce(
      (s, d) =>
        s +
        Number(
          d.amount_remaining != null
            ? d.amount_remaining
            : d.amount - (d.paid_amount || 0),
        ),
      0,
    );
  const hasOverdue = debts.some((d) => d.status === "overdue");
  const activePending = debts.filter((d) => d.status !== "paid").length;

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {person.photo_uri ? (
            <img
              src={person.photo_uri}
              alt={person.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-base font-black text-primary">
              {(person.name || "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-sm truncate">{person.name}</h3>
            {hasOverdue && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                En retard
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px]">
            {totalOwed > 0 && (
              <span className="text-primary font-bold tabular-nums">
                Te doit {formatMoneyDisplay(totalOwed)}
              </span>
            )}
            {totalIOwe > 0 && (
              <span className="text-destructive font-bold tabular-nums">
                Tu dois {formatMoneyDisplay(totalIOwe)}
              </span>
            )}
            {totalOwed === 0 && totalIOwe === 0 && (
              <span className="text-muted-foreground">Tout est réglé ✓</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activePending > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary">
              {activePending}
            </span>
          )}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2 border-t border-border/50">
              {debts.map((d, i) => (
                <DebtCard
                  key={d.id}
                  debt={d}
                  index={i}
                  onEdit={() => onEdit(d)}
                  onPay={(inst) => onPay(d, inst)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
