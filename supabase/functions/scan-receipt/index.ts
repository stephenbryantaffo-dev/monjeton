import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BASE64_LENGTH = 7 * 1024 * 1024; // ~5MB decoded

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, scanType, mimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Server configuration error");

    // Input validation
    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "Image manquante" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (image.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: "Image trop volumineuse (max 5 Mo)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMimeType = ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : "image/jpeg";
    const safeScanType = scanType === "screenshot" ? "screenshot" : "receipt";

    const prompt = safeScanType === "screenshot"
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
- $ → USD, € → EUR, £ → GBP, CFA/FCFA → XOF, ₦ → NGN, GH₵ → GHS
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
- $ → USD, € → EUR, £ → GBP, CFA/FCFA → XOF, ₦ → NGN, GH₵ → GHS
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
              { type: "image_url", image_url: { url: `data:${safeMimeType};base64,${image}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erreur d'analyse" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: Record<string, any> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const raw = JSON.parse(jsonMatch[0]);
        // Sanitize output
        parsed = {
          amount: Math.max(0, Math.min(Number(raw.amount) || 0, 999_999_999_999)),
          currency: String(raw.currency || "XOF").toUpperCase().slice(0, 3),
          date: String(raw.date || "").slice(0, 10),
          merchant: String(raw.merchant || "").replace(/[<>]/g, "").slice(0, 200),
          type: raw.type === "income" ? "income" : "expense",
          wallet: raw.wallet ? String(raw.wallet).replace(/[<>]/g, "").slice(0, 100) : null,
          category: raw.category ? String(raw.category).replace(/[<>]/g, "").slice(0, 100) : null,
        };
      }
    } catch {
      // Parse failure
    }

    return new Response(JSON.stringify({ parsed, raw: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(JSON.stringify({ error: "Erreur de traitement" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
