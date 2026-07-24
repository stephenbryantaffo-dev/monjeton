// Rappels dettes → push web quand une échéance approche (J-1 / J0 / retard).
//
// Anti-spam
//   - Max 1 push / jour / utilisateur pour le type debt_reminder (dedupKey = date du jour).
//   - Si plusieurs dettes matchent, on regroupe dans une seule notification.
//
// Auth : token cron partagé.

import { getCorsHeaders as _getCorsHeaders } from "../_shared/cors.ts";
import {
  checkCronToken,
  makeServiceClient,
  sendPushWithGuard,
  todayKey,
} from "../_shared/push.ts";

function corsHeaders(req: Request) {
  const h = _getCorsHeaders(req);
  h["Access-Control-Allow-Headers"] =
    (h["Access-Control-Allow-Headers"] || "") + ", x-cron-token";
  return h;
}

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

  const today = todayKey();
  const tomorrow = todayKey(new Date(Date.now() + 24 * 60 * 60 * 1000));

  // Échéances non payées, dues aujourd'hui/demain ou en retard.
  const { data: inst, error } = await supabase
    .from("debt_installments")
    .select("id, debt_id, due_date, status")
    .in("status", ["pending", "partial", "overdue"])
    .lte("due_date", tomorrow)
    .limit(5000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Charger les dettes correspondantes (user_id).
  const debtIds = [...new Set((inst || []).map((i) => i.debt_id))];
  if (debtIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: debts } = await supabase
    .from("debts")
    .select("id, user_id")
    .in("id", debtIds);
  const debtOwner = new Map<string, string>();
  for (const d of debts || []) debtOwner.set(d.id, d.user_id);

  // Regrouper par user
  const byUser = new Map<string, { overdue: number; today: number; tomorrow: number }>();
  for (const i of inst || []) {
    const uid = debtOwner.get(i.debt_id);
    if (!uid) continue;
    const bucket = byUser.get(uid) || { overdue: 0, today: 0, tomorrow: 0 };
    if (i.due_date < today || i.status === "overdue") bucket.overdue++;
    else if (i.due_date === today) bucket.today++;
    else if (i.due_date === tomorrow) bucket.tomorrow++;
    byUser.set(uid, bucket);
  }

  let pushed = 0;
  let skipped = 0;
  for (const [uid, b] of byUser.entries()) {
    if (b.overdue + b.today + b.tomorrow === 0) continue;

    const parts: string[] = [];
    if (b.overdue > 0) parts.push(`${b.overdue} en retard`);
    if (b.today > 0) parts.push(`${b.today} pour aujourd'hui`);
    if (b.tomorrow > 0) parts.push(`${b.tomorrow} pour demain`);

    const title = b.overdue > 0 ? "⏰ Échéances de dette en retard" : "💳 Échéance de dette à venir";
    const body = `Tu as ${parts.join(", ")}. Ouvre la section Dettes pour vérifier.`;

    const res = await sendPushWithGuard(supabase, {
      userId: uid,
      notificationType: "debt_reminder",
      dedupKey: today, // 1/jour/user
      payload: { title, body, url: "/dettes", tag: `debt-${today}` },
    });
    if (res.skipped) skipped++;
    if (res.sent > 0) pushed++;
  }

  return new Response(
    JSON.stringify({ ok: true, users: byUser.size, pushed, skipped }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});
