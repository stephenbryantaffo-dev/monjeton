// Public endpoint: returns the existing auth method for a given email.
// Rate-limited by IP to prevent email enumeration abuse.
// Never returns sensitive data — only { exists, method }.

import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Method = "email" | "google" | "other" | null;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });


  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();

    // Basic email shape check (no info leak)
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ exists: false, method: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit by IP: 10 calls / 60s
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const rl = await checkRateLimit(`ip:${ip}`, "check-auth-method", 10, 60);
    if (!rl.allowed) return rateLimitResponse("check-auth-method", rl.retryAfter, corsHeaders);

    // Query Supabase admin REST for user(s) matching this email
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
      },
    );

    if (!res.ok) {
      console.warn("[check-auth-method] admin lookup failed", res.status);
      return new Response(JSON.stringify({ exists: false, method: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json().catch(() => ({}));
    const users: any[] = Array.isArray(json?.users) ? json.users : [];
    const user = users.find(
      (u) => typeof u?.email === "string" && u.email.toLowerCase() === email,
    );

    if (!user) {
      return new Response(JSON.stringify({ exists: false, method: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const identities: any[] = Array.isArray(user.identities) ? user.identities : [];
    const providers = new Set<string>(
      identities.map((i) => String(i?.provider || "")).filter(Boolean),
    );

    let method: Method = null;
    if (providers.has("google")) method = "google";
    else if (providers.has("email")) method = "email";
    else if (providers.size > 0) method = "other";
    else method = "email"; // fallback: legacy users may have no identities row

    return new Response(JSON.stringify({ exists: true, method }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[check-auth-method] error", e);
    return new Response(JSON.stringify({ exists: false, method: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
