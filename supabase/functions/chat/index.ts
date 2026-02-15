import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user context from auth
    const authHeader = req.headers.get("Authorization") || "";
    let userContext = "";
    
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch recent transactions for context
        const { data: txs } = await supabase
          .from("transactions")
          .select("amount, type, note, date, categories(name)")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(20);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();

        if (txs && txs.length > 0) {
          const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
          const totalExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
          userContext = `\n\nContexte financier de l'utilisateur (${profile?.full_name || "utilisateur"}):\n- Dernières transactions: ${txs.length} transactions récentes\n- Revenus récents: ${totalIncome.toLocaleString()} FCFA\n- Dépenses récentes: ${totalExpense.toLocaleString()} FCFA\n- Catégories: ${[...new Set(txs.map(t => (t.categories as any)?.name).filter(Boolean))].join(", ")}`;
        }
      }
    }

    const systemPrompt = `Tu es un coach financier IA bienveillant et expert, spécialisé pour les utilisateurs d'Afrique de l'Ouest (zone FCFA). Tu parles français de manière naturelle et accessible.

Ton rôle:
- Analyser les habitudes de dépenses et revenus de l'utilisateur
- Donner des conseils pratiques et personnalisés pour mieux gérer son argent
- Proposer des stratégies d'épargne adaptées au contexte africain
- Aider à réduire les dépenses inutiles
- Encourager et motiver l'utilisateur dans sa gestion financière

Règles:
- Réponds toujours en français
- Sois concis (2-4 paragraphes max)
- Utilise des emojis avec modération pour rendre la conversation agréable
- Donne des montants en FCFA
- Ne donne jamais de conseils d'investissement spécifiques (actions, crypto, etc.)
${userContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
