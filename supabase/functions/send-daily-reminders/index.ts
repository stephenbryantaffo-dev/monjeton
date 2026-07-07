// Envoie les rappels quotidiens "note tes dépenses" aux abonnés push.
// Déclenché par pg_cron matin (slot=morning) et soir (slot=evening).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@monjeton.app";
const CRON_TOKEN_ENV = Deno.env.get("REMINDERS_CRON_TOKEN") || "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const MESSAGES = {
  morning: {
    title: "☀️ Bonjour !",
    body: "Prêt·e à noter tes dépenses de la journée dans Mon Jeton ?",
  },
  evening: {
    title: "🌙 Petit rappel du soir",
    body: "As-tu bien saisi toutes tes dépenses du jour ? Un tap suffit.",
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-cron-token");
  if (token !== CRON_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const slot = (url.searchParams.get("slot") || "evening") as "morning" | "evening";
  const msg = MESSAGES[slot] || MESSAGES.evening;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Abonnements actifs
  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .is("disabled_at", null);

  if (subsErr) {
    console.error("Failed to load subscriptions:", subsErr);
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const userIds = [...new Set((subs || []).map((s) => s.user_id))];

  // Utilisateurs qui ont déjà une dépense aujourd'hui
  const alreadyLogged = new Set<string>();
  if (userIds.length > 0) {
    const { data: txs } = await supabase
      .from("transactions")
      .select("user_id")
      .eq("type", "expense")
      .eq("date", today)
      .in("user_id", userIds);
    (txs || []).forEach((t: any) => alreadyLogged.add(t.user_id));
  }

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    url: "/new-transaction",
    tag: `daily-${slot}`,
  });

  const staleEndpoints: string[] = [];
  let sent = 0;
  let skipped = 0;

  for (const sub of subs || []) {
    if (alreadyLogged.has(sub.user_id)) {
      skipped++;
      continue;
    }
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (e: any) {
      const status = e?.statusCode || 0;
      if (status === 404 || status === 410) {
        staleEndpoints.push(sub.endpoint);
      } else {
        console.error("push failed", status, e?.body);
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return new Response(
    JSON.stringify({ ok: true, slot, sent, skipped, cleaned: staleEndpoints.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
