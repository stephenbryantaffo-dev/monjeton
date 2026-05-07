import { motion } from "framer-motion";
import { Banknote, Edit3, MessageCircle, Calendar } from "lucide-react";
import { formatThousands } from "@/lib/formatAmount";
import { useToast } from "@/hooks/use-toast";
import {
  InstallmentCalendar,
  type InstallmentItem,
} from "./InstallmentCalendar";

export interface DebtCardData {
  id: string;
  type: string; // 'owed_to_me' | 'i_owe'
  person_name: string;
  amount: number;
  paid_amount?: number;
  amount_remaining?: number | null;
  status: string;
  payment_type?: string | null;
  motif?: string | null;
  note?: string | null;
  whatsapp?: string | null;
  date_echeance?: string | null;
  due_date?: string | null;
  created_at: string;
  installments?: Array<{
    id: string;
    due_date: string;
    expected_amount: number;
    status: string;
  }>;
  debt_persons?: {
    id: string | null;
    name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
}

interface Props {
  debt: DebtCardData;
  index: number;
  onEdit: () => void;
  onPay: () => void;
}

const STATUS = {
  pending: { label: "En cours", color: "text-primary", bg: "bg-primary/10" },
  partial: { label: "Partiel", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  overdue: { label: "En retard", color: "text-destructive", bg: "bg-destructive/10" },
  paid: { label: "Payé ✓", color: "text-primary", bg: "bg-primary/20" },
  cancelled: { label: "Annulé", color: "text-muted-foreground", bg: "bg-secondary" },
} as const;

export const DebtCard = ({ debt, index, onEdit, onPay }: Props) => {
  const { toast } = useToast();
  const total = Number(debt.amount);
  const paid = Number(debt.paid_amount || 0);
  const remaining = Number(
    debt.amount_remaining != null ? debt.amount_remaining : total - paid,
  );
  const percent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const status =
    STATUS[(debt.status as keyof typeof STATUS) || "pending"] || STATUS.pending;
  const isPaid = debt.status === "paid";

  const sendWhatsApp = () => {
    const raw =
      debt.debt_persons?.whatsapp ||
      debt.debt_persons?.phone ||
      debt.whatsapp ||
      "";
    if (!raw) {
      toast({
        title: "Pas de numéro",
        description: "Aucun numéro disponible pour ce contact",
        variant: "destructive",
      });
      return;
    }
    const cleaned = raw.replace(/[^\d]/g, "");
    const finalPhone = cleaned.startsWith("225") ? cleaned : `225${cleaned}`;
    const msg =
      debt.type === "owed_to_me"
        ? `Bonjour ${debt.person_name},\n\nJe te rappelle que tu me dois *${formatThousands(remaining)} F* 🙏\n\n_Mon Jeton — monjeton.app_`
        : `Bonjour ${debt.person_name},\n\nJe dois encore te rembourser *${formatThousands(remaining)} F*.\n\n_Mon Jeton — monjeton.app_`;
    window.open(
      `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const nextDue = debt.installments?.find((i) =>
    ["pending", "partial", "overdue"].includes(i.status),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass rounded-xl border border-border/60 p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}
          >
            {status.label}
          </span>
          {debt.payment_type === "monthly" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              Mensuel
            </span>
          )}
          {debt.payment_type === "custom" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              Échéancier
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {new Date(debt.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-black tabular-nums leading-none">
            {formatThousands(remaining)} F
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            restant / {formatThousands(total)} F total
          </p>
        </div>
        {paid > 0 && (
          <p className="text-[11px] text-primary font-bold tabular-nums shrink-0">
            +{formatThousands(paid)} F payés
          </p>
        )}
      </div>

      {paid > 0 && (
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {(debt.note || debt.motif) && (
        <p className="text-xs text-muted-foreground italic line-clamp-2">
          {debt.note || debt.motif}
        </p>
      )}

      {nextDue && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {nextDue.status === "overdue" ? "⚠️ En retard : " : "Prochain : "}
          {formatThousands(nextDue.expected_amount)} F le{" "}
          {new Date(nextDue.due_date).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          })}
        </div>
      )}

      {!isPaid && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onPay}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <Banknote className="w-3.5 h-3.5" />
            Payer
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors"
            aria-label="Modifier"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={sendWhatsApp}
            className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors text-[#25D366]"
            aria-label="Rappel WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
};
