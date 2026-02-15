import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { amount, from_currency, to_currency = "XOF" } = await req.json();

    if (!amount || !from_currency) {
      return new Response(JSON.stringify({ error: "amount and from_currency required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (from_currency.toUpperCase() === to_currency.toUpperCase()) {
      return new Response(JSON.stringify({
        converted_amount: amount,
        exchange_rate: 1,
        source: "same_currency",
        date: new Date().toISOString().split("T")[0],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try frankfurter.app (free, no key needed, supports major currencies)
    const from = from_currency.toUpperCase();
    const to = to_currency.toUpperCase();

    // Frankfurter doesn't support XOF directly, but supports EUR
    // XOF is pegged to EUR at 1 EUR = 655.957 XOF
    const XOF_EUR_RATE = 655.957;

    let rate: number;
    let source: string;

    if (from === "EUR") {
      rate = XOF_EUR_RATE;
      source = "fixed_peg (1 EUR = 655.957 XOF)";
    } else if (from === "XOF") {
      rate = 1;
      source = "same_currency";
    } else {
      // Convert from_currency to EUR first via frankfurter, then EUR to XOF
      const resp = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=EUR`);
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Frankfurter error:", resp.status, txt);
        return new Response(JSON.stringify({ error: "Exchange rate unavailable", details: txt }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await resp.json();
      const toEurRate = data.rates?.EUR;
      if (!toEurRate) {
        return new Response(JSON.stringify({ error: `No rate found for ${from} to EUR` }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rate = toEurRate * XOF_EUR_RATE;
      source = `frankfurter.app (${from}→EUR) + fixed peg (EUR→XOF)`;
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
