import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, ArrowLeft, ArrowRight, Check, Repeat, Users, CalendarHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CaisseType } from "./types";
import { generateCycleInfo, fmt } from "./utils";
import { DatePickerField } from "@/components/ui/DatePickerField";

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

type RhythmId = "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";

const RHYTHMS: { id: RhythmId; label: string }[] = [
  { id: "daily", label: "Chaque jour" },
  { id: "weekly", label: "Chaque semaine" },
  { id: "monthly", label: "Chaque mois" },
  { id: "quarterly", label: "Trimestrielle" },
  { id: "annual", label: "Annuelle" },
  { id: "custom", label: "Personnalisée" },
];

const TYPES: { id: CaisseType; label: string; Icon: typeof Repeat }[] = [
  { id: "recurring", label: "Tontine tournante", Icon: Repeat },
  { id: "association", label: "Cotisations groupe", Icon: Users },
  { id: "project", label: "Événement", Icon: CalendarHeart },
];

const CreateTontineModal = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [caisseType, setCaisseType] = useState<CaisseType>("recurring");
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [rhythm, setRhythm] = useState<RhythmId>("monthly");
  const [customDays, setCustomDays] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberIsOwner, setMemberIsOwner] = useState(false);

  // Événement
  const [eventDate, setEventDate] = useState("");
  const [targetMode, setTargetMode] = useState<"total" | "open">("total");
  const [targetTotal, setTargetTotal] = useState("");

  const isProject = caisseType === "project";

  const reset = () => {
    setCaisseType("recurring");
    setStep(1);
    setName("");
    setAmount("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setRhythm("monthly");
    setCustomDays("");
    setMembers([]);
    setShowMemberForm(false);
    setMemberName("");
    setMemberPhone("");
    setMemberIsOwner(false);
    setEventDate("");
    setTargetMode("total");
    setTargetTotal("");
  };

  const addMember = () => {
    if (!memberName.trim()) return;
    setMembers((p) => [...p, { name: memberName.trim(), phone: memberPhone.trim(), is_owner: memberIsOwner }]);
    setMemberName("");
    setMemberPhone("");
    setMemberIsOwner(false);
    setShowMemberForm(false);
  };
  const removeMember = (i: number) => setMembers((p) => p.filter((_, idx) => idx !== i));

  const nbMembers = members.length;
  const minMembers = isProject ? 1 : 2;
  const totalPerCycle = nbMembers * Number(amount || 0);

  const computedPerMember = useMemo(
    () => (nbMembers > 0 ? Math.ceil(Number(targetTotal || 0) / nbMembers) : 0),
    [targetTotal, nbMembers]
  );

  const rhythmLabel = RHYTHMS.find((r) => r.id === rhythm)?.label.toLowerCase() || "";

  // ─── Validation ───
  const canNext = () => {
    if (step === 1) {
      if (isProject) return !!name.trim();
      return !!name.trim() && Number(amount) > 0 && !!startDate && (rhythm !== "custom" || Number(customDays) > 0);
    }
    return members.length >= minMembers;
  };

  // Le moteur de cycles ne connaît pas "daily" : on le traduit en custom / 1 jour.
  const dbFrequency = rhythm === "daily" ? "custom" : rhythm;
  const dbCustomDays = rhythm === "daily" ? 1 : rhythm === "custom" ? Number(customDays) : null;

  // ─── Create handlers ───
  const createRecurring = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const payload: any = {
        user_id: user.id,
        name: name.trim(),
        contribution_amount: Number(amount),
        frequency: dbFrequency,
        custom_frequency_days: dbCustomDays,
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
      toast({
        title: caisseType === "association" ? "Caisse d'association créée" : "Tontine créée",
        description: `${nbMembers} membres · cycle 1 ouvert`,
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast({ title: "Erreur création", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const createProject = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const finalTotal = targetMode === "open" ? 0 : Number(targetTotal || 0);
      const finalPer = finalTotal > 0 && nbMembers > 0 ? Math.ceil(finalTotal / nbMembers) : 0;
      const payload: any = {
        user_id: user.id,
        name: name.trim(),
        contribution_amount: finalPer,
        contribution_per_member: finalPer,
        target_amount: finalTotal,
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

      const today = new Date().toISOString().split("T")[0];
      const endDate = eventDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0];
      const { error: cErr } = await supabase.from("tontine_cycles" as any).insert({
        tontine_id: tontineId,
        cycle_number: 1,
        period_label: "Projet",
        start_date: today,
        end_date: endDate,
        total_expected: finalTotal,
        total_collected: 0,
        status: "open",
      });
      if (cErr) {
        await supabase.from("tontine_members" as any).delete().eq("tontine_id", tontineId);
        await supabase.from("tontines" as any).delete().eq("id", tontineId);
        throw new Error(cErr.message);
      }

      toast({ title: "Caisse de projet créée", description: `${members.length} membre(s) · cible ${fmt(finalTotal)}` });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast({ title: "Erreur création", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 1 ? (isProject ? "Ton événement" : "Ta tontine") : "Qui participe ?"}</DialogTitle>
        </DialogHeader>

        {/* Progression 2 segments */}
        <div className="flex gap-1.5 -mt-1 mb-1">
          <i className="h-1 flex-1 rounded-full bg-primary" />
          <i className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-primary" : "bg-border"}`} />
        </div>

        {/* ─── ÉCRAN 1 ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground -mt-2">
              {isProject ? "Le type, l'objectif, la date — tout ici." : "Le type, le montant, le rythme — tout ici."}
            </p>

            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                C'est pour quoi ?
              </p>
              <div className="flex gap-2">
                {TYPES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCaisseType(id)}
                    className={`flex-1 rounded-xl border p-2.5 text-center transition-colors ${
                      caisseType === id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/40 hover:bg-secondary"
                    }`}
                  >
                    <span className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <span className="block text-[10.5px] font-bold leading-tight text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Nom
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isProject ? "Ex: Mariage de Kouassi" : "Ex: Tontine des cousins"}
                className="glass"
              />
            </div>

            {!isProject ? (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Cotisation
                    </label>
                    <MoneyInput
                      value={amount}
                      onChange={(n) => setAmount(n ? String(n) : "")}
                      placeholder="25 000"
                      showCurrency={false}
                      className="[&>input]:glass"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Début
                    </label>
                    <DatePickerField value={startDate} onChange={setStartDate} className="glass" />
                  </div>
                </div>

                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Rythme</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RHYTHMS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRhythm(r.id)}
                        className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                          rhythm === r.id
                            ? "border-transparent bg-primary/15 text-primary"
                            : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {rhythm === "custom" && (
                    <div className="mt-3">
                      <label className="text-sm text-muted-foreground mb-1 block">Tous les combien de jours ?</label>
                      <Input
                        type="number"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="14"
                        className="glass"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Objectif de collecte
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setTargetMode("total")}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                        targetMode === "total"
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Objectif fixe
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTargetMode("open"); setTargetTotal(""); }}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                        targetMode === "open"
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Ouvert
                    </button>
                  </div>
                  {targetMode === "open" ? (
                    <p className="text-xs text-muted-foreground">
                      Pas de montant fixe : la caisse suit ce qui est collecté et dépensé. Tu pourras fixer un objectif
                      plus tard.
                    </p>
                  ) : (
                    <div className="relative">
                      <MoneyInput
                        value={targetTotal}
                        onChange={(n) => setTargetTotal(n ? String(n) : "")}
                        placeholder="500 000"
                        showCurrency={false}
                        className="[&>input]:glass [&>input]:pr-14"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        FCFA
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Date de l'événement (optionnel)
                  </label>
                  <DatePickerField value={eventDate} onChange={setEventDate} className="glass" />
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── ÉCRAN 2 ─── */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground -mt-2">
              {isProject ? "Ajoute les participants." : "Ajoute les membres de la tontine."}
            </p>

            <div className="space-y-2">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-extrabold text-primary">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {m.name}
                    {m.is_owner && <span className="ml-2 text-xs font-medium text-primary">Moi</span>}
                    {m.phone && <span className="ml-2 text-xs font-normal text-muted-foreground">{m.phone}</span>}
                  </span>
                  <button onClick={() => removeMember(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {showMemberForm ? (
              <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
                <div className="flex gap-2">
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Nom"
                    className="glass flex-1"
                    autoFocus
                  />
                  <Input
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    placeholder="Tél"
                    className="glass w-28"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={memberIsOwner}
                    onChange={(e) => setMemberIsOwner(e.target.checked)}
                    className="accent-primary"
                  />
                  C'est moi
                </label>
                <div className="flex gap-2">
                  <Button onClick={addMember} size="sm" disabled={!memberName.trim()}>
                    Ajouter
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowMemberForm(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMemberForm(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm font-bold text-primary hover:bg-primary/5"
              >
                <Plus className="h-4 w-4" /> Ajouter un membre
              </button>
            )}

            {members.length < minMembers && (
              <p className="text-xs text-amber-400">
                Minimum {minMembers} membre{minMembers > 1 ? "s" : ""} requis
              </p>
            )}

            {/* Récapitulatif intégré */}
            {name.trim() && (
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Récapitulatif</p>
                <div className="mt-1.5 text-sm leading-relaxed text-foreground">
                  <p className="font-extrabold">{name.trim()}</p>
                  {isProject ? (
                    <>
                      <p>
                        {targetMode === "open" ? (
                          "Objectif ouvert"
                        ) : (
                          <>
                            Objectif <b className="font-extrabold">{fmt(Number(targetTotal || 0))} F</b>
                          </>
                        )}{" "}
                        · <b className="font-extrabold">{nbMembers} participant{nbMembers > 1 ? "s" : ""}</b>
                      </p>
                      {targetMode === "total" && computedPerMember > 0 && (
                        <p>
                          Soit ≈ <b className="font-extrabold">{fmt(computedPerMember)} F</b> par participant
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>
                        <b className="font-extrabold">{fmt(Number(amount || 0))} F</b> {rhythmLabel} ·{" "}
                        <b className="font-extrabold">{nbMembers} membre{nbMembers > 1 ? "s" : ""}</b>
                      </p>
                      <p>
                        Cagnotte du tour : <b className="font-extrabold">{fmt(totalPerCycle)} F</b>
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Footer nav ─── */}
        <div className="flex gap-2 mt-4">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} className="glass">
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          )}
          <div className="flex-1" />
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!canNext()}>
              Continuer <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={isProject ? createProject : createRecurring} disabled={creating || !canNext()}>
              <Check className="w-4 h-4 mr-1" /> {isProject ? "Créer la caisse" : "Créer la tontine"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTontineModal;
