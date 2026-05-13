import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/MoneyInput';
import {
  ChevronLeft, ChevronRight, Check, Loader2, Sparkles,
  AlertTriangle, Plus, X, Wallet, TrendingUp, Heart,
  Users, ShoppingBag, Calendar, RefreshCw,
} from 'lucide-react';
import { PlanValidationStep } from '@/components/budget/PlanValidationStep';

interface CoachingState {
  current_step: number;
  revenu_principal: number;
  revenu_type: 'fixe' | 'variable' | 'multiple';
  charges_fixes: Array<{ nom: string; montant: number }>;
  dettes_mois: number;
  dettes_details: Array<{ creancier: string; montant: number }>;
  revenu_exceptionnel: number;
  revenu_exceptionnel_source: string;
  objectifs: string[];
  situation_familiale: string;
  nb_personnes: number;
  habitude_depense: string;
  mois_special: string;
  mois_special_note: string;
}

const INITIAL_STATE: CoachingState = {
  current_step: 0,
  revenu_principal: 0,
  revenu_type: 'fixe',
  charges_fixes: [],
  dettes_mois: 0,
  dettes_details: [],
  revenu_exceptionnel: 0,
  revenu_exceptionnel_source: '',
  objectifs: [],
  situation_familiale: 'seul',
  nb_personnes: 1,
  habitude_depense: 'mixte',
  mois_special: 'normal',
  mois_special_note: '',
};

interface Props {
  month: number;
  year: number;
  onComplete: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '\u202F');

export const BudgetCoachingFlow = ({ month, year, onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CoachingState>(INITIAL_STATE);
  const [coachingId, setCoachingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data: existing } = await supabase
        .from('budget_coaching')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (existing && existing.statut !== 'approuve') {
        setData({
          current_step: existing.current_step || 0,
          revenu_principal: Number(existing.revenu_principal) || 0,
          revenu_type: (existing.revenu_type as any) || 'fixe',
          charges_fixes: (existing.charges_fixes as any) || [],
          dettes_mois: Number(existing.dettes_mois) || 0,
          dettes_details: (existing.dettes_details as any) || [],
          revenu_exceptionnel: Number(existing.revenu_exceptionnel) || 0,
          revenu_exceptionnel_source: existing.revenu_exceptionnel_source || '',
          objectifs: (existing.objectifs as any) || [],
          situation_familiale: existing.situation_familiale || 'seul',
          nb_personnes: existing.nb_personnes || 1,
          habitude_depense: existing.habitude_depense || 'mixte',
          mois_special: existing.mois_special || 'normal',
          mois_special_note: existing.mois_special_note || '',
        });
        setCoachingId(existing.id);
        if (existing.statut === 'complete' && existing.plan_genere) {
          setGeneratedPlan(existing.plan_genere as any);
          setStep(10);
        } else {
          setStep(existing.current_step || 0);
        }
      } else if (!existing) {
        const { data: created } = await supabase
          .from('budget_coaching')
          .insert({
            user_id: user.id,
            month, year,
            current_step: 0,
            statut: 'en_cours',
          })
          .select()
          .single();
        if (created) setCoachingId(created.id);
      } else {
        setCoachingId(existing.id);
      }
      setInitialized(true);
    };
    init();
  }, [user, month, year]);

  const saveProgress = useCallback(async (full: CoachingState, newStep: number) => {
    if (!coachingId) return;
    await supabase
      .from('budget_coaching')
      .update({
        revenu_principal: full.revenu_principal,
        revenu_type: full.revenu_type,
        charges_fixes: full.charges_fixes as any,
        dettes_mois: full.dettes_mois,
        dettes_details: full.dettes_details as any,
        revenu_exceptionnel: full.revenu_exceptionnel,
        revenu_exceptionnel_source: full.revenu_exceptionnel_source,
        objectifs: full.objectifs as any,
        situation_familiale: full.situation_familiale,
        nb_personnes: full.nb_personnes,
        habitude_depense: full.habitude_depense,
        mois_special: full.mois_special,
        mois_special_note: full.mois_special_note,
        current_step: newStep,
      })
      .eq('id', coachingId);
  }, [coachingId]);

  const updateData = (patch: Partial<CoachingState>) => {
    setData(prev => ({ ...prev, ...patch }));
  };

  const validateStep = (s: number): boolean => {
    if (s === 1 && data.revenu_principal <= 0) {
      toast({ title: 'Revenu requis', description: 'Saisis ton revenu mensuel pour continuer', variant: 'destructive' });
      return false;
    }
    if (s === 5 && data.objectifs.length === 0) {
      toast({ title: 'Au moins un objectif', description: 'Choisis au moins un objectif', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const goNext = async () => {
    if (!validateStep(step)) return;
    const newStep = step + 1;
    setStep(newStep);
    await saveProgress(data, newStep);
  };

  const goBack = () => {
    if (step > 0) {
      const newStep = step - 1;
      setStep(newStep);
      saveProgress(data, newStep);
    }
  };

  const totalCharges = data.charges_fixes.reduce((s, c) => s + (Number(c.montant) || 0), 0);
  const totalRevenu = data.revenu_principal + data.revenu_exceptionnel;
  const disponible = totalRevenu - totalCharges - data.dettes_mois;

  const generatePlan = async () => {
    if (!user || !coachingId || generating) return;
    setGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/budget-coaching-plan`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: data,
          disponible: Math.max(0, disponible),
          month, year,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur génération plan');
      }

      const plan = await res.json();

      await supabase.from('budget_coaching').update({
        plan_genere: plan,
        conseils_par_categorie: plan.conseils_par_categorie || {},
        statut: 'complete',
      }).eq('id', coachingId);

      setGeneratedPlan(plan);
      setStep(10);
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.message || 'Impossible de générer le plan',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============= STEP COMPONENTS =============
  const Step0 = (
    <div className="text-center space-y-4 py-6">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        className="w-20 h-20 mx-auto rounded-full gradient-primary flex items-center justify-center"
      >
        <Sparkles className="w-10 h-10 text-primary-foreground" />
      </motion.div>
      <h2 className="text-2xl font-bold text-foreground">Coach Budget IA</h2>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
        En 8 étapes simples, je vais te créer un budget sur mesure adapté à ta vie.
        Pas de jargon, que du concret.
      </p>
      <div className="glass-card rounded-2xl p-4 text-left text-xs text-muted-foreground space-y-1">
        <p>✅ Personnalisé selon ton profil</p>
        <p>✅ Conseils pratiques par catégorie</p>
        <p>✅ Sauvegarde automatique</p>
      </div>
      <Button onClick={goNext} className="w-full gradient-primary text-primary-foreground h-12">
        Commencer <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );

  const Step1 = (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Wallet className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Ton revenu mensuel</h2>
      </div>
      <p className="text-sm text-muted-foreground">Combien gagnes-tu en moyenne par mois ?</p>
      <div>
        <Label>Montant principal</Label>
        <MoneyInput value={data.revenu_principal} onChange={(n) => updateData({ revenu_principal: n })} className="mt-1.5" />
      </div>
      <div>
        <Label className="mb-2 block">Type de revenu</Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'fixe', l: 'Fixe' },
            { v: 'variable', l: 'Variable' },
            { v: 'multiple', l: 'Multiple' },
          ] as const).map(opt => (
            <button
              key={opt.v}
              onClick={() => updateData({ revenu_type: opt.v })}
              className={`p-3 rounded-xl text-sm font-medium transition ${data.revenu_type === opt.v ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground'}`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const addCharge = () => updateData({ charges_fixes: [...data.charges_fixes, { nom: '', montant: 0 }] });
  const updateCharge = (i: number, patch: Partial<{ nom: string; montant: number }>) => {
    const next = [...data.charges_fixes];
    next[i] = { ...next[i], ...patch };
    updateData({ charges_fixes: next });
  };
  const removeCharge = (i: number) => updateData({ charges_fixes: data.charges_fixes.filter((_, j) => j !== i) });

  const Step2 = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Calendar className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Charges fixes</h2>
      </div>
      <p className="text-sm text-muted-foreground">Loyer, électricité, abonnements, etc. (optionnel)</p>
      <div className="space-y-2">
        {data.charges_fixes.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={c.nom}
              onChange={(e) => updateCharge(i, { nom: e.target.value })}
              placeholder="Loyer, Internet..."
              className="flex-1"
            />
            <MoneyInput value={c.montant} onChange={(n) => updateCharge(i, { montant: n })} className="w-32" showCurrency={false} />
            <button onClick={() => removeCharge(i)} className="p-2 rounded-lg hover:bg-destructive/10">
              <X className="w-4 h-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>
      <Button onClick={addCharge} variant="outline" className="w-full glass">
        <Plus className="w-4 h-4 mr-1" /> Ajouter une charge
      </Button>
      {data.charges_fixes.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Total : <span className="font-bold text-foreground">{fmt(totalCharges)} F</span>
        </p>
      )}
    </div>
  );

  const Step3 = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-7 h-7 text-[hsl(30,90%,55%)]" />
        <h2 className="text-xl font-bold text-foreground">Dettes à rembourser</h2>
      </div>
      <p className="text-sm text-muted-foreground">Combien dois-tu rembourser ce mois-ci ?</p>
      <div>
        <Label>Total à rembourser ce mois</Label>
        <MoneyInput value={data.dettes_mois} onChange={(n) => updateData({ dettes_mois: n })} className="mt-1.5" />
      </div>
      {data.dettes_mois > 0 && (
        <div className="glass-card rounded-xl p-3 text-xs text-muted-foreground">
          💡 Rembourser ses dettes en priorité libère ton budget pour la suite.
        </div>
      )}
    </div>
  );

  const Step4 = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Revenu exceptionnel</h2>
      </div>
      <p className="text-sm text-muted-foreground">Une rentrée d'argent ce mois ? (cadeau, prime, vente...)</p>
      <div>
        <Label>Montant exceptionnel</Label>
        <MoneyInput value={data.revenu_exceptionnel} onChange={(n) => updateData({ revenu_exceptionnel: n })} className="mt-1.5" />
      </div>
      {data.revenu_exceptionnel > 0 && (
        <div>
          <Label>Source (optionnel)</Label>
          <Input
            value={data.revenu_exceptionnel_source}
            onChange={(e) => updateData({ revenu_exceptionnel_source: e.target.value })}
            placeholder="Prime, cadeau, vente..."
            className="mt-1.5"
          />
        </div>
      )}
    </div>
  );

  const OBJECTIFS = [
    { v: 'epargne', l: '💰 Épargner' },
    { v: 'dette', l: '🏦 Rembourser dettes' },
    { v: 'tenir', l: '⚖️ Tenir le mois' },
    { v: 'projet', l: '🎯 Financer un projet' },
    { v: 'investir', l: '📈 Investir' },
    { v: 'famille', l: '👨‍👩‍👧 Aider la famille' },
  ];

  const toggleObjectif = (v: string) => {
    updateData({
      objectifs: data.objectifs.includes(v)
        ? data.objectifs.filter(o => o !== v)
        : [...data.objectifs, v],
    });
  };

  const Step5 = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Heart className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Tes objectifs</h2>
      </div>
      <p className="text-sm text-muted-foreground">Que veux-tu accomplir ce mois ? (1 ou plusieurs)</p>
      <div className="grid grid-cols-2 gap-2">
        {OBJECTIFS.map(o => (
          <button
            key={o.v}
            onClick={() => toggleObjectif(o.v)}
            className={`p-3 rounded-xl text-sm font-medium text-left transition ${data.objectifs.includes(o.v) ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground'}`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );

  const Step6 = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Ta situation</h2>
      </div>
      <div>
        <Label className="mb-2 block">Tu vis :</Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'seul', l: 'Seul·e' },
            { v: 'couple', l: 'En couple' },
            { v: 'famille', l: 'En famille' },
          ] as const).map(opt => (
            <button
              key={opt.v}
              onClick={() => updateData({ situation_familiale: opt.v })}
              className={`p-3 rounded-xl text-sm font-medium transition ${data.situation_familiale === opt.v ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground'}`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Nombre de personnes à charge (toi inclus)</Label>
        <Input
          type="number" min={1} max={20}
          value={data.nb_personnes}
          onChange={(e) => updateData({ nb_personnes: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
          className="mt-1.5"
        />
      </div>
    </div>
  );

  const Step7 = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Tes habitudes</h2>
      </div>
      <p className="text-sm text-muted-foreground">Comment dépenses-tu généralement ?</p>
      <div className="space-y-2">
        {([
          { v: 'gros_achats', l: '🛒 Gros achats mensuels', d: 'Courses du mois, stock' },
          { v: 'petits_achats', l: '🥐 Petits achats quotidiens', d: 'Au jour le jour' },
          { v: 'mixte', l: '⚖️ Un mix des deux', d: 'Ça dépend' },
        ] as const).map(opt => (
          <button
            key={opt.v}
            onClick={() => updateData({ habitude_depense: opt.v })}
            className={`w-full p-3 rounded-xl text-left transition ${data.habitude_depense === opt.v ? 'gradient-primary text-primary-foreground' : 'glass'}`}
          >
            <p className="text-sm font-medium">{opt.l}</p>
            <p className={`text-xs ${data.habitude_depense === opt.v ? 'opacity-80' : 'text-muted-foreground'}`}>{opt.d}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const Step8 = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Calendar className="w-7 h-7 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Ce mois est-il spécial ?</h2>
      </div>
      <div className="space-y-2">
        {([
          { v: 'normal', l: '😌 Mois normal' },
          { v: 'rentree', l: '🎒 Rentrée scolaire' },
          { v: 'fetes', l: '🎉 Fêtes / Événement' },
          { v: 'voyage', l: '✈️ Voyage prévu' },
          { v: 'sante', l: '🏥 Frais santé' },
        ] as const).map(opt => (
          <button
            key={opt.v}
            onClick={() => updateData({ mois_special: opt.v })}
            className={`w-full p-3 rounded-xl text-left transition ${data.mois_special === opt.v ? 'gradient-primary text-primary-foreground' : 'glass'}`}
          >
            <p className="text-sm font-medium">{opt.l}</p>
          </button>
        ))}
      </div>
      {data.mois_special !== 'normal' && (
        <div>
          <Label>Note (optionnel)</Label>
          <Input
            value={data.mois_special_note}
            onChange={(e) => updateData({ mois_special_note: e.target.value })}
            placeholder="Précise..."
            className="mt-1.5"
          />
        </div>
      )}
    </div>
  );

  const Step9 = (
    <div className="space-y-4 py-4">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center mb-3"
        >
          <Check className="w-8 h-8 text-primary-foreground" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground">Récapitulatif</h2>
        <p className="text-sm text-muted-foreground">Vérifie avant de générer ton plan</p>
      </div>
      <div className="glass-card rounded-2xl p-4 space-y-2.5 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Revenu</span><span className="font-bold text-primary tabular-nums">{fmt(totalRevenu)} F</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Charges fixes</span><span className="font-medium text-foreground tabular-nums">- {fmt(totalCharges)} F</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Dettes</span><span className="font-medium text-foreground tabular-nums">- {fmt(data.dettes_mois)} F</span></div>
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-semibold text-foreground">Disponible</span>
          <span className={`font-black text-lg tabular-nums ${disponible > 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(disponible)} F</span>
        </div>
      </div>
      {disponible <= 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-xs text-destructive">
          ⚠️ Tes charges dépassent tes revenus. Le coach te proposera un plan d'urgence.
        </div>
      )}
      <Button
        onClick={generatePlan}
        disabled={generating}
        className="w-full gradient-primary text-primary-foreground h-12"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Génération en cours...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Générer mon plan</>
        )}
      </Button>
    </div>
  );

  const Step10 = generatedPlan && coachingId ? (
    <PlanValidationStep
      coachingId={coachingId}
      initialPlan={generatedPlan.repartition || []}
      totalBudget={Math.max(0, disponible)}
      context={data}
      month={month}
      year={year}
      onValidated={onComplete}
    />
  ) : null;

  const resetPlan = async () => {
    if (!user) return;
    try {
      // Supprimer les category_budgets du mois (catégories validées éventuelles)
      await supabase
        .from('category_budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year);

      // Supprimer la ligne coaching du mois
      if (coachingId) {
        await supabase.from('budget_coaching').delete().eq('id', coachingId);
      }

      // Reset état local
      setGeneratedPlan(null);
      setData(INITIAL_STATE);
      setStep(0);
      setCoachingId(null);

      // Recréer une ligne coaching vierge
      const { data: created } = await supabase
        .from('budget_coaching')
        .insert({ user_id: user.id, month, year, current_step: 0, statut: 'en_cours' })
        .select()
        .single();
      if (created) setCoachingId(created.id);

      sonnerToast.success('Plan annulé. Tu peux en générer un nouveau quand tu veux.');
    } catch (e: any) {
      sonnerToast.error("Impossible d'annuler le plan", { description: e?.message });
    }
  };

  const confirmReset = () => {
    sonnerToast('Abandonner ce plan ?', {
      description: 'Toutes les catégories non validées seront perdues.',
      duration: 10000,
      action: {
        label: 'Oui, annuler',
        onClick: () => resetPlan(),
      },
      cancel: {
        label: 'Non, continuer',
        onClick: () => {},
      },
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0: return Step0;
      case 1: return Step1;
      case 2: return Step2;
      case 3: return Step3;
      case 4: return Step4;
      case 5: return Step5;
      case 6: return Step6;
      case 7: return Step7;
      case 8: return Step8;
      case 9: return Step9;
      case 10: return Step10;
      default: return null;
    }
  };

  return (
    <div className="max-w-md mx-auto pb-8">
      {step > 0 && step < 9 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Étape {step}/8</span>
            <span className="text-xs text-muted-foreground">{Math.round((step / 8) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(step / 8) * 100}%` }}
              className="h-full gradient-primary"
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {step > 0 && step < 9 && (
        <div className="flex gap-2 mt-6">
          <Button onClick={goBack} variant="outline" className="flex-1 glass">
            <ChevronLeft className="w-4 h-4 mr-1" /> Retour
          </Button>
          <Button onClick={goNext} className="flex-1 gradient-primary text-primary-foreground">
            Suivant <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default BudgetCoachingFlow;
