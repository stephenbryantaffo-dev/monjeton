import { supabase } from "@/integrations/supabase/client";

export type DebtHistoryAction =
  | "edit"
  | "loan_increased"
  | "status_change"
  | "plan_change"
  | "installment_paid";

export async function logDebtChange(params: {
  debtId: string;
  userId: string;
  action: DebtHistoryAction;
  field?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  note?: string | null;
}) {
  const { debtId, userId, action, field, oldValue, newValue, note } = params;
  await supabase.from("debt_history").insert({
    debt_id: debtId,
    user_id: userId,
    action,
    field: field || null,
    old_value: oldValue == null ? null : String(oldValue),
    new_value: newValue == null ? null : String(newValue),
    note: note || null,
  });
}

/**
 * Affecte un montant payé aux échéances en attente (FIFO sur due_date / order_index).
 * Met à jour leur paid_amount et statut.
 */
export async function applyPaymentToInstallments(
  debtId: string,
  amount: number
): Promise<void> {
  let remaining = amount;
  const { data: installments } = await supabase
    .from("debt_installments")
    .select("id, expected_amount, paid_amount, status, due_date")
    .eq("debt_id", debtId)
    .in("status", ["pending", "partial", "overdue"])
    .order("due_date", { ascending: true })
    .order("order_index", { ascending: true });

  if (!installments || installments.length === 0) return;

  for (const ins of installments) {
    if (remaining <= 0) break;
    const expected = Number(ins.expected_amount);
    const paid = Number(ins.paid_amount || 0);
    const need = Math.max(0, expected - paid);
    if (need <= 0) continue;
    const apply = Math.min(remaining, need);
    const newPaid = paid + apply;
    const newStatus = newPaid >= expected ? "paid" : "partial";
    await supabase
      .from("debt_installments")
      .update({ paid_amount: newPaid, status: newStatus })
      .eq("id", ins.id);
    remaining -= apply;
  }
}

/**
 * Marque les échéances dépassées (date < aujourd'hui et non payées) en `overdue`.
 */
export async function markOverdueInstallments(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("debt_installments")
    .update({ status: "overdue" })
    .eq("user_id", userId)
    .lt("due_date", today)
    .in("status", ["pending", "partial"]);
}

/**
 * Génère un échéancier auto.
 */
export interface InstallmentSeed {
  due_date: string;
  expected_amount: number;
  order_index: number;
}

export function generateInstallments(opts: {
  total: number;
  count: number;
  frequency: "weekly" | "biweekly" | "monthly";
  startDate: string;
}): InstallmentSeed[] {
  const { total, count, frequency, startDate } = opts;
  if (count <= 0 || total <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  const start = new Date(startDate);
  const out: InstallmentSeed[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    if (frequency === "weekly") d.setDate(start.getDate() + i * 7);
    else if (frequency === "biweekly") d.setDate(start.getDate() + i * 14);
    else d.setMonth(start.getMonth() + i);
    out.push({
      due_date: d.toISOString().slice(0, 10),
      expected_amount: i === count - 1 ? base + remainder : base,
      order_index: i,
    });
  }
  return out;
}
