// Alertes budget → push web quand un budget dépasse 70 / 90 / 100 % du plafond.
//
// Anti-spam
//   - 1 notification par seuil (70, 90, 100) par mois par budget (dedupKey inclut YYYY-MM).
//   - Le garde d'unicité (unique index sur push_notifications_log) empêche les doublons.
//
// Auth : token cron (x-cron-token) partagé avec les autres jobs de rappel.

import { getCorsHeaders as _getCorsHeaders } from "../_shared/cors.ts";
import {
  checkCronToken,
  makeServiceClient,
  monthKey,
  sendPushWithGuard,
} from "../_shared/push.ts";

function corsHeaders(req: Request) {
  const h = _getCorsHeaders(req);
  h["Access-Control-Allow-Headers"] =
    (h["Access-Control-Allow-Headers"] || "") + ", x-cron-token";
  return h;
}

const THRESHOLDS = [70, 90, 100] as const;

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = makeServiceClient();
  if (!(await checkCronToken(supabase, req))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const month = monthKey(now);
  const monthStart = `${month}-01`;

  // Budgets actifs (colonnes déduites : user_id, amount / limit, category_id/name).
  const { data: budgets, error } = await supabase
    .from("budgets")
    .select("id, user_id, amount, category, name")
    .limit(5000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let pushed = 0;
  let skipped = 0;

  for (const b of budgets || []) {
    const limit = Number(b.amount || 0);
    if (limit <= 0) continue;

    // Somme des dépenses du mois pour ce budget (par catégorie).
    let spent = 0;
    const { data: tx } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", b.user_id)
      .eq("type", "expense")
      .gte("date", monthStart)
      .filter("category", "eq", b.category);
    spent = (tx || []).reduce((s, t) => s + Number(t.amount || 0), 0);

    const pct = Math.round((spent / limit) * 100);
    // Sélectionne le plus haut seuil franchi (100 > 90 > 70).
    const crossed = [...THRESHOLDS].reverse().find((t) => pct >= t);
    if (!crossed) continue;

    const emoji = crossed === 100 ? "🔴" : crossed === 90 ? "🟠" : "🟡";
    const label = b.name || b.category || "budget";

    const result = await sendPushWithGuard(supabase, {
      userId: b.user_id,
      notificationType: "budget_alert",
      dedupKey: `budget:${b.id}:${crossed}:${month}`,
      payload: {
        title: `${emoji} Budget ${label} à ${pct}%`,
        body:
          crossed === 100
            ? `Tu as atteint ton plafond du mois. Attention aux prochaines dépenses.`
            : `Il te reste peu de marge sur ce budget ce mois-ci.`,
        url: "/planification",
        tag: `budget-${b.id}-${crossed}-${month}`,
      },
    });
    processed++;
    if (result.skipped) skipped++;
    if (result.sent > 0) pushed++;
  }

  return new Response(
    JSON.stringify({ ok: true, processed, pushed, skipped }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});
