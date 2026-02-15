import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, attachments } = await req.json();
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
          userContext = `\n\nContexte financier (${profile?.full_name || "utilisateur"}):\n- ${txs.length} transactions récentes\n- Revenus: ${totalIncome.toLocaleString()} FCFA\n- Dépenses: ${totalExpense.toLocaleString()} FCFA\n- Catégories: ${[...new Set(txs.map(t => (t.categories as any)?.name).filter(Boolean))].join(", ")}`;
        }
      }
    }

    const systemPrompt = `Tu es un coach financier IA pour l'Afrique de l'Ouest (zone FCFA).

RÈGLES ABSOLUES :
- Réponds TOUJOURS en 1 à 3 phrases maximum. JAMAIS plus. Pas de paragraphes, pas de listes longues.
- Si tu manques d'info, pose UNE question précise avant de conseiller. Ne devine pas.
- Parle comme un ami coach en face-à-face : direct, naturel, bienveillant.
- Utilise 1-2 emojis max par message.
- Montants en FCFA uniquement.
- Pas de conseils d'investissement (actions, crypto).
- Si on t'envoie une image (ticket, reçu, relevé), analyse-la et donne un feedback court.
- Si on t'envoie un fichier, résume son contenu en 1-2 phrases.
${userContext}`;

    // Build messages with multimodal support
    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const msg of messages) {
      if (msg.role === "user" && attachments && attachments.length > 0) {
        // Only attach to the last user message
        const isLastUser = msg === messages[messages.length - 1] || 
          messages.indexOf(msg) === messages.map((m: any, i: number) => m.role === "user" ? i : -1).filter((i: number) => i >= 0).pop();
        
        if (isLastUser) {
          const content: any[] = [{ type: "text", text: msg.content || "Analyse ce fichier." }];
          for (const att of attachments) {
            if (att.type?.startsWith("image/")) {
              content.push({
                type: "image_url",
                image_url: { url: `data:${att.type};base64,${att.data}` }
              });
            } else {
              // Text-based files: add content as text
              try {
                const decoded = atob(att.data);
                content.push({ type: "text", text: `[Fichier: ${att.name}]\n${decoded.slice(0, 3000)}` });
              } catch {
                content.push({ type: "text", text: `[Fichier joint: ${att.name}]` });
              }
            }
          }
          aiMessages.push({ role: "user", content });
          continue;
        }
      }
      aiMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
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
