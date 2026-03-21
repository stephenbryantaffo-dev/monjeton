import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { force } = await req.json().catch(() => ({ force: false }));

    // Check cache (< 24h)
    if (!force) {
      const { data: cached } = await supabase
        .from("financial_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        const age = Date.now() - new Date(cached.created_at).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return new Response(JSON.stringify(cached), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Get transactions from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split("T")[0];

    const [txRes, budgetRes, profileRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, categories(name)")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .order("date", { ascending: false })
        .limit(100),
      supabase
        .from("category_budgets")
        .select("*, categories(name)")
        .eq("user_id", user.id)
        .eq("month", new Date().getMonth() + 1)
        .eq("year", new Date().getFullYear()),
      supabase
        .from("profiles")
        .select("full_name, country")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const transactions = txRes.data || [];
    const budgets = budgetRes.data || [];
    const profile = profileRes.data;

    const totalExpense = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalIncome = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);

    const expenseByCategory: Record<string, number> = {};
    transactions.filter((t: any) => t.type === "expense").forEach((t: any) => {
      const cat = (t.categories as any)?.name || "Autre";
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(t.amount);
    });

    const budgetSummary = budgets.map((b: any) => ({
      category: (b.categories as any)?.name,
      budget: b.budget_amount,
      spent: expenseByCategory[(b.categories as any)?.name] || 0,
    }));

    const prompt = `Tu es un coach financier pour ${profile?.full_name || "l'utilisateur"} en Afrique de l'Ouest (FCFA).

Données des 7 derniers jours :
- Revenus : ${totalIncome} FCFA
- Dépenses : ${totalExpense} FCFA
- Dépenses par catégorie : ${JSON.stringify(expenseByCategory)}
- Budgets du mois : ${JSON.stringify(budgetSummary)}
- Nombre de transactions : ${transactions.length}

Génère un JSON avec :
- score : un score financier de 0 à 100 (100 = excellent)
- insights : exactement 3 conseils courts en français avec emoji au début (✅ positif, ⚠️ alerte, 💡 conseil)
- tip_of_week : un conseil pratique de la semaine en 1 phrase

Critères du score :
- Ratio dépenses/revenus (<50% = bon)
- Respect des budgets par catégorie
- Régularité des revenus
- Diversification des dépenses

Si aucune transaction, donne un score de 50 avec des conseils pour commencer.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu es un analyste financier. Réponds uniquement avec le JSON demandé, sans markdown ni backticks." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "financial_score",
              description: "Return the financial score analysis",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Score from 0 to 100" },
                  insights: { type: "array", items: { type: "string" }, description: "3 insights with emojis" },
                  tip_of_week: { type: "string", description: "Weekly tip" },
                },
                required: ["score", "insights", "tip_of_week"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "financial_score" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    let result;
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content
      const content = aiData.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    }

    // Clamp score
    result.score = Math.max(0, Math.min(100, Math.round(result.score)));
    if (!Array.isArray(result.insights)) result.insights = [];
    result.insights = result.insights.slice(0, 3);

    // Save to DB (keep history, delete scores older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase.from("financial_scores").delete().eq("user_id", user.id).lt("created_at", thirtyDaysAgo.toISOString());
    const { data: saved, error: saveError } = await supabase
      .from("financial_scores")
      .insert({
        user_id: user.id,
        score: result.score,
        insights: result.insights,
        tip_of_week: result.tip_of_week || "",
      })
      .select()
      .single();

    if (saveError) console.error("Save error:", saveError);

    return new Response(JSON.stringify(saved || result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("financial-score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
