import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { formatMoneyDisplay } from '@/lib/formatAmount';
import {
  Check, CheckCircle2, Edit3, Sparkles, Loader2,
  AlertTriangle, RotateCcw, X,
} from 'lucide-react';

interface PlanItem {
  categorie: string;
  montant: number;
  pourcentage: number;
  original: number;
  validated: boolean;
  modified: boolean;
}

interface AIRebalanceOption {
  id: 'A' | 'B' | 'C';
  title: string;
  description: string;
  changes: Array<{ category: string; from: number; to: number; diff: number }>;
  result_total: number;
  new_total_budget?: number;
}

interface AIRebalanceResponse {
  summary: string;
  recommended: 'A' | 'B' | 'C';
  options: AIRebalanceOption[];
}

interface Props {
  coachingId: string;
  initialPlan: any[];
  totalBudget: number;
  context: any;
  month: number;
  year: number;
  onValidated: () => void;
  onReset?: () => void;
}

export const PlanValidationStep = ({
  coachingId, initialPlan, totalBudget, context, month, year, onValidated, onReset,
}: Props) => {
  const { user } = useAuth();

  const [plan, setPlan] = useState<PlanItem[]>(() => initialPlan.map((p: any) => ({
    categorie: p.categorie,
    montant: Number(p.montant) || 0,
    pourcentage: Number(p.pourcentage) || 0,
    original: Number(p.montant) || 0,
    validated: false,
    modified: false,
  })));

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [budgetTotal, setBudgetTotal] = useState(totalBudget);

  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [rebalanceData, setRebalanceData] = useState<AIRebalanceResponse | null>(null);
  const [pendingChange, setPendingChange] = useState<{
    category: string; newAmount: number; originalAmount: number;
  } | null>(null);

  const [finalizing, setFinalizing] = useState(false);

  const sumPlan = useMemo(() => plan.reduce((s, p) => s + p.montant, 0), [plan]);
  const difference = sumPlan - budgetTotal;
  const tolerance = Math.max(100, Math.round(budgetTotal * 0.01));
  const isBalanced = Math.abs(difference) <= tolerance;
  const isOverBudget = difference > 0;
  const validatedCount = plan.filter(p => p.validated).length;

  const logHistory = useCallback(async (action: string, details: any) => {
    if (!user) return;
    await supabase.from('budget_plan_history').insert({
      user_id: user.id,
      coaching_id: coachingId,
      month, year,
      action,
      category_name: details.category || null,
      amount_before: details.before ?? null,
      amount_after: details.after ?? null,
      difference: details.diff ?? null,
      ai_suggestion: details.suggestion || null,
      applied: details.applied !== false,
    });
  }, [user, coachingId, month, year]);

  const startEdit = (category: string) => {
    const item = plan.find(p => p.categorie === category);
    if (!item || item.validated) return;
    setEditingCategory(category);
    setEditValue(item.montant);
  };

  const fetchRebalanceSuggestions = async (
    category: string, newAmount: number, originalAmount: number, currentPlan: PlanItem[]
  ) => {
    setRebalanceLoading(true);
    setRebalanceOpen(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/budget-rebalance-suggest`;

      const validatedCategories = currentPlan.filter(p => p.validated).map(p => p.categorie);
      const planForAI = currentPlan
        .filter(p => p.categorie !== category)
        .map(p => ({ categorie: p.categorie, montant: p.montant }));

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modifiedCategory: category,
          newAmount, originalAmount,
          currentPlan: planForAI,
          totalBudget: budgetTotal,
          context,
          validatedCategories,
        }),
      });

      if (!res.ok) throw new Error('Erreur IA');
      const result: AIRebalanceResponse = await res.json();
      setRebalanceData(result);
    } catch (e) {
      toast({
        title: 'Erreur IA',
        description: 'Impossible de générer des suggestions',
        variant: 'destructive',
      });
      setRebalanceOpen(false);
    } finally {
      setRebalanceLoading(false);
    }
  };

  const confirmEdit = async () => {
    if (!editingCategory) return;
    const item = plan.find(p => p.categorie === editingCategory);
    if (!item) return;

    const newAmount = Math.max(0, editValue);
    if (newAmount === item.montant) {
      setEditingCategory(null);
      return;
    }

    const oldAmount = item.montant;
    const diff = newAmount - oldAmount;

    const updatedPlan = plan.map(p =>
      p.categorie === editingCategory
        ? {
            ...p,
            montant: newAmount,
            pourcentage: budgetTotal > 0 ? Math.round((newAmount / budgetTotal) * 100) : 0,
            modified: newAmount !== p.original,
          }
        : p
    );
    setPlan(updatedPlan);
    setEditingCategory(null);

    await logHistory('modified', {
      category: editingCategory, before: oldAmount, after: newAmount, diff,
    });

    const newSum = updatedPlan.reduce((s, p) => s + p.montant, 0);
    if (Math.abs(newSum - budgetTotal) > 100) {
      setPendingChange({ category: editingCategory, newAmount, originalAmount: oldAmount });
      await fetchRebalanceSuggestions(editingCategory, newAmount, oldAmount, updatedPlan);
    } else {
      toast({
        title: `${editingCategory} mis à jour`,
        description: `${formatMoneyDisplay(newAmount)}`,
      });
    }
  };

  const applyRebalanceOption = async (option: AIRebalanceOption) => {
    if (!pendingChange) return;
    let updatedPlan = [...plan];

    for (const change of option.changes) {
      updatedPlan = updatedPlan.map(p =>
        p.categorie === change.category
          ? {
              ...p,
              montant: change.to,
              pourcentage: budgetTotal > 0 ? Math.round((change.to / budgetTotal) * 100) : 0,
              modified: change.to !== p.original,
            }
          : p
      );
    }

    if (option.id === 'C' && option.new_total_budget) {
      const nb = option.new_total_budget;
      setBudgetTotal(nb);
      updatedPlan = updatedPlan.map(p => ({
        ...p,
        pourcentage: nb > 0 ? Math.round((p.montant / nb) * 100) : 0,
      }));
    }

    setPlan(updatedPlan);
    setRebalanceOpen(false);
    setRebalanceData(null);
    setPendingChange(null);

    await logHistory(
      option.id === 'A' ? 'rebalanced_auto'
        : option.id === 'B' ? 'rebalanced_manual'
        : 'budget_increased',
      { category: pendingChange.category, suggestion: option }
    );

    toast({ title: 'Plan rééquilibré ✅', description: option.title });
  };

  const validateCategory = async (category: string) => {
    setPlan(plan.map(p => p.categorie === category ? { ...p, validated: true } : p));
    await logHistory('validated', { category });
    toast({ title: `${category} validé ✓` });
  };

  const unvalidateCategory = (category: string) => {
    setPlan(plan.map(p => p.categorie === category ? { ...p, validated: false } : p));
  };

  const resetCategory = (category: string) => {
    const item = plan.find(p => p.categorie === category);
    if (!item) return;
    setPlan(plan.map(p =>
      p.categorie === category
        ? {
            ...p,
            montant: p.original,
            pourcentage: budgetTotal > 0 ? Math.round((p.original / budgetTotal) * 100) : 0,
            modified: false,
          }
        : p
    ));
    toast({ title: `${category} restauré à ${formatMoneyDisplay(item.original)}` });
  };

  const removeCategory = (category: string) => {
    const removed = plan.find(p => p.categorie === category);
    if (!removed) return;

    // Snapshot pour undo (1 seul à la fois — annule le précédent toast)
    const snapshot = plan;
    sonnerToast.dismiss('plan-remove-undo');

    const remaining = plan.filter(p => p.categorie !== category);
    let nextPlan: PlanItem[];

    if (remaining.length === 0) {
      nextPlan = [];
    } else {
      const removedAmount = removed.montant;
      const remainingSum = remaining.reduce((s, p) => s + p.montant, 0);

      let redistributed: PlanItem[];
      if (remainingSum > 0) {
        redistributed = remaining.map(p => {
          const share = p.montant / remainingSum;
          const newMontant = Math.round(p.montant + removedAmount * share);
          return {
            ...p,
            montant: newMontant,
            pourcentage: budgetTotal > 0 ? Math.round((newMontant / budgetTotal) * 100) : 0,
            modified: newMontant !== p.original,
          };
        });
      } else {
        const equal = Math.round(removedAmount / remaining.length);
        redistributed = remaining.map(p => ({
          ...p,
          montant: equal,
          pourcentage: budgetTotal > 0 ? Math.round((equal / budgetTotal) * 100) : 0,
          modified: equal !== p.original,
        }));
      }

      // Correction d'arrondi : ajuster la première catégorie pour conserver le total
      const targetTotal = remainingSum + removedAmount;
      const newSum = redistributed.reduce((s, p) => s + p.montant, 0);
      const diff = targetTotal - newSum;
      if (diff !== 0 && redistributed.length > 0) {
        redistributed[0] = {
          ...redistributed[0],
          montant: Math.max(0, redistributed[0].montant + diff),
        };
        redistributed[0].pourcentage = budgetTotal > 0
          ? Math.round((redistributed[0].montant / budgetTotal) * 100)
          : 0;
      }
      nextPlan = redistributed;
    }

    setPlan(nextPlan);

    let undone = false;
    sonnerToast(`${category} supprimée`, {
      id: 'plan-remove-undo',
      description: 'Montants redistribués sur les autres catégories.',
      duration: 5000,
      action: {
        label: 'Annuler',
        onClick: () => {
          undone = true;
          setPlan(snapshot);
          sonnerToast.success(`${category} restaurée`);
        },
      },
      onAutoClose: () => {
        if (!undone) {
          logHistory('removed', { category, before: removed.montant, after: 0, diff: -removed.montant });
        }
      },
      onDismiss: () => {
        if (!undone) {
          logHistory('removed', { category, before: removed.montant, after: 0, diff: -removed.montant });
        }
      },
    });
  };

  const finalizeAll = async () => {
    if (!isBalanced) {
      toast({
        title: 'Plan déséquilibré',
        description: isOverBudget
          ? `Tu dépasses de ${formatMoneyDisplay(difference)}`
          : `Il reste ${formatMoneyDisplay(-difference)} à allouer`,
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;
    setFinalizing(true);

    try {
      await supabase.from('budget_coaching').update({
        plan_genere: {
          repartition: plan.map(p => ({
            categorie: p.categorie,
            montant: p.montant,
            pourcentage: p.pourcentage,
          })),
        } as any,
        validated_categories: plan.map(p => p.categorie) as any,
        modified_categories: Object.fromEntries(
          plan.filter(p => p.modified).map(p => [
            p.categorie, { original: p.original, current: p.montant }
          ])
        ) as any,
        statut: 'approuve',
      }).eq('id', coachingId);

      const { data: existingBudget } = await supabase
        .from('budgets').select('id')
        .eq('user_id', user.id).eq('month', month).eq('year', year)
        .maybeSingle();

      if (existingBudget) {
        await supabase.from('budgets').update({ total_budget: budgetTotal }).eq('id', existingBudget.id);
      } else {
        await supabase.from('budgets').insert({
          user_id: user.id, month, year, total_budget: budgetTotal,
        });
      }

      for (const item of plan) {
        let { data: cat } = await supabase
          .from('categories').select('id')
          .eq('user_id', user.id).ilike('name', item.categorie)
          .maybeSingle();

        if (!cat) {
          const { data: newCat } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: item.categorie,
              type: 'expense',
              icon: 'MoreHorizontal',
              color: 'hsl(0,0%,60%)',
            })
            .select('id').single();
          cat = newCat;
        }

        if (cat) {
          const { data: existingCb } = await supabase
            .from('category_budgets').select('id')
            .eq('user_id', user.id).eq('category_id', cat.id)
            .eq('month', month).eq('year', year)
            .maybeSingle();

          if (existingCb) {
            await supabase.from('category_budgets')
              .update({ budget_amount: item.montant })
              .eq('id', existingCb.id);
          } else {
            await supabase.from('category_budgets').insert({
              user_id: user.id, category_id: cat.id, month, year,
              budget_amount: item.montant,
            });
          }
        }
      }

      toast({ title: 'Plan validé ✅', description: 'Ton budget personnalisé est actif' });
      onValidated();
    } catch (e: any) {
      toast({ title: 'Erreur finalisation', description: e?.message, variant: 'destructive' });
    } finally {
      setFinalizing(false);
    }
  };

  const progressPct = budgetTotal > 0 ? Math.min(100, (sumPlan / budgetTotal) * 100) : 0;

  return (
    <div className="space-y-4 pb-8">
      {/* Header récap */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Budget total</p>
            <p className="text-lg font-bold text-foreground tabular-nums">{formatMoneyDisplay(budgetTotal)}</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isBalanced
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse'
            }`}
          >
            {isBalanced
              ? 'Équilibré ✓'
              : `Déséquilibré ${isOverBudget ? '+' : '−'}${formatMoneyDisplay(Math.abs(difference))}`}
          </span>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Alloué</p>
            <p className={`text-lg font-bold tabular-nums ${
              isBalanced ? 'text-primary' : isOverBudget ? 'text-destructive' : 'text-[hsl(45,96%,58%)]'
            }`}>
              {formatMoneyDisplay(sumPlan)}
            </p>
          </div>
        </div>

        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isBalanced ? 'gradient-primary' : isOverBudget ? 'bg-destructive' : 'bg-[hsl(45,96%,58%)]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{validatedCount}/{plan.length} validées</span>
          <span className={isBalanced ? 'text-primary font-medium' : isOverBudget ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {isOverBudget
              ? `Dépassement ${formatMoneyDisplay(difference)}`
              : isBalanced ? '✓ Équilibré' : `Reste ${formatMoneyDisplay(-difference)} à allouer`}
          </span>
        </div>
      </div>

      {/* Liste des catégories */}
      <div className="space-y-2">
        {plan.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-border space-y-3">
            <p className="text-foreground font-semibold">Plus aucune catégorie</p>
            <p className="text-sm text-muted-foreground">
              Recommence ou génère un nouveau plan pour planifier ton mois.
            </p>
            <Button
              onClick={() => onReset?.()}
              disabled={!onReset}
              className="gradient-primary text-primary-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Nouveau plan
            </Button>
          </div>
        ) : plan.map((item) => {
          const isEditing = editingCategory === item.categorie;
          return (
            <motion.div
              key={item.categorie}
              layout
              className={`glass-card rounded-2xl p-4 space-y-3 border ${
                item.validated ? 'border-primary/40 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{item.categorie}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{item.pourcentage}%</span>
                  {item.modified && !item.validated && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(45,96%,58%)]/20 text-[hsl(45,96%,58%)] font-medium">
                      Modifié
                    </span>
                  )}
                  {item.validated && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </div>
                {!item.validated && (
                  <button
                    onClick={() => removeCategory(item.categorie)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive shrink-0"
                    title="Supprimer et redistribuer"
                    aria-label="Supprimer cette catégorie"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <MoneyInput
                    value={editValue}
                    onChange={(v) => setEditValue(v)}
                    placeholder="Montant"
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="sm" onClick={confirmEdit} className="gradient-primary text-primary-foreground">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)} className="glass">
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {formatMoneyDisplay(item.montant)}
                  </p>
                  <div className="flex items-center gap-1">
                    {!item.validated && (
                      <button
                        onClick={() => startEdit(item.categorie)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                    {item.modified && !item.validated && (
                      <button
                        onClick={() => resetCategory(item.categorie)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        title="Restaurer"
                      >
                        <RotateCcw className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {item.modified && (
                <p className="text-[11px] text-muted-foreground">
                  Initial : {formatMoneyDisplay(item.original)}
                </p>
              )}

              {!isEditing && (
                item.validated ? (
                  <button
                    onClick={() => unvalidateCategory(item.categorie)}
                    className="w-full text-xs text-muted-foreground py-1 flex items-center justify-center gap-1 hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Annuler la validation
                  </button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => validateCategory(item.categorie)}
                    className="w-full gradient-primary text-primary-foreground"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Valider cette catégorie
                  </Button>
                )
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Boutons globaux */}
      <div className="space-y-2 pt-2">
        <Button
          onClick={finalizeAll}
          disabled={finalizing || !isBalanced}
          className="w-full h-12 gradient-primary text-primary-foreground font-bold"
        >
          {finalizing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalisation...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Tout approuver et activer le budget</>
          )}
        </Button>

        <p className={`text-center text-xs ${
          isBalanced ? 'text-primary' : isOverBudget ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {isBalanced
            ? '✓ Le plan est équilibré, tu peux finaliser'
            : isOverBudget
              ? `⚠️ Tu dépasses ton budget de ${formatMoneyDisplay(difference)}`
              : `💡 Il reste ${formatMoneyDisplay(-difference)} à allouer`}
        </p>
      </div>

      {/* Modal IA rééquilibrage */}
      <AnimatePresence>
        {rebalanceOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!rebalanceLoading) setRebalanceOpen(false); }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl p-6 border border-border shadow-2xl bg-card max-h-[85vh] overflow-y-auto"
            >
              {rebalanceLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    L'IA analyse ton plan et propose les meilleures options...
                  </p>
                </div>
              ) : rebalanceData ? (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-foreground">Comment équilibrer ?</h3>
                      <p className="text-xs text-muted-foreground mt-1">{rebalanceData.summary}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {rebalanceData.options.map(option => {
                      const isRecommended = option.id === rebalanceData.recommended;
                      return (
                        <button
                          key={option.id}
                          onClick={() => applyRebalanceOption(option)}
                          className={`w-full text-left p-4 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                            isRecommended
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border glass'
                          }`}
                        >
                          {isRecommended && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium inline-block mb-2">
                              ⭐ Recommandé
                            </span>
                          )}
                          <p className="font-semibold text-foreground text-sm">{option.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{option.description}</p>

                          {option.changes.length > 0 && (
                            <div className="mt-3 space-y-1.5 border-t border-border pt-2">
                              {option.changes.map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground truncate">{c.category}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-muted-foreground tabular-nums">{formatMoneyDisplay(c.from)}</span>
                                    <span>→</span>
                                    <span className={`font-medium tabular-nums ${c.diff > 0 ? 'text-primary' : 'text-destructive'}`}>
                                      {formatMoneyDisplay(c.to)}
                                    </span>
                                    <span className={`text-[10px] tabular-nums ${c.diff > 0 ? 'text-primary' : 'text-destructive'}`}>
                                      ({c.diff > 0 ? '+' : ''}{formatMoneyDisplay(c.diff)})
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setRebalanceOpen(false)}
                    className="w-full mt-4 text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
                  >
                    Garder mon changement sans rééquilibrer
                  </button>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlanValidationStep;
