import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_CURRENCIES = ["XOF", "USD", "EUR", "GBP", "NGN", "GHS", "MAD", "TND", "XAF", "CVE", "JPY", "CNY", "CAD", "CHF"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // JWT authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Token invalide" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ConvertSchema = z.object({
      amount: z.number().min(0).max(999_999_999),
      from_currency: z.string().trim().length(3),
      to_currency: z.string().trim().length(3).optional(),
    });
    const rawBody = await req.json().catch(() => null);
    const parsed = ConvertSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amount = parsed.data.amount;
    const from_currency = parsed.data.from_currency.toUpperCase();
    const to_currency = (parsed.data.to_currency || "XOF").toUpperCase();

    // Validate inputs
    if (isNaN(amount) || amount <= 0 || amount > 999_999_999_999) {
      return new Response(JSON.stringify({ error: "Montant invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_CURRENCIES.includes(from_currency)) {
      return new Response(JSON.stringify({ error: "Devise source non supportée" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (from_currency === to_currency) {
      return new Response(JSON.stringify({
        converted_amount: amount,
        exchange_rate: 1,
        source: "same_currency",
        date: new Date().toISOString().split("T")[0],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const XOF_EUR_RATE = 655.957;

    let rate: number;
    let source: string;

    if (from_currency === "EUR") {
      rate = XOF_EUR_RATE;
      source = "fixed_peg (1 EUR = 655.957 XOF)";
    } else if (from_currency === "XOF") {
      rate = 1;
      source = "same_currency";
    } else {
      const resp = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from_currency)}&symbols=EUR`);
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: "Taux de change indisponible" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await resp.json();
      const toEurRate = data.rates?.EUR;
      if (!toEurRate) {
        return new Response(JSON.stringify({ error: "Taux introuvable" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rate = toEurRate * XOF_EUR_RATE;
      source = `frankfurter.app (${from_currency}→EUR) + fixed peg (EUR→XOF)`;
    }

    const converted_amount = Math.round(amount * rate);

    return new Response(JSON.stringify({
      converted_amount,
      exchange_rate: Math.round(rate * 100) / 100,
      source,
      date: new Date().toISOString().split("T")[0],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("convert-currency error:", e);
    return new Response(JSON.stringify({ error: "Erreur de traitement" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
