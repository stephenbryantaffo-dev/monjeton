import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGE_LENGTH = 5000;
const MAX_MESSAGES = 50;

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

    const body = await req.json();
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY manquant");

    // Validate messages
    let messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    messages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.slice(0, MAX_MESSAGE_LENGTH) : "",
    }));

    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 3) : [];

    // Get user context from already-authenticated client
    let userContext = "";
    let userName = "utilisateur";

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) {
      const [profileResult, txResult, walletsResult] = await Promise.all([
        supabaseAuth.from("profiles").select("full_name, country").eq("user_id", user.id).maybeSingle(),
        supabaseAuth.from("transactions").select("amount, type, note, date, merchant_name, categories(name), wallets(wallet_name)").eq("user_id", user.id).order("date", { ascending: false }).limit(10),
        supabaseAuth.from("wallets").select("wallet_name, currency, initial_balance").eq("user_id", user.id),
      ]);

      const profile = profileResult.data;
      const txs = txResult.data;
      const wallets = walletsResult.data;

      if (profile?.full_name) userName = profile.full_name;

      const walletList = wallets?.map(w => `${w.wallet_name} (${w.currency})`).join(", ") || "aucun";

      if (txs && txs.length > 0) {
        const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const totalExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        const txList = txs.map(t =>
          `- ${t.date}: ${t.type === "expense" ? "-" : "+"}${Number(t.amount).toLocaleString()} FCFA | ${(t.categories as any)?.name || "?"} | ${t.merchant_name || t.note || ""} | ${(t.wallets as any)?.wallet_name || ""}`
        ).join("\n");

        userContext = `\n\nContexte financier de ${userName} (${profile?.country || "CI"}):\nPortefeuilles: ${walletList}\n10 dernières transactions:\n${txList}\nRevenus récents: ${totalIncome.toLocaleString()} FCFA\nDépenses récentes: ${totalExpense.toLocaleString()} FCFA\nSolde net récent: ${(totalIncome - totalExpense).toLocaleString()} FCFA\nCatégories: ${[...new Set(txs.map(t => (t.categories as any)?.name).filter(Boolean))].join(", ")}`;
      } else {
        userContext = `\n\nContexte: ${userName} (${profile?.country || "CI"}) n'a pas encore de transactions. Portefeuilles: ${walletList}`;
      }
    }

    const systemPrompt = `Tu es le coach financier personnel de ${userName}. Il utilise Mon Jeton pour gérer ses finances en Afrique de l'Ouest (FCFA).

OBJECTIF : Analyser, classifier, mémoriser et optimiser les finances personnelles avec précision et intelligence prédictive.

CAPACITÉS OBLIGATOIRES :
1. Extraire automatiquement : montant, type (dépense, revenu, transfert, retrait), catégorie, date implicite.
2. Apprendre des habitudes utilisateur à partir de l'historique fourni.
3. Détecter anomalies comportementales (dépenses inhabituelles, pics soudains).
4. Calculer tendances mensuelles et hebdomadaires quand les données le permettent.
5. Fournir prédictions fin de mois basées sur le rythme actuel.
6. Générer résumés automatiques clairs.
7. Proposer recommandations personnalisées basées sur les données historiques.
8. Adapter les réponses selon le niveau financier détecté.
9. Utiliser la mémoire conversationnelle (historique de chat).

CRÉATION DE TRANSACTION :
Quand l'utilisateur mentionne une dépense ou un revenu (ex: "j'ai dépensé 5000 pour le taxi", "reçu 50000 salaire"), tu DOIS inclure un bloc JSON dans ta réponse au format suivant :
\`\`\`transaction
{"action":"create_transaction","amount":5000,"type":"expense","category":"Transport","note":"Taxi","date":"${new Date().toISOString().split("T")[0]}","wallet":"Cash"}
\`\`\`
- "type" : "expense" ou "income"
- "category" : utilise les catégories standard (Alimentation, Transport, Téléphone, Shopping, Factures, Santé, Loisirs, Sport, Salaire, Freelance, Autre)
- "wallet" : déduis le portefeuille (Orange Money, MTN Mobile Money, Wave, Moov Money, Cash)
- "date" : utilise la date d'aujourd'hui si non précisée
- Place ce bloc APRÈS ton analyse/conseil, pas avant.

CONTEXTE LOCAL OBLIGATOIRE :
- Mobile Money : Wave, Orange Money, MTN Mobile Money, Moov Money.
- Transactions : envoi, réception, retrait, paiement marchand, frais mobile money.
- Dépenses courantes : garba, alloco, attiéké, taxi, yango, gbaka, courant, internet, tontine, soutien familial.
- Revenus souvent irréguliers.
- Langage : français simple, nouchi, fautes d'orthographe acceptées.
- Messages courts possibles : "Garba 1000", "Taxi 2500", "Wave 15000 reçu".

FORMAT DE RÉPONSE :
- Quand l'utilisateur partage une transaction ou demande une analyse, structure ta réponse avec : Résumé → Analyse → Impact budgétaire → Conseil concret.
- Pour les questions simples ou conversations courantes, réponds en 1-3 phrases naturelles.
- Garde chaque section à 1-2 phrases maximum. Pas de listes interminables.

TON :
- Professionnel, intelligent, clair, concis.
- Bienveillant mais direct, comme un coach financier expert en face-à-face.
- 1-2 emojis max par message.

RÈGLES ABSOLUES :
- Montants en FCFA uniquement.
- Si tu manques d'info, pose UNE question précise. Ne devine jamais.
- Ne jamais inventer des données ou statistiques.
- Ne jamais donner de conseils financiers dangereux (actions, crypto).
- Ne jamais juger l'utilisateur.
- Si on t'envoie une image (ticket, reçu, relevé), analyse-la et donne un feedback structuré court + le bloc transaction JSON.
- Si on t'envoie un fichier, résume son contenu en 1-2 phrases.
${userContext}`;

    // Build Anthropic-compatible messages (system is separate)
    const conversationMessages: any[] = [];

    for (const msg of messages) {
      if (msg.role === "user" && attachments && attachments.length > 0) {
        const isLastUser = msg === messages[messages.length - 1] ||
          messages.indexOf(msg) === messages.map((m: any, i: number) => m.role === "user" ? i : -1).filter((i: number) => i >= 0).pop();

        if (isLastUser) {
          const content: any[] = [{ type: "text", text: msg.content || "Analyse ce fichier." }];
          for (const att of attachments) {
            if (att.type?.startsWith("image/")) {
              content.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: att.type,
                  data: att.data,
                },
              });
            } else {
              try {
                const decoded = atob(att.data);
                content.push({ type: "text", text: `[Fichier: ${String(att.name || "").slice(0, 100)}]\n${decoded.slice(0, 3000)}` });
              } catch {
                content.push({ type: "text", text: `[Fichier joint: ${String(att.name || "").slice(0, 100)}]` });
              }
            }
          }
          conversationMessages.push({ role: "user", content });
          continue;
        }
      }
      conversationMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE stream → OpenAI-compatible SSE format
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                const openAIFormat = {
                  choices: [{ delta: { content: parsed.delta.text } }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
              } else if (parsed.type === "message_stop") {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* ignore parse errors */ }
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                const openAIFormat = { choices: [{ delta: { content: parsed.delta.text } }] };
                await writer.write(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
              }
            } catch { /* ignore */ }
          }
        }

        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Stream transform error:", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "Erreur de traitement" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
