import { supabase } from '@/integrations/supabase/client';
import { formatMoneyDisplay } from '@/lib/formatAmount';

interface CheckParams {
  userId: string;
  userPhone: string | null;
  month: number;
  year: number;
  silent?: boolean;
}

type AlertType = '80pct' | '100pct';

interface AlertItem {
  category: string;
  type: AlertType;
  spent: number;
  budget: number;
  catId: string;
}

export const checkBudgetWhatsappAlerts = async ({
  userId,
  userPhone,
  month,
  year,
  silent = false,
}: CheckParams): Promise<AlertItem[]> => {
  if (!userPhone) return [];

  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const endOfMonth =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const { data: budgets } = await supabase
    .from('category_budgets')
    .select('*, categories(name)')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year);

  if (!budgets || budgets.length === 0) return [];

  const alertsToSend: AlertItem[] = [];

  for (const b of budgets) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_id', b.category_id)
      .eq('type', 'expense')
      .gte('date', startOfMonth)
      .lt('date', endOfMonth);

    const spent = (txs || []).reduce(
      (s, t) => s + Number(t.amount),
      0
    );
    const budget = Number(b.budget_amount) || 0;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;

    let alertType: AlertType | null = null;
    if (pct >= 100) alertType = '100pct';
    else if (pct >= 80) alertType = '80pct';
    if (!alertType) continue;

    const { data: existing } = await supabase
      .from('budget_alerts_sent')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', b.category_id)
      .eq('month', month)
      .eq('year', year)
      .eq('alert_type', alertType)
      .maybeSingle();

    if (existing) continue;

    alertsToSend.push({
      category: (b as any).categories?.name || 'Catégorie',
      type: alertType,
      spent,
      budget,
      catId: b.category_id,
    });
  }

  for (const alert of alertsToSend) {
    const message = buildAlertMessage(alert);

    // Marquer envoyée AVANT d'ouvrir, pour éviter doublons
    await supabase.from('budget_alerts_sent').insert({
      user_id: userId,
      category_id: alert.catId,
      month,
      year,
      alert_type: alert.type,
    });

    if (!silent) {
      let phone = userPhone.replace(/\s/g, '').replace(/[^\d+]/g, '');
      if (phone.startsWith('+')) phone = phone.slice(1);
      if (phone.startsWith('0')) phone = '225' + phone.slice(1);
      if (!/^\d{8,15}$/.test(phone)) continue;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  }

  return alertsToSend;
};

function buildAlertMessage(alert: AlertItem): string {
  const remaining = Math.max(0, alert.budget - alert.spent);
  const exceeded = Math.max(0, alert.spent - alert.budget);

  if (alert.type === '100pct') {
    return (
      `🚨 *Budget ${alert.category} dépassé !*\n\n` +
      `Tu as dépensé *${formatMoneyDisplay(alert.spent)}* sur un budget de *${formatMoneyDisplay(alert.budget)}*.\n\n` +
      `Dépassement : *${formatMoneyDisplay(exceeded)}*\n\n` +
      `_Sois vigilant pour la fin du mois._\n\n` +
      `🪙 Mon Jeton — monjeton.app`
    );
  }

  return (
    `⚠️ *Budget ${alert.category} à 80%*\n\n` +
    `Tu as dépensé *${formatMoneyDisplay(alert.spent)}* sur ${formatMoneyDisplay(alert.budget)}.\n\n` +
    `Plus que *${formatMoneyDisplay(remaining)}* disponibles ce mois.\n\n` +
    `_Pense à ralentir pour rester dans les clous._\n\n` +
    `🪙 Mon Jeton — monjeton.app`
  );
}
