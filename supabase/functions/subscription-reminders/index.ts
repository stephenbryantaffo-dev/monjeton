// Rappels d'expiration d'abonnement — J-7, J-3, J-1, J0 + downgrade après grâce.
// Envoie à la fois une notification in-app (public.notifications) ET une push web
// via les abonnements présents dans public.push_subscriptions.
//
// Auth cron : header x-cron-token (ou ?token=), comparé au token stocké dans
// public.system_config (key='reminders_cron_token') ou à REMINDERS_CRON_TOKEN.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// CORS restreint aux domaines de production (monjeton.app + previews Lovable).
import { getCorsHeaders as _getCorsHeaders } from "../_shared/cors.ts";
function buildCorsHeaders(req: Request) {
  const h = _getCorsHeaders(req);
  h["Access-Control-Allow-Headers"] =
    (h["Access-Control-Allow-Headers"] || "") + ", x-cron-token";
  return h;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@monjeton.app";
const CRON_TOKEN_ENV = Deno.env.get("REMINDERS_CRON_TOKEN") || "";

const JEKO_PRO_URL = "https://pay.jeko.africa/pl/d616710c-47fb-4afc-b0e2-e9fe3e0b29ab";
const JEKO_MAX_URL = "https://pay.jeko.africa/pl/e7715547-b693-40dd-b06e-9bbb63a90961";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

type Stage = "j7" | "j3" | "j1" | "j0";

function buildMessage(stage: Stage, planName: string): { title: string; body: string } {
  const plan = planName || "Pro";
  if (stage === "j7") {
    return {
      title: `Ton accès ${plan} expire dans 7 jours`,
      body: `Pense à renouveler ton abonnement pour ne rien perdre.`,
    };
  }
  if (stage === "j3") {
    return {
      title: `Plus que 3 jours sur ton plan ${plan}`,
      body: `Garde tes scans et ton coach IA actifs.`,
    };
  }
  if (stage === "j1") {
    return {
      title: `Dernier jour avant l'expiration`,
      body: `Ton plan ${plan} expire demain. Renouvelle maintenant.`,
    };
  }
  return {
    title: `Ton abonnement expire aujourd'hui`,
    body: `Renouvelle ton plan ${plan} pour ne pas perdre tes avantages.`,
  };
}

function getStage(daysLeft: number): Stage | null {
  if (daysLeft <= 0) return "j0";
  if (daysLeft === 1) return "j1";
  if (daysLeft <= 3) return "j3";
  if (daysLeft <= 7) return "j7";
  return null;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-cron-token") || "";
  const { data: cfg } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "reminders_cron_token")
    .maybeSingle();
  const expected = cfg?.value || CRON_TOKEN_ENV;

  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const stats = { processed: 0, reminded: 0, pushed: 0, expired: 0, errors: 0, cleaned: 0 };
  const staleEndpoints: string[] = [];

  async function pushToUser(userId: string, title: string, body: string, planName: string) {
    const isUltra = (planName || "").toLowerCase().includes("ultra");
    const targetUrl = isUltra ? JEKO_MAX_URL : JEKO_PRO_URL;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .is("disabled_at", null);

    if (!subs || subs.length === 0) return 0;

    const payload = JSON.stringify({
      title,
      body,
      url: "/settings/subscription",
      tag: "subscription-reminder",
      icon: "/pwa-icon-192.svg",
      badge: "/pwa-icon-192.svg",
      data: { url: "/settings/subscription", paymentUrl: targetUrl },
    });

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        const status = e?.statusCode || 0;
        if (status === 404 || status === 410) staleEndpoints.push(s.endpoint);
        else console.error("push failed", status, e?.body);
      }
    }
    return sent;
  }

  try {
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, status, plan_name, expires_at, grace_until, last_reminder_sent")
      .eq("status", "active")
      .not("expires_at", "is", null);

    if (error) throw error;

    for (const sub of subs || []) {
      stats.processed++;
      try {
        const expiresAt = new Date(sub.expires_at as string);
        const graceUntil = sub.grace_until
          ? new Date(sub.grace_until as string)
          : new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);

        // Expired past grace -> downgrade
        if (now > graceUntil) {
          await supabase
            .from("subscriptions")
            .update({
              status: "expired",
              plan_name: "Gratuit",
              price_xof: 0,
              last_reminder_sent: "expired",
              updated_at: now.toISOString(),
            })
            .eq("id", sub.id);

          await supabase.from("notifications").insert({
            user_id: sub.user_id,
            type: "subscription_expired",
            title: "Abonnement expiré",
            message: `Ton abonnement ${sub.plan_name || "Pro"} a expiré. Tu es repassé en plan Gratuit. Renouvelle quand tu veux.`,
          });

          const pushed = await pushToUser(
            sub.user_id,
            "Abonnement expiré",
            `Ton plan ${sub.plan_name || "Pro"} a expiré. Renouvelle en 1 clic.`,
            sub.plan_name || "Pro",
          );
          stats.pushed += pushed;
          stats.expired++;
          continue;
        }

        const msLeft = expiresAt.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
        const stage = getStage(daysLeft);
        if (!stage) continue;
        if (sub.last_reminder_sent === stage) continue;

        const { title, body } = buildMessage(stage, sub.plan_name || "Pro");

        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          type: "subscription_reminder",
          title,
          message: body,
        });

        const pushed = await pushToUser(sub.user_id, title, body, sub.plan_name || "Pro");
        stats.pushed += pushed;

        await supabase
          .from("subscriptions")
          .update({ last_reminder_sent: stage, updated_at: now.toISOString() })
          .eq("id", sub.id);

        stats.reminded++;
      } catch (e) {
        console.error("sub error", sub.id, e);
        stats.errors++;
      }
    }

    if (staleEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
      stats.cleaned = staleEndpoints.length;
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fatal", e);
    return new Response(JSON.stringify({ error: String(e), ...stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
