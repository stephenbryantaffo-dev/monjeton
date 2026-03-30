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
    // JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
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

    const promptScreenshot = `You are an expert at analyzing Mobile Money and payment screenshots.
The image may be in French or English.
Extract the following information as JSON:
{
  "amount": number (exact amount shown, no currency symbols),
  "currency": "ISO currency code (XOF, XAF, USD, EUR, GBP, NGN, GHS, MAD)",
  "date": "YYYY-MM-DD",
  "merchant": "recipient or sender name",
  "type": "expense" or "income" (sending = expense, receiving = income),
  "wallet": "Wave / Orange Money / MTN / Moov / PayPal / other",
  "category": "most likely category"
}

CURRENCY DETECTION RULES:
- $ or USD → USD
- € or EUR → EUR
- £ or GBP → GBP
- CFA, FCFA, F CFA, XOF → XOF
- FCFA (Central Africa) → XAF
- ₦ or NGN → NGN
- GH₵ or GHS → GHS
- DH or MAD → MAD
- No currency detected → XOF (default)

FRENCH KEYWORDS: "envoyé"=expense, "reçu"=income, "solde"=balance, "frais"=fees, "montant"=amount, "bénéficiaire"=recipient, "expéditeur"=sender
ENGLISH KEYWORDS: "sent"=expense, "received"=income, "balance"=balance, "fee"=fees, "amount"=amount, "recipient"=recipient, "sender"=sender, "total"=amount, "paid"=expense

Return ONLY the JSON, no other text.`;

    const promptReceipt = `You are an expert OCR system for receipts and invoices in any language (French, English, Arabic, etc.).
Extract the following information as JSON:
{
  "amount": number (TOTAL amount only, not subtotal),
  "currency": "ISO currency code",
  "date": "YYYY-MM-DD",
  "merchant": "store or merchant name",
  "type": "expense",
  "category": "most likely category"
}

CATEGORY DETECTION (French/English):
- "alimentation/food/grocery/supermarché/market" → "Alimentation"
- "restaurant/café/fast food/maquis/garba" → "Alimentation"
- "pharmacie/pharmacy/médicament/medicine" → "Santé"
- "transport/taxi/uber/carburant/fuel/essence" → "Transport"
- "vêtements/clothes/boutique/fashion" → "Shopping"
- "électricité/electricity/eau/water/loyer/rent" → "Factures"
- "téléphone/phone/recharge/airtime/data" → "Téléphone"
- "sport/gym/fitness/loisirs/entertainment" → "Loisirs"
- Default → "Shopping"

AMOUNT RULES:
- Look for: Total, Total TTC, Amount Due, Grand Total, Montant Total, Total à Payer, TOTAL, NET AMOUNT
- Always take the FINAL total (after taxes)
- Ignore subtotals and individual item prices

CURRENCY DETECTION:
- $ → USD, € → EUR, £ → GBP
- CFA/FCFA → XOF, ₦ → NGN, GH₵ → GHS
- DH → MAD, No currency → XOF

DATE FORMATS ACCEPTED:
- DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
- "12 Mars 2026", "March 12 2026", "12-03-26"

Return ONLY the JSON, no other text.`;

    const prompt = safeScanType === "screenshot" ? promptScreenshot : promptReceipt;

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
