// Traitement d'une transaction Jèko déjà parsée : matching utilisateur,
// log dans jeko_payments (idempotent via la contrainte unique sur txn_id),
// et activation de l'abonnement. Partagé entre le webhook (temps réel) et
// le job de réconciliation (filet de sécurité qui interroge l'API Jèko).
import { matchProfileByPhone, type ParsedJekoTx } from './jeko-parse.ts';

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export type ProcessOutcome =
  | { action: 'ignored' }
  | { action: 'duplicate' }
  | { action: 'unmatched' }
  | { action: 'activated'; userId: string };

export async function processJekoTransaction(
  supabase: SupabaseLike,
  parsed: ParsedJekoTx,
  rawPayload: unknown,
  source: 'webhook' | 'reconcile'
): Promise<ProcessOutcome> {
  if (!parsed.isPayment || parsed.status !== 'success') {
    return { action: 'ignored' };
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, phone')
    .not('phone', 'is', null);
  const userId = matchProfileByPhone(profiles ?? [], parsed.phoneRaw);

  // Insertion idempotente : la contrainte unique sur txn_id (quand non vide)
  // fait que deux appels concurrents (webhook + réconciliation) sur la même
  // transaction ne l'activent/loggent qu'une seule fois.
  if (parsed.txnId) {
    const { data: insertedRows, error: insErr } = await supabase
      .from('jeko_payments')
      .upsert(
        {
          txn_id: parsed.txnId,
          phone: parsed.phoneRaw,
          amount: parsed.amountXof,
          raw_amount: parsed.rawAmount,
          plan_name: parsed.planName,
          payment_link_id: parsed.paymentLinkId,
          reference: parsed.reference,
          matched_user_id: userId,
          raw_payload: rawPayload,
          source,
        },
        { onConflict: 'txn_id', ignoreDuplicates: true }
      )
      .select('id');
    if (insErr) throw insErr;
    if (!insertedRows || insertedRows.length === 0) {
      return { action: 'duplicate' };
    }
  } else {
    // Pas d'identifiant de transaction utilisable pour dédupliquer : on log
    // quand même, pour ne pas perdre le paiement en réconciliation manuelle.
    await supabase.from('jeko_payments').insert({
      txn_id: null,
      phone: parsed.phoneRaw,
      amount: parsed.amountXof,
      raw_amount: parsed.rawAmount,
      plan_name: parsed.planName,
      payment_link_id: parsed.paymentLinkId,
      reference: parsed.reference,
      matched_user_id: userId,
      raw_payload: rawPayload,
      source,
    });
  }

  if (!userId) {
    return { action: 'unmatched' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const graceUntil = new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { error: upErr } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      status: 'active',
      plan_name: parsed.planName,
      price_xof: parsed.priceXof,
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      grace_until: graceUntil.toISOString(),
      last_reminder_sent: null,
      updated_at: now.toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (upErr) throw upErr;

  return { action: 'activated', userId };
}
