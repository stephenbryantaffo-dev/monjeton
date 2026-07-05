import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Repeat, Target, Users } from "lucide-react";
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
    if (caisseType === "recurring" || caisseType === "association") {
      if (step === 1) return name.trim() && Number(amount) > 0 && startDate;
      if (step === 2) return frequency && (frequency !== "custom" || Number(customDays) > 0);
      if (step === 3) return members.length >= 2;
    } else if (caisseType === "project") {
      // Parcours simplifié : Étape 1 = nom (+ objectif optionnel), Étape 2 = participants.
      if (step === 1) return !!name.trim();
      if (step === 2) return members.length >= 1;
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
        caisse_type: caisseType === "association" ? "association" : "recurring",
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
      toast({ title: caisseType === "association" ? "Caisse d'association créée ✅" : "Tontine créée ✅", description: `${nbMembers} membres · cycle 1 ouvert` });
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

  // Nombre total d'étapes selon le type
  const totalSteps = caisseType === "project" ? 2 : 4;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 0
              ? "Qu'est-ce que tu veux organiser ?"
              : `${caisseType === "project" ? "Événement" : caisseType === "association" ? "Groupe" : "Tontine tournante"} — Étape ${step}/${totalSteps}`}
          </DialogTitle>
        </DialogHeader>

        {/* ─── Step 0 : choix par besoin (langage humain) ─── */}
        {step === 0 && (
          <div className="space-y-3">
            <button
              onClick={() => { setCaisseType("project"); setStep(1); }}
              className="w-full text-left p-4 rounded-2xl border border-border bg-secondary/40 hover:bg-primary/10 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-xl">🎯</div>
                <p className="font-bold text-foreground">Collecter pour un événement</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Concert, tournoi, voyage, mariage. Suis qui a payé et tes dépenses.
              </p>
            </button>

            <button
              onClick={() => { setCaisseType("recurring"); setStep(1); }}
              className="w-full text-left p-4 rounded-2xl border border-border bg-secondary/40 hover:bg-primary/10 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-xl">🔄</div>
                <p className="font-bold text-foreground">Tontine tournante</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chacun cotise, un membre reçoit la cagnotte à tour de rôle.
              </p>
            </button>

            <button
              onClick={() => { setCaisseType("association"); setStep(1); }}
              className="w-full text-left p-4 rounded-2xl border border-border bg-secondary/40 hover:bg-primary/10 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-xl">🏦</div>
                <p className="font-bold text-foreground">Cotisations d'un groupe</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Club, association, équipe. L'argent s'accumule pour le groupe.
              </p>
            </button>
          </div>
        )}


        {/* ─── RECURRING flow (existant) ─── */}
        {(caisseType === "recurring" || caisseType === "association") && step === 1 && (
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

        {(caisseType === "recurring" || caisseType === "association") && step === 2 && (
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

        {(caisseType === "recurring" || caisseType === "association") && step === 3 && (
          <MembersStep
            members={members} memberName={memberName} memberPhone={memberPhone} memberIsOwner={memberIsOwner}
            setMemberName={setMemberName} setMemberPhone={setMemberPhone} setMemberIsOwner={setMemberIsOwner}
            addMember={addMember} removeMember={removeMember}
            min={2}
          />
        )}

        {(caisseType === "recurring" || caisseType === "association") && step === 4 && (
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

        {/* ─── PROJECT flow (simplifié : 2 étapes) ─── */}
        {caisseType === "project" && step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nom de l'événement</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mariage de Kouassi, Voyage Dakar..." className="glass" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Objectif à collecter (optionnel)</label>
              <div className="relative">
                <MoneyInput value={targetTotal} onChange={(n) => setTargetTotal(n ? String(n) : "")} placeholder="500 000" showCurrency={false} className="[&>input]:glass [&>input]:pr-14" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">FCFA</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tu peux laisser vide et fixer l'objectif plus tard.</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date de l'événement (optionnel)</label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="glass" />
            </div>
          </div>
        )}

        {caisseType === "project" && step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ajoute les participants (ceux qui vont contribuer).</p>
            <MembersStep
              members={members} memberName={memberName} memberPhone={memberPhone} memberIsOwner={memberIsOwner}
              setMemberName={setMemberName} setMemberPhone={setMemberPhone} setMemberIsOwner={setMemberIsOwner}
              addMember={addMember} removeMember={removeMember}
              min={1}
            />
            {Number(targetTotal) > 0 && nbMembers > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Objectif : <span className="text-foreground font-semibold">{fmt(Number(targetTotal))}</span> · Soit ≈ <span className="text-foreground font-semibold">{fmt(Math.ceil(Number(targetTotal) / nbMembers))}</span> par participant.
              </p>
            )}
          </div>
        )}

        {/* ─── Footer nav ─── */}
        {step > 0 && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => (step === 1 ? (setStep(0), setCaisseType(null)) : setStep(step - 1))} className="glass">
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
            <div className="flex-1" />
            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={caisseType === "project" ? createProject : createRecurring} disabled={creating || !canNext()}>
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
