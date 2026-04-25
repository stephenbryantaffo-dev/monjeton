import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { FREQ_LABELS, FREQ_ICONS } from "./types";
import { generateCycleInfo, fmt } from "./utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

interface DraftMember {
  name: string;
  phone: string;
  is_owner: boolean;
}

const FREQUENCIES = ["weekly", "monthly", "quarterly", "annual", "custom"] as const;

const CreateTontineModal = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [frequency, setFrequency] = useState("monthly");
  const [customDays, setCustomDays] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberIsOwner, setMemberIsOwner] = useState(false);

  const reset = () => {
    setStep(1);
    setName("");
    setAmount("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setFrequency("monthly");
    setCustomDays("");
    setMembers([]);
    setMemberName("");
    setMemberPhone("");
    setMemberIsOwner(false);
  };

  const addMember = () => {
    if (!memberName.trim()) return;
    setMembers((prev) => [...prev, { name: memberName.trim(), phone: memberPhone.trim(), is_owner: memberIsOwner }]);
    setMemberName("");
    setMemberPhone("");
    setMemberIsOwner(false);
  };

  const removeMember = (i: number) => setMembers((prev) => prev.filter((_, idx) => idx !== i));

  const canNext = () => {
    if (step === 1) return name.trim() && Number(amount) > 0 && startDate;
    if (step === 2) return frequency && (frequency !== "custom" || Number(customDays) > 0);
    if (step === 3) return members.length >= 2;
    return true;
  };

  const totalPerCycle = members.length * Number(amount || 0);

  const create = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const tontinePayload: any = {
        user_id: user.id,
        name: name.trim(),
        contribution_amount: Number(amount),
        frequency,
        custom_frequency_days: frequency === "custom" ? Number(customDays) : null,
        start_date: startDate,
      };

      const { data: tontine, error: tErr } = await supabase
        .from("tontines" as any)
        .insert(tontinePayload)
        .select()
        .single();
      if (tErr || !tontine) {
        console.error("[Tontine] insert tontine failed", tErr);
        throw new Error(tErr?.message || "Création de la tontine impossible");
      }

      const tontineId = (tontine as any).id;

      const membersPayload = members.map((m) => ({
        tontine_id: tontineId,
        name: m.name,
        phone: m.phone || null,
        is_owner: m.is_owner,
      }));
      const { error: mErr } = await supabase.from("tontine_members" as any).insert(membersPayload);
      if (mErr) {
        console.error("[Tontine] insert members failed", mErr);
        // rollback orphan tontine to avoid blocked UI
        await supabase.from("tontines" as any).delete().eq("id", tontineId);
        throw new Error(`Membres non enregistrés : ${mErr.message}`);
      }

      const cycleInfo = generateCycleInfo(
        { ...tontinePayload, id: tontineId } as any,
        1,
        members.length
      );
      const { error: cErr } = await supabase.from("tontine_cycles" as any).insert({
        tontine_id: tontineId,
        ...cycleInfo,
      });
      if (cErr) {
        console.error("[Tontine] insert cycle failed", cErr);
        await supabase.from("tontine_members" as any).delete().eq("tontine_id", tontineId);
        await supabase.from("tontines" as any).delete().eq("id", tontineId);
        throw new Error(`Premier cycle non créé : ${cErr.message}`);
      }

      toast({ title: "Tontine créée ✅", description: `${members.length} membres · cycle 1 ouvert` });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erreur de création",
        description: e?.message || "Réessayez ou contactez le support.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle tontine — Étape {step}/4</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nom de la tontine</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tontine des cousins" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Montant de cotisation (FCFA)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date de début</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="glass" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choisissez la fréquence des cotisations</p>
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  frequency === f
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <span className="mr-2">{FREQ_ICONS[f]}</span>
                <span className="font-medium">{FREQ_LABELS[f]}</span>
              </button>
            ))}
            {frequency === "custom" && (
              <div className="mt-2">
                <label className="text-sm text-muted-foreground mb-1 block">Tous les combien de jours ?</label>
                <Input type="number" value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="14" className="glass" />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ajoutez au moins 2 membres</p>
            <div className="flex gap-2">
              <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Nom" className="glass flex-1" />
              <Input value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} placeholder="Tél" className="glass w-28" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={memberIsOwner} onChange={(e) => setMemberIsOwner(e.target.checked)} className="accent-primary" />
              C'est moi
            </label>
            <Button onClick={addMember} variant="outline" size="sm" className="glass">
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>

            <div className="space-y-2 mt-2">
              {members.map((m, i) => (
                <div key={i} className="glass-card rounded-xl p-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                    {m.is_owner && <span className="ml-2 text-xs text-primary">👤 Moi</span>}
                    {m.phone && <span className="ml-2 text-xs text-muted-foreground">{m.phone}</span>}
                  </div>
                  <button onClick={() => removeMember(i)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {members.length < 2 && (
              <p className="text-xs text-amber-400">Minimum 2 membres requis</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="glass-card rounded-xl p-4 space-y-2">
              <p className="font-semibold text-foreground">📋 Résumé</p>
              <p className="text-sm text-muted-foreground">
                Tontine <span className="text-foreground font-medium">{name}</span> — {FREQ_LABELS[frequency]}
              </p>
              <p className="text-sm text-muted-foreground">
                {members.length} membres × {fmt(Number(amount))} F = <span className="text-foreground font-bold">{fmt(totalPerCycle)} F/cycle</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Premier cycle : à partir du {new Date(startDate).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="glass">
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Suivant <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={create} disabled={creating}>
              <Check className="w-4 h-4 mr-1" /> Créer la tontine
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTontineModal;
