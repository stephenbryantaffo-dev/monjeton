// Rappels tontines → push web pour les cycles avec cotisations manquantes.
//
// Anti-spam
//   - Cible UNIQUEMENT le propriétaire/manager de la tontine (pas tous les membres).
//     On lit caisse_collaborators où role ∈ ('owner','manager').
//   - Max 1 push / jour / user pour le type tontine_reminder (dedupKey = date du jour).
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

  // Cycles actifs, non complets.
  const { data: cycles, error } = await supabase
    .from("tontine_cycles")
    .select("id, tontine_id, total_expected, total_collected, status")
    .in("status", ["active", "in_progress", "pending"])
    .limit(2000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Grouper cycles à relancer par tontine.
  const tontineIncomplete = new Map<string, number>(); // tontine_id → % restant
  for (const c of cycles || []) {
    const exp = Number(c.total_expected || 0);
    const got = Number(c.total_collected || 0);
    if (exp <= 0 || got >= exp) continue;
    const pctMissing = Math.round(((exp - got) / exp) * 100);
    const prev = tontineIncomplete.get(c.tontine_id) || 0;
    if (pctMissing > prev) tontineIncomplete.set(c.tontine_id, pctMissing);
  }

  if (tontineIncomplete.size === 0) {
    return new Response(JSON.stringify({ ok: true, tontines: 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const tontineIds = [...tontineIncomplete.keys()];
  const { data: managers } = await supabase
    .from("caisse_collaborators")
    .select("caisse_id, user_id, role")
    .in("caisse_id", tontineIds)
    .in("role", ["owner", "manager"]);

  const today = todayKey();
  let pushed = 0;
  let skipped = 0;

  // Un seul push par manager, même s'il gère plusieurs tontines (dedupKey = today).
  for (const m of managers || []) {
    const pct = tontineIncomplete.get(m.caisse_id) || 0;
    if (pct <= 0) continue;

    const res = await sendPushWithGuard(supabase, {
      userId: m.user_id,
      notificationType: "tontine_reminder",
      dedupKey: today,
      payload: {
        title: "🤝 Cotisations tontine en attente",
        body: `Certains membres n'ont pas encore versé leur part. Ouvre ta tontine pour relancer.`,
        url: "/tontines",
        tag: `tontine-${today}`,
      },
    });
    if (res.skipped) skipped++;
    if (res.sent > 0) pushed++;
  }

  return new Response(
    JSON.stringify({ ok: true, tontines: tontineIncomplete.size, pushed, skipped }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});
