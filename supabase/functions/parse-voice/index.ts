import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_CURRENCIES = ["XOF", "USD", "EUR", "GBP", "NGN", "GHS", "MAD", "TND", "XAF", "CVE"];
const MAX_TRANSCRIPT_LENGTH = 2000;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Server configuration error");

    // Get current date info for relative date resolution
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const todayName = dayNames[now.getUTCDay()];

    const body = await req.json();
    const transcript = typeof body.transcript === "string" ? body.transcript.slice(0, MAX_TRANSCRIPT_LENGTH) : "";
    if (!transcript) {
      return new Response(JSON.stringify({ error: "Transcription vide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categories = Array.isArray(body.categories) ? body.categories : [];
    const wallets = Array.isArray(body.wallets) ? body.wallets : [];

    const catList = categories.map((c: any) => `${String(c.name || "").slice(0, 50)} (${c.type === "income" ? "income" : "expense"})`).join(", ");
    const walletList = wallets.map((w: any) => String(w.wallet_name || "").slice(0, 50)).join(", ");

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
            content: `Tu es un moteur d'extraction financier IA de niveau expert pour l'application "Mon Jeton", optimisé pour le français ivoirien et ouest-africain.

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
      "currency": "XOF" ou autre devise,
      "date": "YYYY-MM-DD" ou null
    }
  ]
}

Aujourd'hui c'est ${todayName} ${todayISO}.

Catégories disponibles: ${catList}
Portefeuilles disponibles: ${walletList}

RÈGLES D'EXTRACTION AVANCÉES :

1. SEGMENTATION INTELLIGENTE :
   - Séparateurs : "et", "puis", "ensuite", "après", "aussi", "plus", virgules, points.
   - Chaque segment avec un montant = une transaction distincte.
   - "J'ai payé 2000 garba et 1500 taxi" = 2 transactions.

2. MONTANTS - Détection exhaustive :
   - Nombres directs : 1500, 25000, 2500000
   - "mille" / "mil" = ×1000 ("2 mille" = 2000, "25 mille" = 25000)
   - "2 mille 5" ou "2 mille 500" = 2500
   - "million(s)" = ×1000000, "milliard(s)" = ×1000000000
   - "k" = ×1000 ("25k" = 25000), "M" = ×1000000
   - Nombres en lettres : "cinq cents" = 500, "deux mille" = 2000
   - Argot ivoirien : "balles" = francs CFA, "briques" = 1000 FCFA ("3 briques" = 3000)
   - "un bâton" = 1000000 FCFA
   - Si pas de montant clair → 0

3. DEVISES :
   - "franc(s)", "FCFA", "CFA", "F CFA", par défaut → XOF
   - "dollar(s)", "USD", "$" → USD
   - "euro(s)", "EUR", "€" → EUR
   - "livre(s)", "GBP", "£" → GBP
   - "naira", "NGN" → NGN
   - "cedi(s)", "GHS" → GHS
   - "dirham", "MAD" → MAD
   - Si aucune devise mentionnée → XOF

4. CATÉGORIES - Association contextuelle intelligente :
   - taxi, uber, yango, transport, bus, gbaka, wôrô-wôrô → Transport
   - restaurant, manger, nourriture, bouffe, garba, alloco, attiéké, placali → Alimentation
   - crédit, recharge, forfait, data, internet, airtime → Téléphone
   - hôpital, pharmacie, médicament, docteur, clinique → Santé
   - vêtements, habits, chaussures, sape, friperie → Shopping
   - électricité, eau, loyer, facture, CIE, SODECI → Factures
   - salaire, paye, virement, reçu, "on m'a envoyé" → type income
   - Wave, Orange Money, MTN, Mobile Money → détecter si envoi (expense) ou réception (income)
   - tontine, cotisation → selon contexte (paiement = expense, réception = income)
   - Choisis la catégorie la plus proche parmi celles disponibles

5. DÉTECTION DU TYPE :
   - Par défaut : "expense"
   - Income si : salaire, paye, "j'ai reçu", "on m'a envoyé", "mon patron m'a donné", virement reçu
   - Contexte Mobile Money : "j'ai envoyé" = expense, "j'ai reçu" = income

6. DATES IMPLICITES :
   - "aujourd'hui" → ${todayISO}
   - "hier" → date d'hier
   - "avant-hier" → date d'avant-hier
   - "ce matin", "ce soir", "cet après-midi" → aujourd'hui
   - "lundi", "mardi", etc. (sans "prochain") → le dernier jour correspondant (passé ou aujourd'hui)
   - "lundi dernier", "vendredi passé" → semaine précédente
   - "la semaine dernière" → lundi de la semaine dernière
   - "le mois dernier" → 1er du mois précédent
   - "le 15", "le 3" → ce mois si la date est passée, sinon mois précédent
   - Si aucune indication de date → null (sera traité comme aujourd'hui par l'app)

7. NOTES : Génère une description courte et naturelle résumant la transaction.

8. Retourne UNIQUEMENT le JSON, rien d'autre.`
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
      console.error("Parse error:", response.status);
      return new Response(JSON.stringify({ error: "Erreur d'analyse" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: any = { transactions: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.transactions && Array.isArray(result.transactions)) {
          // Validate & sanitize each transaction
          parsed.transactions = result.transactions.map((tx: any) => {
            const dateStr = tx.date && /^\d{4}-\d{2}-\d{2}$/.test(String(tx.date)) ? String(tx.date) : null;
            return {
              amount: Math.max(0, Math.min(Number(tx.amount) || 0, 999_999_999_999)),
              type: tx.type === "income" ? "income" : "expense",
              category: String(tx.category || "").slice(0, 100),
              wallet: tx.wallet ? String(tx.wallet).slice(0, 100) : null,
              note: String(tx.note || "").replace(/[<>]/g, "").slice(0, 500),
              currency: ALLOWED_CURRENCIES.includes(String(tx.currency || "").toUpperCase()) 
                ? String(tx.currency).toUpperCase() 
                : "XOF",
              date: dateStr,
            };
          });
        } else if (result.amount !== undefined) {
          const dateStr = result.date && /^\d{4}-\d{2}-\d{2}$/.test(String(result.date)) ? String(result.date) : null;
          parsed = { transactions: [{
            amount: Math.max(0, Math.min(Number(result.amount) || 0, 999_999_999_999)),
            type: result.type === "income" ? "income" : "expense",
            category: String(result.category || "").slice(0, 100),
            wallet: result.wallet ? String(result.wallet).slice(0, 100) : null,
            note: String(result.note || "").replace(/[<>]/g, "").slice(0, 500),
            currency: ALLOWED_CURRENCIES.includes(String(result.currency || "").toUpperCase())
              ? String(result.currency).toUpperCase()
              : "XOF",
            date: dateStr,
          }] };
        }
      }
    } catch {
      // Parse failure - return empty
    }

    return new Response(JSON.stringify({ parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-voice error:", e);
    return new Response(JSON.stringify({ error: "Erreur de traitement" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
