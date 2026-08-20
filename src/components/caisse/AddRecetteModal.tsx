import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RECETTE_SOURCES } from "./types";

interface AddRecetteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caisseId: string;
  onSaved: () => void | Promise<void>;
}

const AddRecetteModal = ({ open, onOpenChange, caisseId, onSaved }: AddRecetteModalProps) => {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [source, setSource] = useState("billetterie");
  const [quantite, setQuantite] = useState("");
  const [quantitePrevue, setQuantitePrevue] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [amount, setAmount] = useState("");
  const [recetteDate, setRecetteDate] = useState(new Date().toISOString().split("T")[0]);
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const showQuantite = source === "billetterie" || source === "vente";
  const showQuantitePrevue = source === "billetterie";
  const qte = Number(quantite);
  const qtePrevue = showQuantitePrevue && quantitePrevue ? Number(quantitePrevue) : null;
  const pu = Number(prixUnitaire);
  // Le montant se calcule TOUJOURS sur la quantité vendue : seuls les billets
  // réellement vendus rapportent de l'argent.
  const autoAmount = showQuantite && qte > 0 && pu > 0 ? qte * pu : null;
  const overSold = qtePrevue !== null && qtePrevue > 0 && qte > qtePrevue;
  const finalAmount = autoAmount ?? Number(amount);

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setSource("billetterie");
    setQuantite("");
    setQuantitePrevue("");
    setPrixUnitaire("");
    setAmount("");
    setRecetteDate(new Date().toISOString().split("T")[0]);
    setContact("");
    setNote("");
  }, [open]);

  const fillRate = qte > 0 && qtePrevue && qtePrevue > 0 ? Math.round((qte / qtePrevue) * 100) : null;

  const save = async () => {
    if (!label.trim() || !finalAmount || finalAmount <= 0 || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("caisse_recettes" as any).insert({
        caisse_id: caisseId,
        label: label.trim(),
        source,
        quantite: autoAmount !== null ? qte : null,
        quantite_prevue: showQuantite && qtePrevue && qtePrevue > 0 ? qtePrevue : null,
        prix_unitaire: autoAmount !== null ? pu : null,
        amount: finalAmount,
        recette_date: recetteDate,
        contact: contact.trim() || null,
        note: note.trim() || null,
      } as any);
      if (error) throw error;

      // Recalculer le total des recettes de la caisse
      const { data: rows } = await supabase
        .from("caisse_recettes" as any)
        .select("amount")
        .eq("caisse_id", caisseId);
      const total = (rows || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
      await supabase.from("caisses" as any).update({ total_recettes: total } as any).eq("id", caisseId);

      toast({ title: "Recette enregistrée", description: `${label.trim()} — ${finalAmount.toLocaleString("fr-FR")}` });
      onOpenChange(false);
      await onSaved();
    } catch (err: any) {
      toast({ title: "Erreur recette", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Enregistrer une recette</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Billets prévente, Sponsor Orange CI..." className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label>Source</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {RECETTE_SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSource(s.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium text-left transition-colors ${source === s.id ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {showQuantite && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantité</Label>
                <Input inputMode="numeric" value={quantite} onChange={(e) => setQuantite(e.target.value.replace(/\D/g, ""))} placeholder="Ex: 120" className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label>Prix unitaire</Label>
                <MoneyInput value={prixUnitaire} onChange={(n) => setPrixUnitaire(n ? String(n) : "")} showCurrency={false} className="mt-1 [&>input]:bg-secondary [&>input]:border-border" />
              </div>
              {showQuantitePrevue && (
                <div>
                  <Label>Quantité prévue (optionnel)</Label>
                  <Input inputMode="numeric" value={quantitePrevue} onChange={(e) => setQuantitePrevue(e.target.value.replace(/\D/g, ""))} placeholder="Ex: 200" className="bg-secondary border-border mt-1" />
                </div>
              )}
            </div>
          )}
          {overSold && (
            <p className="text-xs text-destructive">Tu ne peux pas vendre plus de billets que prévu.</p>
          )}
          <div>
            <Label>Montant (F CFA)</Label>
            {autoAmount !== null ? (
              <>
                <Input readOnly value={autoAmount.toLocaleString("fr-FR")} className="bg-secondary border-border mt-1 text-primary font-bold" />
                <p className="text-xs text-muted-foreground mt-1">{qte} × {pu.toLocaleString("fr-FR")} F — calculé automatiquement</p>
                {fillRate !== null && (
                  <p className="text-xs text-primary mt-1">Taux de remplissage : {fillRate}% ({qte}/{qtePrevue})</p>
                )}
              </>
            ) : (
              <MoneyInput value={amount} onChange={(n) => setAmount(n ? String(n) : "")} showCurrency={false} className="mt-1 [&>input]:bg-secondary [&>input]:border-border" />
            )}
          </div>
          <div>
            <Label>Date</Label>
            <DatePickerField value={recetteDate} onChange={setRecetteDate} className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label>Contact (optionnel)</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nom du sponsor ou du responsable" className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label>Note (optionnel)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Détails supplémentaires..." className="bg-secondary border-border mt-1" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 glass">Annuler</Button>
            <Button onClick={save} disabled={saving || !label.trim() || !finalAmount || finalAmount <= 0}
              className="flex-1 gradient-primary text-primary-foreground">
              Enregistrer la recette
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecetteModal;
