import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { TontineData } from "./types";
import { fmt } from "./utils";

interface Props {
  open: boolean;
  onClose: () => void;
  tontine: TontineData;
  onUpdated: () => void;
}

/**
 * Modal d'édition d'une caisse (tontine récurrente OU projet).
 * Permet de modifier : nom, montant cotisation/cible, date événement.
 * Chaque modification est tracée dans tontine_member_history (member_id=null)
 * pour transparence entre membres.
 *
 * Note : Screen.StickyAction est réservé aux pages plein écran. Ici on
 * applique le même esprit "CTA toujours visible en bas" via un footer
 * sticky dans le Dialog (cohérence visuelle avec le reste de l'app).
 */
const EditCaisseModal = ({ open, onClose, tontine, onUpdated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const isProject = tontine.caisse_type === "project";

  const [name, setName] = useState(tontine.name);
  const [contribution, setContribution] = useState(
    String(isProject ? (tontine.contribution_per_member || 0) : tontine.contribution_amount)
  );
  const [target, setTarget] = useState(String(tontine.target_amount || 0));
  const [eventDate, setEventDate] = useState(tontine.event_date?.split("T")[0] || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(tontine.name);
      setContribution(String(isProject ? (tontine.contribution_per_member || 0) : tontine.contribution_amount));
      setTarget(String(tontine.target_amount || 0));
      setEventDate(tontine.event_date?.split("T")[0] || "");
    }
  }, [open, tontine, isProject]);

  const logChange = async (field: string, oldVal: string, newVal: string) => {
    if (oldVal === newVal) return;
    await supabase.from("tontine_member_history" as any).insert({
      tontine_id: tontine.id,
      member_id: null,
      action: "caisse_updated",
      performed_by: user?.id,
      note: `${field} : ${oldVal} → ${newVal}`,
    } as any);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const newContrib = Number(contribution) || 0;
      const newTarget = Number(target) || 0;
      const oldContrib = isProject ? (tontine.contribution_per_member || 0) : tontine.contribution_amount;
      const oldTarget = tontine.target_amount || 0;
      const oldDate = tontine.event_date?.split("T")[0] || "";

      const updatePayload: Record<string, any> = { name: name.trim() };
      if (isProject) {
        updatePayload.contribution_per_member = newContrib;
        updatePayload.contribution_amount = newContrib;
        updatePayload.target_amount = newTarget;
        if (eventDate) updatePayload.event_date = eventDate;
      } else {
        updatePayload.contribution_amount = newContrib;
      }

      const { error } = await supabase
        .from("tontines" as any)
        .update(updatePayload)
        .eq("id", tontine.id);
      if (error) throw error;

      // Recalculer total_expected sur le cycle ouvert
      const { data: openCycles } = await supabase
        .from("tontine_cycles")
        .select("id")
        .eq("tontine_id", tontine.id)
        .eq("status", "open");
      if (openCycles && openCycles.length > 0) {
        for (const c of openCycles) {
          await supabase.rpc("recalculate_cycle_expected" as any, {
            p_cycle_id: c.id,
            p_contribution: newContrib,
          } as any);
        }
      }

      // Historique
      if (name.trim() !== tontine.name) await logChange("Nom", tontine.name, name.trim());
      if (newContrib !== oldContrib) {
        await logChange(
          isProject ? "Montant par membre" : "Montant cotisation",
          `${fmt(oldContrib)} FCFA`,
          `${fmt(newContrib)} FCFA`
        );
      }
      if (isProject && newTarget !== oldTarget) {
        await logChange("Montant cible", `${fmt(oldTarget)} FCFA`, `${fmt(newTarget)} FCFA`);
      }
      if (isProject && eventDate && eventDate !== oldDate) {
        await logChange("Date événement", oldDate || "—", eventDate);
      }

      toast({ title: "Caisse mise à jour ✅" });
      onUpdated();
      onClose();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card border-border p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>✏️ Modifier la caisse</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Nom de la caisse</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="glass" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              {isProject ? "Montant par membre (FCFA)" : "Montant cotisation (FCFA)"}
            </label>
            <MoneyInput
              value={contribution}
              onChange={(n) => setContribution(n ? String(n) : "")}
              showCurrency={false}
              className="[&>input]:glass"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Les "reste à verser" de chaque membre seront recalculés automatiquement.
            </p>
          </div>

          {isProject && (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Montant cible total (FCFA)</label>
                <MoneyInput
                  value={target}
                  onChange={(n) => setTarget(n ? String(n) : "")}
                  showCurrency={false}
                  className="[&>input]:glass"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Date de l'événement</label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="glass" />
              </div>
            </>
          )}

          <div className="glass rounded-xl p-3 border border-primary/20">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 Chaque modification sera enregistrée dans l'historique de la caisse
              pour la transparence entre les membres.
            </p>
          </div>
        </div>

        {/* Sticky footer — esprit Screen.StickyAction adapté au modal */}
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-lg px-6 py-3 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 glass" disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gradient-primary text-primary-foreground">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCaisseModal;
