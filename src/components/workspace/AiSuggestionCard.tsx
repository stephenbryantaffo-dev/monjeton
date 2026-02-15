import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Check, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AiSuggestion {
  amount: number;
  currency: string;
  converted_amount_xof: number | null;
  exchange_rate: number | null;
  exchange_rate_source: string | null;
  date: string;
  merchant: string;
  type: string;
  category: string;
  wallet: string;
}

interface Props {
  suggestion: AiSuggestion;
  workspaceId: string;
  userId: string;
  onCreated?: () => void;
}

const AiSuggestionCard = ({ suggestion, workspaceId, userId, onCreated }: Props) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(suggestion);
  const [creating, setCreating] = useState(false);

  const displayAmount = form.converted_amount_xof ?? form.amount;
  const isConverted = form.currency?.toUpperCase() !== "XOF" && form.converted_amount_xof != null;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        workspace_id: workspaceId,
        user_id: userId,
        created_by: userId,
        type: form.type || "expense",
        amount: displayAmount,
        original_amount: isConverted ? form.amount : null,
        original_currency: isConverted ? form.currency : null,
        exchange_rate_used: form.exchange_rate,
        exchange_rate_source: form.exchange_rate_source,
        converted_amount_xof: form.converted_amount_xof,
        merchant_name: form.merchant,
        note: `OCR auto – ${form.merchant}`,
        date: form.date || new Date().toISOString().split("T")[0],
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Transaction créée ✅", description: `${displayAmount.toLocaleString()} XOF — ${form.merchant}` });
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5 max-w-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Bot className="w-5 h-5" />
          <span className="text-sm font-semibold">Suggestion IA — Créer une {form.type === "income" ? "recette" : "dépense"} ?</span>
        </div>

        {!editing ? (
          <div className="space-y-1.5 text-sm">
            {isConverted && (
              <p className="text-muted-foreground">
                💱 Montant original : <strong>{form.amount.toLocaleString()} {form.currency}</strong>
              </p>
            )}
            <p>💰 Montant : <strong>{displayAmount.toLocaleString()} XOF</strong></p>
            {form.exchange_rate && isConverted && (
              <p className="text-muted-foreground text-xs">Taux : 1 {form.currency} = {form.exchange_rate} XOF</p>
            )}
            <p>🏪 Commerçant : <strong>{form.merchant || "—"}</strong></p>
            <p>📅 Date : <strong>{form.date || "—"}</strong></p>
            <p>🏷️ Catégorie : <strong>{form.category || "—"}</strong></p>
            <p>💳 Wallet : <strong>{form.wallet || "—"}</strong></p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div>
              <Label className="text-xs">Montant ({form.currency})</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="h-8 bg-secondary/50" />
            </div>
            <div>
              <Label className="text-xs">Commerçant</Label>
              <Input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} className="h-8 bg-secondary/50" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-8 bg-secondary/50" />
            </div>
            <div>
              <Label className="text-xs">Catégorie</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="h-8 bg-secondary/50" />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleCreate} disabled={creating} className="gradient-primary text-primary-foreground flex-1">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Créer {form.type === "income" ? "recette" : "dépense"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)} className="shrink-0">
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiSuggestionCard;
