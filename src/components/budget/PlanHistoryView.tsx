import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  History, Edit3, CheckCircle2, Sparkles, TrendingUp,
} from 'lucide-react';
import { formatMoneyDisplay } from '@/lib/formatAmount';

interface Props {
  coachingId: string;
}

const actionLabels: Record<string, string> = {
  modified: 'Montant modifié',
  validated: 'Catégorie validée',
  rebalanced_auto: 'Rééquilibrage automatique',
  rebalanced_manual: 'Rééquilibrage manuel',
  budget_increased: 'Budget total augmenté',
  category_added: 'Catégorie ajoutée',
};

const actionIcons: Record<string, any> = {
  modified: Edit3,
  validated: CheckCircle2,
  rebalanced_auto: Sparkles,
  rebalanced_manual: Edit3,
  budget_increased: TrendingUp,
  category_added: Sparkles,
};

export const PlanHistoryView = ({ coachingId }: Props) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('budget_plan_history')
        .select('*')
        .eq('coaching_id', coachingId)
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory(data || []);
      setLoading(false);
    };
    load();
  }, [coachingId]);

  if (loading) return null;
  if (history.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-4">
        Aucune modification enregistrée
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Historique des modifications
        </h3>
      </div>

      {history.map(h => {
        const Icon = actionIcons[h.action] || History;
        return (
          <div key={h.id} className="glass-card rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {actionLabels[h.action] || h.action}
              </p>
              {h.category_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {h.category_name}
                  {h.amount_before !== null && h.amount_after !== null && (
                    <span className="ml-1">
                      · {formatMoneyDisplay(h.amount_before)} → {formatMoneyDisplay(h.amount_after)}
                    </span>
                  )}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(h.created_at).toLocaleString('fr-FR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlanHistoryView;
