import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, scanType, mimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = scanType === "screenshot"
      ? `Analyse cette capture d'écran de transaction Mobile Money ou paiement. Extrais les informations suivantes au format JSON:
{
  "amount": nombre (montant exact tel qu'affiché, sans espaces ni symboles de devise),
  "currency": "code ISO de la devise détectée (USD, EUR, GBP, XOF, NGN, GHS, etc.)",
  "date": "YYYY-MM-DD",
  "merchant": "nom du destinataire ou expéditeur",
  "type": "expense" ou "income" (envoi = expense, réception = income),
  "wallet": "Wave" ou "Orange Money" ou "MTN" ou "Moov" ou "PayPal" ou autre,
  "category": "catégorie probable"
}

IMPORTANT pour la devise:
- $ → USD
- € → EUR
- £ → GBP
- CFA ou FCFA ou XOF → XOF
- ₦ → NGN
- GH₵ → GHS
- Si aucune devise n'est détectée, utilise "XOF" par défaut.

Retourne UNIQUEMENT le JSON, sans texte autour.`
      : `Analyse ce ticket de caisse. Extrais les informations suivantes au format JSON:
{
  "amount": nombre (montant total exact tel qu'affiché, sans symboles de devise),
  "currency": "code ISO de la devise détectée (USD, EUR, GBP, XOF, NGN, GHS, etc.)",
  "date": "YYYY-MM-DD",
  "merchant": "nom du magasin/commerçant",
  "type": "expense",
  "category": "catégorie probable (Alimentation, Shopping, Santé, etc.)"
}

IMPORTANT pour la devise:
- $ → USD
- € → EUR
- £ → GBP
- CFA ou FCFA ou XOF → XOF
- ₦ → NGN
- GH₵ → GHS
- Si aucune devise n'est détectée, utilise "XOF" par défaut.

Retourne UNIQUEMENT le JSON, sans texte autour.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${image}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let parsed = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", content);
    }

    return new Response(JSON.stringify({ parsed, raw: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
