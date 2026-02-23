import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcript, categories, wallets } = await req.json();
    if (!transcript) throw new Error("No transcript provided");

    const catList = (categories || []).map((c: any) => `${c.name} (${c.type})`).join(", ");
    const walletList = (wallets || []).map((w: any) => w.wallet_name).join(", ");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant financier expert en extraction de transactions depuis du texte parlé en français, y compris le français ivoirien et ouest-africain.

L'utilisateur dicte une ou PLUSIEURS transactions vocalement. Tu dois détecter TOUTES les transactions dans le texte.

Retourne un JSON avec un tableau "transactions":
{
  "transactions": [
    {
      "amount": nombre,
      "type": "expense" ou "income",
      "category": "nom de catégorie",
      "wallet": "nom du portefeuille" ou null,
      "note": "description courte",
      "currency": "XOF" ou "USD" ou "EUR" ou "GBP" ou "NGN" ou "GHS"
    }
  ]
}

Catégories disponibles: ${catList}
Portefeuilles disponibles: ${walletList}

RÈGLES D'EXTRACTION:

1. SEGMENTATION: Détecte les séparations par "et", "puis", "ensuite", "après", "aussi", virgules, points. Chaque segment avec un montant = une transaction.

2. MONTANTS - Détecte tous les formats:
   - Nombres: 1500, 25000, 2500000
   - "mille" ou "mil" = ×1000 (ex: "2 mille" = 2000, "25 mille" = 25000)
   - "million(s)" = ×1000000
   - "milliard(s)" = ×1000000000
   - "k" = ×1000 (ex: "25k" = 25000)
   - "M" = ×1000000
   - Nombres en lettres: "cinq cents" = 500, "deux mille" = 2000
   - Argot ivoirien: "balles" = francs CFA, "briques" = 1000 FCFA (ex: "3 briques" = 3000)
   - "2 mille 5" ou "2 mille 500" = 2500

3. DEVISES:
   - "franc(s)", "FCFA", "CFA", "F CFA", par défaut → XOF
   - "dollar(s)", "USD", "$" → USD
   - "euro(s)", "EUR", "€" → EUR
   - "livre(s)", "GBP", "£" → GBP
   - "naira", "NGN" → NGN
   - "cedi(s)", "GHS" → GHS
   - Si aucune devise mentionnée → XOF

4. CATÉGORIES - Associe intelligemment:
   - taxi, uber, transport, bus, gbaka → Transport
   - restaurant, manger, nourriture, bouffe, garba, alloco → Alimentation
   - crédit, recharge, forfait, data, internet → Téléphone
   - hôpital, pharmacie, médicament, docteur → Santé
   - vêtements, habits, chaussures, sape → Shopping
   - électricité, eau, loyer, facture → Factures
   - salaire, paye, virement → type income, Salaire
   - Choisis la catégorie la plus proche parmi celles disponibles

5. Si pas de montant clair, mets 0
6. Par défaut type = "expense" sauf si contexte indique un revenu
7. Retourne UNIQUEMENT le JSON, rien d'autre`
          },
          { role: "user", content: transcript }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Parse error:", response.status, t);
      throw new Error("AI parsing failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: any = { transactions: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        // Support both old single-transaction and new multi-transaction format
        if (result.transactions && Array.isArray(result.transactions)) {
          parsed = result;
        } else if (result.amount !== undefined) {
          // Legacy single transaction format - wrap in array
          parsed = { transactions: [result] };
        }
      }
    } catch {
      console.error("Failed to parse:", content);
    }

    return new Response(JSON.stringify({ parsed, raw: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-voice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
