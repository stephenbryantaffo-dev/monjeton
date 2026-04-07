import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

const CreateCaisseModal = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "membres">("info");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [members, setMembers] = useState([{ name: "", phone: "" }]);
  const [saving, setSaving] = useState(false);

  const updateMember = (i: number, field: "name" | "phone", val: string) => {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));
  };
  const removeMember = (i: number) => setMembers((prev) => prev.filter((_, idx) => idx !== i));

  const reset = () => {
    setStep("info");
    setName("");
    setDescription("");
    setContributionAmount("");
    setFrequency("monthly");
    setMembers([{ name: "", phone: "" }]);
  };

  const createCaisse = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const { data: newCaisse, error } = await supabase
        .from("caisses" as any)
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          contribution_amount: Number(contributionAmount),
          frequency,
          total_collected: 0,
          total_spent: 0,
        } as any)
        .select()
        .single();
      if (error) throw error;

      const validMembers = members.filter((m) => m.name.trim());
      if (validMembers.length > 0) {
        await supabase.from("caisse_members" as any).insert(
          validMembers.map((m) => ({
            caisse_id: (newCaisse as any).id,
            name: m.name.trim(),
            phone: m.phone || null,
          })) as any
        );
      }

      toast({ title: `Caisse "${name}" créée ✅` });
      reset();
      onOpenChange(false);
      onCreated();
    } catch {
      toast({ title: "Erreur création caisse", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="glass-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "info" ? "Nouvelle caisse commune" : "Ajouter les membres"}</DialogTitle>
        </DialogHeader>

        {step === "info" ? (
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nom de la caisse</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Caisse Fête Société" className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>But de cette caisse (optionnel)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Location bus excursion décembre" className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Cotisation par membre (FCFA)</Label>
              <Input type="number" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} placeholder="Ex: 5000" className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label>Fréquence de cotisation</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(["weekly", "monthly", "quarterly", "custom"] as const).map((f) => (
                  <button key={f} onClick={() => setFrequency(f)} className={`py-2 rounded-xl text-xs font-medium transition-colors ${frequency === f ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                    {f === "weekly" ? "📅 Hebdomadaire" : f === "monthly" ? "📆 Mensuelle" : f === "quarterly" ? "🗓️ Trimestrielle" : "✏️ Personnalisée"}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep("membres")} disabled={!name || !contributionAmount} className="w-full gradient-primary text-primary-foreground">
              Continuer → Ajouter les membres
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {members.map((m, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder={`Membre ${i + 1} — Nom`} value={m.name} onChange={(e) => updateMember(i, "name", e.target.value)} className="bg-secondary border-border flex-1" />
                <Input placeholder="Téléphone" value={m.phone} onChange={(e) => updateMember(i, "phone", e.target.value)} className="bg-secondary border-border w-28" />
                {members.length > 1 && (
                  <button onClick={() => removeMember(i)} className="text-destructive"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            <button onClick={() => setMembers([...members, { name: "", phone: "" }])} className="text-primary text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Ajouter un membre
            </button>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("info")} className="flex-1 glass">Retour</Button>
              <Button onClick={createCaisse} disabled={saving || !members[0]?.name.trim()} className="flex-1 gradient-primary text-primary-foreground">
                Créer la caisse
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateCaisseModal;
