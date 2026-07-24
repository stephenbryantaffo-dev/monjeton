// Helper Web Push mutualisé + garde anti-spam via public.push_notifications_log.
//
// Anti-spam
//   - `dedupKey` identifie une notification unique. Si une ligne existe déjà
//     (unique (user_id, notification_type, dedup_key)), aucun push n'est envoyé.
//   - Convention par défaut : 1 push / jour / type / utilisateur → dedupKey = YYYY-MM-DD.
//     Pour un seuil budget → `budget:<budget_id>:70:2026-07`.
//
// Sécurité
//   - Ne jamais logger d'infos personnelles (user_id complet, montants, emails).
//     On tronque les user_id à 8 caractères et on masque les endpoints.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@monjeton.app";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
  }
}

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
export function monthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function shortId(id: string): string {
  return (id || "").slice(0, 8);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

/**
 * Envoie un push à un utilisateur si `(user_id, type, dedupKey)` n'existe pas déjà.
 * Renvoie `{ sent, skipped, errors }`.
 */
export async function sendPushWithGuard(
  supabase: SupabaseClient,
  params: {
    userId: string;
    notificationType: string;
    dedupKey: string;
    payload: PushPayload;
  },
): Promise<{ sent: number; skipped: boolean; errors: number }> {
  const { userId, notificationType, dedupKey, payload } = params;

  // 1) Réserver le slot anti-spam (unique index empêche les doublons).
  const { error: insertErr } = await supabase
    .from("push_notifications_log")
    .insert({
      user_id: userId,
      notification_type: notificationType,
      dedup_key: dedupKey,
    });
  if (insertErr) {
    // 23505 = unique_violation → déjà envoyé
    if ((insertErr as { code?: string }).code === "23505") {
      return { sent: 0, skipped: true, errors: 0 };
    }
    console.error("push guard insert failed", {
      user: shortId(userId),
      type: notificationType,
      msg: insertErr.message,
    });
    return { sent: 0, skipped: false, errors: 1 };
  }

  // 2) Charger les abonnements actifs
  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .is("disabled_at", null);

  if (subsErr || !subs || subs.length === 0) {
    return { sent: 0, skipped: false, errors: subsErr ? 1 : 0 };
  }

  ensureVapid();
  if (!vapidReady) {
    console.error("VAPID keys missing");
    return { sent: 0, skipped: false, errors: 1 };
  }

  let sent = 0;
  let errors = 0;
  const jsonPayload = JSON.stringify(payload);

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        jsonPayload,
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase
          .from("push_subscriptions")
          .update({ disabled_at: new Date().toISOString() })
          .eq("id", s.id);
      } else {
        errors++;
        console.error("push send failed", {
          user: shortId(userId),
          type: notificationType,
          status,
        });
      }
    }
  }
  return { sent, skipped: false, errors };
}

/**
 * Récupère le token cron depuis system_config (fallback env).
 */
export async function checkCronToken(
  supabase: SupabaseClient,
  req: Request,
): Promise<boolean> {
  const url = new URL(req.url);
  const provided = url.searchParams.get("token") || req.headers.get("x-cron-token") || "";
  if (!provided) return false;
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "reminders_cron_token")
    .maybeSingle();
  const expected = (data?.value as string) || Deno.env.get("REMINDERS_CRON_TOKEN") || "";
  return !!expected && provided === expected;
}

export function makeServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
