import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const month: number = Number(body.month) || new Date().getMonth() + 1;
    const year: number = Number(body.year) || new Date().getFullYear();
    const totalBudget: number = Math.max(0, Number(body.totalBudget) || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Configuration IA manquante" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Date ranges
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // Current month expenses by category + 3-month history
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const histStart = threeMonthsAgo.toISOString().split("T")[0];

    const [currentTxRes, histTxRes] = await Promise.all([
      supabaseAuth
        .from("transactions")
        .select("amount, categories:category_id(name)")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", firstDay)
        .lt("date", lastDay),
      supabaseAuth
        .from("transactions")
        .select("amount, categories:category_id(name)")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", histStart)
        .lt("date", firstDay),
    ]);

    const currentTx = currentTxRes.data || [];
    const histTx = histTxRes.data || [];

    const expensesByCategory: Record<string, number> = {};
    for (const t of currentTx) {
      const cat = (t as any).categories?.name || "Autre";
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(t.amount);
    }
    const totalSpent = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);
    const budgetRestant = Math.max(0, totalBudget - totalSpent);

    // Historical monthly average per category
    const histByCat: Record<string, number> = {};
    for (const t of histTx) {
      const cat = (t as any).categories?.name || "Autre";
      histByCat[cat] = (histByCat[cat] || 0) + Number(t.amount);
    }
    const avgByCat: Record<string, number> = {};
    for (const [k, v] of Object.entries(histByCat)) {
      avgByCat[k] = Math.round(v / 3);
    }

    // Days remaining
    const lastDayDate = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonth =
      today.getMonth() + 1 === month && today.getFullYear() === year;
    const joursRestants = isCurrentMonth
      ? Math.max(1, lastDayDate - today.getDate())
      : lastDayDate;

    const fmt = (n: number) => n.toLocaleString("fr-FR");

    const expensesList =
      Object.entries(expensesByCategory)
        .map(([cat, amt]) => `- ${cat} : ${fmt(amt)} F`)
        .join("\n") || "- Aucune dépense ce mois";

    const histList =
      Object.entries(avgByCat)
        .map(([cat, amt]) => `- ${cat} : ~${fmt(amt)} F/mois`)
        .join("\n") || "- Pas d'historique";

    const systemPrompt = `Tu es un conseiller financier pour Mon Jeton, une app fintech en Afrique de l'Ouest. L'utilisateur gère son argent en FCFA.

DONNÉES RÉELLES DE L'UTILISATEUR :
- Budget total du mois : ${fmt(totalBudget)} F CFA
- Total déjà dépensé : ${fmt(totalSpent)} F CFA
- Budget restant disponible : ${fmt(budgetRestant)} F CFA
- Jours restants dans le mois : ${joursRestants}

Dépenses actuelles par catégorie ce mois :
${expensesList}

Moyenne historique 3 derniers mois :
${histList}

RÈGLE ABSOLUE : La somme de TOUTES tes suggestions de budget par catégorie NE DOIT JAMAIS dépasser ${fmt(totalBudget)} F CFA. C'est le budget que l'utilisateur a fixé. Respecte-le strictement.

Génère 5 à 7 suggestions de répartition par catégorie (Alimentation, Transport, Téléphone, Shopping, Factures, Santé, Loisirs, Épargne, Autre) en tenant compte des dépenses déjà effectuées et de l'historique. Les montants suggérés doivent être RÉALISTES pour l'Afrique de l'Ouest et adaptés au budget de ${fmt(totalBudget)} F CFA. Utilise le tool "suggest_budget" pour répondre.`;

    const aiBody = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Génère mes suggestions de répartition de budget." },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_budget",
            description: "Renvoie une répartition du budget par catégorie.",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      categorie: { type: "string" },
                      montant_suggere: { type: "number" },
                      pourcentage: { type: "number" },
                      conseil: { type: "string" },
                    },
                    required: ["categorie", "montant_suggere", "pourcentage", "conseil"],
                    additionalProperties: false,
                  },
                },
                conseil_global: { type: "string" },
              },
              required: ["suggestions", "conseil_global"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "suggest_budget" } },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans un instant." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = { suggestions: [], conseil_global: "" };
    try {
      parsed = JSON.parse(toolCall?.function?.arguments || "{}");
    } catch (e) {
      console.error("Parse tool args failed:", e);
    }

    let suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    // Sanitize
    suggestions = suggestions
      .map((s: any) => ({
        categorie: String(s.categorie || "").slice(0, 60),
        montant_suggere: Math.max(0, Math.round(Number(s.montant_suggere) || 0)),
        pourcentage: Math.max(0, Math.round(Number(s.pourcentage) || 0)),
        conseil: String(s.conseil || "").slice(0, 240),
      }))
      .filter((s: any) => s.categorie && s.montant_suggere > 0);

    // Server-side recalibration safeguard
    if (totalBudget > 0) {
      const totalSuggere = suggestions.reduce((sum: number, s: any) => sum + s.montant_suggere, 0);
      if (totalSuggere > totalBudget && totalSuggere > 0) {
        const ratio = totalBudget / totalSuggere;
        suggestions = suggestions.map((s: any) => ({
          ...s,
          montant_suggere: Math.floor(s.montant_suggere * ratio),
          pourcentage: Math.round((s.montant_suggere * ratio / totalBudget) * 100),
        }));
      }
    }

    return new Response(
      JSON.stringify({
        suggestions,
        conseil_global: String(parsed.conseil_global || "").slice(0, 500),
        totalBudget,
        totalSpent,
        budgetRestant,
        expensesByCategory,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("budget-suggest error:", e);
    return new Response(JSON.stringify({ error: "Erreur de traitement" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
