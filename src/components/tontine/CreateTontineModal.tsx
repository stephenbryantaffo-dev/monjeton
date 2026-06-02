import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Repeat, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { FREQ_LABELS, FREQ_ICONS, CaisseType } from "./types";
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
  const [caisseType, setCaisseType] = useState<CaisseType | null>(null);
  const [step, setStep] = useState(0); // 0 = type picker
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

  // Project-specific
  const [eventDate, setEventDate] = useState("");
  const [targetMode, setTargetMode] = useState<"total" | "per_member">("total");
  const [targetTotal, setTargetTotal] = useState("");
  const [perMember, setPerMember] = useState("");

  const reset = () => {
    setCaisseType(null);
    setStep(0);
    setName("");
    setAmount("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setFrequency("monthly");
    setCustomDays("");
    setMembers([]);
    setMemberName("");
    setMemberPhone("");
    setMemberIsOwner(false);
    setEventDate("");
    setTargetMode("total");
    setTargetTotal("");
    setPerMember("");
  };

  const addMember = () => {
    if (!memberName.trim()) return;
    setMembers((p) => [...p, { name: memberName.trim(), phone: memberPhone.trim(), is_owner: memberIsOwner }]);
    setMemberName(""); setMemberPhone(""); setMemberIsOwner(false);
  };
  const removeMember = (i: number) => setMembers((p) => p.filter((_, idx) => idx !== i));

  const nbMembers = members.length;

  // Project calculated values
  const computedPerMember = useMemo(() => {
    if (targetMode === "total" && nbMembers > 0) return Math.ceil(Number(targetTotal || 0) / nbMembers);
    return Number(perMember || 0);
  }, [targetMode, targetTotal, perMember, nbMembers]);
  const computedTotal = useMemo(() => {
    if (targetMode === "per_member") return Number(perMember || 0) * nbMembers;
    return Number(targetTotal || 0);
  }, [targetMode, targetTotal, perMember, nbMembers]);

  // ─── Validation ───
  const canNext = () => {
    if (caisseType === "recurring") {
      if (step === 1) return name.trim() && Number(amount) > 0 && startDate;
      if (step === 2) return frequency && (frequency !== "custom" || Number(customDays) > 0);
      if (step === 3) return members.length >= 2;
    } else if (caisseType === "project") {
      if (step === 1) return name.trim();
      if (step === 2) return members.length >= 1;
      if (step === 3) {
        if (targetMode === "total") return Number(targetTotal) > 0;
        return Number(perMember) > 0;
      }
    }
    return true;
  };

  const totalPerCycle = nbMembers * Number(amount || 0);

  // ─── Create handlers ───
  const createRecurring = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const payload: any = {
        user_id: user.id,
        name: name.trim(),
        contribution_amount: Number(amount),
        frequency,
        custom_frequency_days: frequency === "custom" ? Number(customDays) : null,
        start_date: startDate,
        caisse_type: "recurring",
      };
      const { data: tontine, error: tErr } = await supabase.from("tontines" as any).insert(payload).select().single();
      if (tErr || !tontine) throw new Error(tErr?.message || "Création impossible");
      const tontineId = (tontine as any).id;

      const { error: mErr } = await supabase.from("tontine_members" as any).insert(
        members.map((m) => ({ tontine_id: tontineId, name: m.name, phone: m.phone || null, is_owner: m.is_owner }))
      );
      if (mErr) {
        await supabase.from("tontines" as any).delete().eq("id", tontineId);
        throw new Error(mErr.message);
      }
      const cycleInfo = generateCycleInfo({ ...payload, id: tontineId } as any, 1, nbMembers);
      const { error: cErr } = await supabase.from("tontine_cycles" as any).insert({ tontine_id: tontineId, ...cycleInfo });
      if (cErr) {
        await supabase.from("tontine_members" as any).delete().eq("tontine_id", tontineId);
        await supabase.from("tontines" as any).delete().eq("id", tontineId);
        throw new Error(cErr.message);
      }
      toast({ title: "Tontine créée ✅", description: `${nbMembers} membres · cycle 1 ouvert` });
      reset(); onOpenChange(false); onCreated();
    } catch (e: any) {
      toast({ title: "Erreur création", description: e?.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const createProject = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const finalTotal = computedTotal;
      const finalPer = computedPerMember;
      const payload: any = {
        user_id: user.id,
        name: name.trim(),
        contribution_amount: finalPer || 0,
        contribution_per_member: finalPer || 0,
        target_amount: finalTotal || 0,
        frequency: "custom",
        start_date: new Date().toISOString().split("T")[0],
        event_date: eventDate || null,
        caisse_type: "project",
      };
      const { data: tontine, error: tErr } = await supabase.from("tontines" as any).insert(payload).select().single();
      if (tErr || !tontine) throw new Error(tErr?.message || "Création impossible");
      const tontineId = (tontine as any).id;

      if (members.length > 0) {
        const { error: mErr } = await supabase.from("tontine_members" as any).insert(
          members.map((m) => ({ tontine_id: tontineId, name: m.name, phone: m.phone || null, is_owner: m.is_owner }))
        );
        if (mErr) {
          await supabase.from("tontines" as any).delete().eq("id", tontineId);
          throw new Error(mErr.message);
        }
      }

      // Cycle unique "projet" pour héberger les cotisations
      const today = new Date().toISOString().split("T")[0];
      const endDate = eventDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0];
      const { error: cErr } = await supabase.from("tontine_cycles" as any).insert({
        tontine_id: tontineId,
        cycle_number: 1,
        period_label: "Projet",
        start_date: today,
        end_date: endDate,
        total_expected: finalTotal || 0,
        total_collected: 0,
        status: "open",
      });
      if (cErr) {
        await supabase.from("tontine_members" as any).delete().eq("tontine_id", tontineId);
        await supabase.from("tontines" as any).delete().eq("id", tontineId);
        throw new Error(cErr.message);
      }

      toast({ title: "Caisse de projet créée ✅", description: `${members.length} membre(s) · cible ${fmt(finalTotal)}` });
      reset(); onOpenChange(false); onCreated();
    } catch (e: any) {
      toast({ title: "Erreur création", description: e?.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const totalSteps = caisseType === "project" ? 4 : 4;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 0
              ? "Choisir le type de caisse"
              : `${caisseType === "project" ? "Caisse de projet" : "Tontine"} — Étape ${step}/${totalSteps - 1}`}
          </DialogTitle>
        </DialogHeader>

        {/* ─── Step 0 : Type picker ─── */}
        {step === 0 && (
          <div className="space-y-3">
            <button
              onClick={() => { setCaisseType("recurring"); setStep(1); }}
              className="w-full text-left p-4 rounded-2xl border border-border bg-secondary/40 hover:bg-primary/10 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Repeat className="w-5 h-5 text-primary" />
                </div>
                <p className="font-bold text-foreground">📅 Tontine récurrente</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-13">
                Cotisation périodique entre membres, chacun reçoit la cagnotte à son tour.
              </p>
            </button>

            <button
              onClick={() => { setCaisseType("project"); setStep(1); }}
              className="w-full text-left p-4 rounded-2xl border border-border bg-secondary/40 hover:bg-primary/10 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-500" />
                </div>
                <p className="font-bold text-foreground">🎯 Caisse de projet</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Collecte pour un objectif précis : événement, voyage, projet. Pas de cycle mensuel — on suit recettes et dépenses jusqu'à la réalisation.
              </p>
            </button>
          </div>
        )}

        {/* ─── RECURRING flow (existant) ─── */}
        {caisseType === "recurring" && step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nom de la tontine</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tontine des cousins" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Montant de cotisation (FCFA)</label>
              <MoneyInput value={amount} onChange={(n) => setAmount(n ? String(n) : "")} placeholder="25 000" showCurrency={false} className="[&>input]:glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date de début</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="glass" />
            </div>
          </div>
        )}

        {caisseType === "recurring" && step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choisissez la fréquence des cotisations</p>
            {FREQUENCIES.map((f) => (
              <button key={f} onClick={() => setFrequency(f)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  frequency === f ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}>
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

        {caisseType === "recurring" && step === 3 && (
          <MembersStep
            members={members} memberName={memberName} memberPhone={memberPhone} memberIsOwner={memberIsOwner}
            setMemberName={setMemberName} setMemberPhone={setMemberPhone} setMemberIsOwner={setMemberIsOwner}
            addMember={addMember} removeMember={removeMember}
            min={2}
          />
        )}

        {caisseType === "recurring" && step === 4 && (
          <div className="space-y-3">
            <div className="glass-card rounded-xl p-4 space-y-2">
              <p className="font-semibold text-foreground">📋 Résumé</p>
              <p className="text-sm text-muted-foreground">
                Tontine <span className="text-foreground font-medium">{name}</span> — {FREQ_LABELS[frequency]}
              </p>
              <p className="text-sm text-muted-foreground">
                {nbMembers} membres × {fmt(Number(amount))} = <span className="text-foreground font-bold">{fmt(totalPerCycle)}/cycle</span>
              </p>
              <p className="text-sm text-muted-foreground">Premier cycle : à partir du {new Date(startDate).toLocaleDateString("fr-FR")}</p>
            </div>
          </div>
        )}

        {/* ─── PROJECT flow ─── */}
        {caisseType === "project" && step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nom du projet</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Showcase Décembre" className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date de l'événement (optionnel)</label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="glass" />
            </div>
          </div>
        )}

        {caisseType === "project" && step === 2 && (
          <MembersStep
            members={members} memberName={memberName} memberPhone={memberPhone} memberIsOwner={memberIsOwner}
            setMemberName={setMemberName} setMemberPhone={setMemberPhone} setMemberIsOwner={setMemberIsOwner}
            addMember={addMember} removeMember={removeMember}
            min={1}
          />
        )}

        {caisseType === "project" && step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Comment veux-tu fixer la collecte ?</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTargetMode("total")}
                className={`p-3 rounded-xl text-xs font-medium border transition-colors ${
                  targetMode === "total" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground"
                }`}>
                🎯 Montant cible TOTAL
              </button>
              <button onClick={() => setTargetMode("per_member")}
                className={`p-3 rounded-xl text-xs font-medium border transition-colors ${
                  targetMode === "per_member" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground"
                }`}>
                👤 Par membre
              </button>
            </div>
            {targetMode === "total" ? (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Montant cible total (FCFA)</label>
                <MoneyInput value={targetTotal} onChange={(n) => setTargetTotal(n ? String(n) : "")} placeholder="500 000" showCurrency={false} className="[&>input]:glass" />
                {nbMembers > 0 && Number(targetTotal) > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Soit ≈ <span className="text-foreground font-semibold">{fmt(computedPerMember)}</span> par membre ({nbMembers} membres)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Cotisation par membre (FCFA)</label>
                <MoneyInput value={perMember} onChange={(n) => setPerMember(n ? String(n) : "")} placeholder="25 000" showCurrency={false} className="[&>input]:glass" />
                {nbMembers > 0 && Number(perMember) > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Total cible : <span className="text-foreground font-semibold">{fmt(computedTotal)}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {caisseType === "project" && step === 4 && (
          <div className="space-y-3">
            <div className="glass-card rounded-xl p-4 space-y-2">
              <p className="font-semibold text-foreground">📋 Résumé</p>
              <p className="text-sm text-muted-foreground">
                Projet <span className="text-foreground font-medium">{name}</span>
              </p>
              {eventDate && <p className="text-sm text-muted-foreground">📅 Événement : {new Date(eventDate).toLocaleDateString("fr-FR")}</p>}
              <p className="text-sm text-muted-foreground">{nbMembers} membre(s)</p>
              <p className="text-sm text-muted-foreground">
                Cible : <span className="text-foreground font-bold">{fmt(computedTotal)}</span> ({fmt(computedPerMember)}/membre)
              </p>
            </div>
          </div>
        )}

        {/* ─── Footer nav ─── */}
        {step > 0 && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => (step === 1 ? (setStep(0), setCaisseType(null)) : setStep(step - 1))} className="glass">
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
            <div className="flex-1" />
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={caisseType === "project" ? createProject : createRecurring} disabled={creating}>
                <Check className="w-4 h-4 mr-1" /> Créer
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Reusable members step UI
const MembersStep = ({
  members, memberName, memberPhone, memberIsOwner,
  setMemberName, setMemberPhone, setMemberIsOwner,
  addMember, removeMember, min,
}: any) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Ajoutez au moins {min} membre{min > 1 ? "s" : ""}</p>
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
      {members.map((m: any, i: number) => (
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
    {members.length < min && <p className="text-xs text-amber-400">Minimum {min} membre{min > 1 ? "s" : ""} requis</p>}
  </div>
);

export default CreateTontineModal;
