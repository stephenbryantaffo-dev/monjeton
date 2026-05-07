import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatThousands } from "@/lib/formatAmount";
import { applyPaymentToInstallments } from "@/lib/debtHistory";
import type { DebtCardData } from "./DebtCard";

interface Props {
  debt: DebtCardData | null;
  userId: string;
  open: boolean;
  targetInstallment?: {
    id: string;
    expected_amount: number;
    paid_amount?: number;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

const METHODS = [
  { key: "cash", label: "💵 Cash" },
  { key: "wave", label: "📱 Wave" },
  { key: "orange", label: "🟠 Orange" },
  { key: "bank", label: "🏦 Banque" },
];

export const PaymentModal = ({
  debt,
  userId,
  open,
  targetInstallment,
  onClose,
  onSaved,
}: Props) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && debt) {
      const presetAmount = targetInstallment
        ? Math.max(
            0,
            Number(targetInstallment.expected_amount) -
              Number(targetInstallment.paid_amount || 0),
          )
        : 0;
      setAmount(presetAmount);
      setDate(new Date().toISOString().slice(0, 10));
      setMethod("cash");
      setNote("");
    }
  }, [open, debt, targetInstallment]);

  if (!debt) return null;
  const remaining = Number(
    debt.amount_remaining != null
      ? debt.amount_remaining
      : debt.amount - (debt.paid_amount || 0),
  );

  const submit = async () => {
    if (amount <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    if (amount > remaining) {
      toast({
        title: "Dépassement",
        description: `Max ${formatThousands(remaining)} F`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("debt_payments").insert({
      debt_id: debt.id,
      user_id: userId,
      amount,
      payment_date: date,
      payment_method: method,
      note: note || null,
    });
    if (error) {
      setSaving(false);
      toast({
        title: "Erreur paiement",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Affecter aux échéances et logger
    await applyPaymentToInstallments(debt.id, amount);
    await supabase.from("debt_history").insert({
      debt_id: debt.id,
      user_id: userId,
      action: "edit",
      field: "amount_paid",
      new_value: String(amount),
      amount,
      note: note || `Paiement ${method}`,
    });

    setSaving(false);
    toast({
      title: "Paiement enregistré ✅",
      description: `${formatThousands(amount)} F via ${method}`,
    });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card border-border mx-4 rounded-2xl">
        <DialogTitle className="text-base font-black">
          Enregistrer un paiement
        </DialogTitle>
        <p className="text-xs text-muted-foreground -mt-1">
          {debt.person_name} · Reste {formatThousands(remaining)} F
        </p>

        <div className="space-y-3 mt-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-muted-foreground">
                Montant payé
              </Label>
              <button
                type="button"
                onClick={() => setAmount(remaining)}
                className="text-[11px] text-primary underline"
              >
                Paiement complet
              </button>
            </div>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              autoFocus
              max={remaining}
              className="[&>input]:bg-secondary [&>input]:border-border"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Mode de paiement
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                    method === m.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Note (optionnel)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className="bg-secondary border-border"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={submit}
              disabled={saving || amount <= 0}
            >
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
