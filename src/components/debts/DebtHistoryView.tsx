import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  History,
  Edit3,
  CheckCircle2,
  MessageCircle,
  Banknote,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatThousands } from "@/lib/formatAmount";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  debtId: string;
  open: boolean;
  onClose: () => void;
}

interface HistoryRow {
  id: string;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  amount: number | null;
  note: string | null;
  created_at: string;
}

const actionConfig: Record<
  string,
  { icon: LucideIcon; label: string; color: string }
> = {
  created: { icon: Plus, label: "Dette créée", color: "text-primary" },
  edit: { icon: Edit3, label: "Modification", color: "text-yellow-500" },
  modified: { icon: Edit3, label: "Modification", color: "text-yellow-500" },
  payment_added: {
    icon: Banknote,
    label: "Paiement reçu",
    color: "text-primary",
  },
  reminder_sent: {
    icon: MessageCircle,
    label: "Rappel envoyé",
    color: "text-[#25D366]",
  },
  marked_paid: {
    icon: CheckCircle2,
    label: "Marquée payée",
    color: "text-primary",
  },
  installment_paid: {
    icon: CheckCircle2,
    label: "Versement payé",
    color: "text-primary",
  },
  status_change: {
    icon: CheckCircle2,
    label: "Changement de statut",
    color: "text-yellow-500",
  },
  cancelled: { icon: X, label: "Annulée", color: "text-destructive" },
};

const fieldLabels: Record<string, string> = {
  note: "Note",
  amount: "Montant",
  due_date: "Échéance",
  date_echeance: "Échéance",
  status: "Statut",
  installment: "Versement",
  amount_paid: "Paiement",
  motif: "Motif",
};

export const DebtHistoryView = ({ debtId, open, onClose }: Props) => {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("debt_history")
        .select("*")
        .eq("debt_id", debtId)
        .order("created_at", { ascending: false });
      setHistory((data as HistoryRow[]) || []);
      setLoading(false);
    };
    load();
  }, [debtId, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-border shadow-2xl bg-card max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black">Historique</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="text-xs text-muted-foreground text-center py-6">
                  Chargement…
                </div>
              ) : history.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6">
                  Aucun historique disponible
                </div>
              ) : (
                history.map((h, i) => {
                  const config = actionConfig[h.action] || {
                    icon: History,
                    label: h.action,
                    color: "text-muted-foreground",
                  };
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex gap-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 ${config.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 pb-3 border-b border-border/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold">
                            {config.label}
                          </span>
                          {h.amount && (
                            <span className="text-xs font-bold text-primary tabular-nums">
                              {formatThousands(h.amount)} F
                            </span>
                          )}
                        </div>
                        {h.field && h.old_value && h.new_value && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {fieldLabels[h.field] || h.field} :{" "}
                            <span className="line-through">{h.old_value}</span>
                            {" → "}
                            <span className="text-foreground">
                              {h.new_value}
                            </span>
                          </p>
                        )}
                        {h.note && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                            {h.note}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(h.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
