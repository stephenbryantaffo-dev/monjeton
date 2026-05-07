import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { DebtCardData } from "./DebtCard";

interface Props {
  debt: DebtCardData | null;
  userId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const EditDebtModal = ({
  debt,
  userId,
  open,
  onClose,
  onSaved,
}: Props) => {
  const { toast } = useToast();
  const [editNote, setEditNote] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (debt && open) {
      setEditNote(debt.note || debt.motif || "");
      setEditDueDate(debt.date_echeance || debt.due_date || "");
      setEditAmount(Number(debt.amount));
    }
  }, [debt, open]);

  if (!debt) return null;
  const paidAlready = Number(debt.paid_amount || 0) > 0;

  const save = async () => {
    setSaving(true);
    const changes: Array<{
      field: string;
      old_value: string | null;
      new_value: string | null;
      amount?: number;
    }> = [];

    if (editNote !== (debt.note || "")) {
      changes.push({
        field: "note",
        old_value: debt.note || null,
        new_value: editNote || null,
      });
    }
    const oldDue = debt.date_echeance || debt.due_date || "";
    if (editDueDate !== oldDue) {
      changes.push({
        field: "due_date",
        old_value: oldDue || null,
        new_value: editDueDate || null,
      });
    }
    if (!paidAlready && editAmount !== Number(debt.amount)) {
      changes.push({
        field: "amount",
        old_value: String(debt.amount),
        new_value: String(editAmount),
        amount: editAmount,
      });
    }

    if (changes.length === 0) {
      onClose();
      setSaving(false);
      return;
    }

    const updateData: Record<string, unknown> = {
      note: editNote || null,
      date_echeance: editDueDate || null,
      due_date: editDueDate || null,
      updated_at: new Date().toISOString(),
    };
    if (!paidAlready && editAmount !== Number(debt.amount)) {
      updateData.amount = editAmount;
      updateData.amount_remaining = editAmount;
    }

    const { error } = await supabase
      .from("debts")
      .update(updateData)
      .eq("id", debt.id);
    if (error) {
      setSaving(false);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    for (const c of changes) {
      await supabase.from("debt_history").insert({
        debt_id: debt.id,
        user_id: userId,
        action: "edit",
        field: c.field,
        old_value: c.old_value,
        new_value: c.new_value,
        amount: c.amount ?? null,
        note: `Modification de ${c.field}`,
      });
    }

    setSaving(false);
    toast({ title: "Dette mise à jour ✅" });
    onSaved();
    onClose();
  };

  const cancel = async () => {
    if (!confirm("Annuler définitivement cette dette ?")) return;
    const { error } = await supabase
      .from("debts")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", debt.id);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    await supabase.from("debt_history").insert({
      debt_id: debt.id,
      user_id: userId,
      action: "status_change",
      field: "status",
      old_value: debt.status,
      new_value: "cancelled",
      note: "Dette annulée",
    });
    toast({ title: "Dette annulée" });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card border-border mx-4 rounded-2xl">
        <DialogTitle className="text-base font-black">
          Modifier la dette
        </DialogTitle>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Montant total
            </Label>
            <MoneyInput
              value={editAmount}
              onChange={setEditAmount}
              showCurrency
              disabled={paidAlready}
              className="[&>input]:bg-secondary [&>input]:border-border"
            />
            {paidAlready && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Paiement déjà enregistré — montant non modifiable
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Date d'échéance
            </Label>
            <Input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Note
            </Label>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={cancel}
            >
              Annuler la dette
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            <Button variant="hero" onClick={save} disabled={saving}>
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
