import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logDebtChange } from "@/lib/debtHistory";
import { DatePickerField } from "@/components/ui/DatePickerField";

interface DebtRow {
  id: string;
  user_id?: string;
  person_name?: string;
  amount: number;
  motif: string | null;
  note: string | null;
  date_echeance: string | null;
  whatsapp: string | null;
}

interface Props {
  debt: DebtRow | null;
  userId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const EditDebtDialog = ({ debt, userId, open, onClose, onSaved }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    motif: "",
    note: "",
    date_echeance: "",
    whatsapp: "",
  });

  useEffect(() => {
    if (debt && open) {
      setForm({
        amount: String(debt.amount),
        motif: debt.motif || "",
        note: debt.note || "",
        date_echeance: debt.date_echeance || "",
        whatsapp: debt.whatsapp || "",
      });
    }
  }, [debt, open]);

  if (!debt) return null;

  const save = async () => {
    setSaving(true);
    const newAmount = Number(form.amount);
    const updates: Record<string, unknown> = {
      amount: newAmount,
      motif: form.motif.trim() || null,
      note: form.note.trim() || null,
      date_echeance: form.date_echeance || null,
      due_date: form.date_echeance || null,
      whatsapp: form.whatsapp.trim() || null,
    };

    const { error } = await supabase.from("debts").update(updates).eq("id", debt.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Log history per changed field
    const changes: Array<[string, unknown, unknown]> = [
      ["amount", debt.amount, newAmount],
      ["motif", debt.motif, updates.motif],
      ["note", debt.note, updates.note],
      ["date_echeance", debt.date_echeance, updates.date_echeance],
      ["whatsapp", debt.whatsapp, updates.whatsapp],
    ];
    for (const [field, oldV, newV] of changes) {
      if (String(oldV ?? "") !== String(newV ?? "")) {
        await logDebtChange({
          debtId: debt.id,
          userId,
          action: "edit",
          field,
          oldValue: oldV as string | number | null,
          newValue: newV as string | number | null,
        });
      }
    }

    setSaving(false);
    toast({ title: "Dette modifiée ✅" });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card border-border mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-black">Modifier la dette</DialogTitle>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Montant total (F CFA)
            </Label>
            <MoneyInput
              value={form.amount}
              onChange={(n) => setForm((f) => ({ ...f, amount: n ? String(n) : "" }))}
              showCurrency={false}
              className="[&>input]:bg-secondary [&>input]:border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Motif</Label>
            <Input
              value={form.motif}
              onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
              className="bg-secondary border-border"
              maxLength={200}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Date d'échéance
            </Label>
            <DatePickerField value={form.date_echeance} onChange={(v) => setForm((f) => ({ ...f, date_echeance: v }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              className="bg-secondary border-border"
              maxLength={20}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Note</Label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={3}
              maxLength={500}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              disabled={saving || !form.amount}
              onClick={save}
            >
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ReloanProps {
  debt: DebtRow | null;
  userId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ReloanDialog = ({ debt, userId, open, onClose, onSaved }: ReloanProps) => {
  const { toast } = useToast();
  const [extra, setExtra] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!debt) return null;

  const save = async () => {
    const val = Number(extra);
    if (!val || val <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    setSaving(true);
    const newAmount = Number(debt.amount) + val;
    const { error } = await supabase
      .from("debts")
      .update({ amount: newAmount, status: "pending" })
      .eq("id", debt.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    await logDebtChange({
      debtId: debt.id,
      userId,
      action: "loan_increased",
      field: "amount",
      oldValue: debt.amount,
      newValue: newAmount,
      note: reason || `Re-prêt de ${val} F`,
    });
    setSaving(false);
    setExtra("");
    setReason("");
    toast({ title: "Re-prêt enregistré ✅" });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card border-border mx-4 rounded-2xl">
        <DialogTitle className="text-lg font-black">
          Re-prêter à {debt.person_name || "ce contact"}
        </DialogTitle>
        <p className="text-xs text-muted-foreground -mt-1">
          Ajoute un montant supplémentaire à cette dette existante.
        </p>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Montant additionnel
            </Label>
            <MoneyInput
              value={extra}
              onChange={(n) => setExtra(n ? String(n) : "")}
              showCurrency={false}
              autoFocus
              className="[&>input]:bg-secondary [&>input]:border-border"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Motif (optionnel)
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: 2ème prêt pour scolarité"
              className="bg-secondary border-border"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              disabled={saving || !extra}
              onClick={save}
            >
              {saving ? "..." : "Confirmer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
