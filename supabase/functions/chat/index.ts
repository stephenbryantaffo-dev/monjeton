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
    if (!ANTHROPIC_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "Clé API manquante. Va dans Supabase → Settings → Edge Functions → Secrets et ajoute ANTHROPIC_API_KEY" 
        }), 
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate messages
    let messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    messages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.slice(0, MAX_MESSAGE_LENGTH) : "",
    })).filter((m: any) => m.content.trim().length > 0);

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

GESTION DES DETTES ET CRÉANCES :
Quand l'utilisateur mentionne une dette ou un prêt, inclure un bloc JSON :

Cas 1 — "je dois X à Y" / "j'ai emprunté X à Y" :
\`\`\`debt
{"action":"create_debt","debt_type":"owe","person_name":"nom","amount":montant,"due_date":"YYYY-MM-DD ou null","note":"contexte court"}
\`\`\`

Cas 2 — "X me doit Y" / "j'ai prêté X à Y" :
\`\`\`debt
{"action":"create_debt","debt_type":"owed_to_me","person_name":"nom","amount":montant,"amount_paid":0,"due_date":"YYYY-MM-DD ou null","note":"contexte court"}
\`\`\`

Cas 3 — Paiement partiel ("Jean m'a donné 7000 sur les 10000") :
- Calcule le reste clairement (10000 - 7000 = 3000F)
- Confirme le calcul à l'utilisateur
\`\`\`debt
{"action":"update_debt","person_name":"Jean","amount_paid":7000,"remaining":3000,"note":"Paiement partiel reçu"}
\`\`\`

RÈGLES DETTES :
- Toujours récapituler ce que tu vas faire avant d'inclure le bloc
- Afficher les calculs clairement
- Si le solde actuel est insuffisant pour payer, le mentionner
- Si un nom est ambigu, demander une précision
- Pour les paiements partiels, toujours inclure aussi un bloc transaction (revenu) pour le montant reçu

EXEMPLES DETTES :
User: "Je dois 25000 à Kouamé avant vendredi"
Toi: "📝 Dette notée : 25 000F à Kouamé avant vendredi. Je te rappellerai ! 💪"

User: "Jean me devait 10000, il m'a donné 7000 hier"
Toi: "✅ 7 000F reçus de Jean, noté en revenu ! 💳 Reste dû : 3 000F. Je mets à jour."

CONTEXTE LOCAL OBLIGATOIRE :
- Mobile Money : Wave, Orange Money, MTN Mobile Money, Moov Money.
- Transactions : envoi, réception, retrait, paiement marchand, frais mobile money.
- Dépenses courantes : garba, alloco, attiéké, taxi, yango, gbaka, courant, internet, tontine, soutien familial.
- Revenus souvent irréguliers.
- Langage : français simple, nouchi, fautes d'orthographe acceptées.
- Messages courts possibles : "Garba 1000", "Taxi 2500", "Wave 15000 reçu".

FORMAT DE RÉPONSE - ULTRA IMPORTANT :
- Réponds TOUJOURS en maximum 3 lignes courtes
- Utilise des emojis pour rendre clair et visuel
- Pas de listes à puces longues
- Pas de termes financiers compliqués
- Parle comme une amie qui conseille, pas comme une banque
- Si l'utilisateur note une dépense, confirme en 1 ligne et pose UNE question de suivi simple
- Adapte ton langage : si l'user écrit en nouchi, réponds en nouchi friendly

EXEMPLES DE BONNES RÉPONSES :
User: "Garba 500"
Toi: "Noté ! 🍛 Garba 500F en Alimentation. C'est tout pour ce matin ou t'as autre chose ?"

User: "J'ai envoyé 20000 à ma maman Wave"
Toi: "✅ 20 000F envoyés à famille, c'est noté 💚 Tu envoies souvent à ta maman ?"

User: "Où est parti mon argent ce mois ?"
Toi: "Ce mois tu as dépensé [X]F. Le plus gros poste : [catégorie] ([montant]F). Veux-tu des conseils pour réduire ça ?"

RÈGLES ABSOLUES :
- Si l'utilisateur mentionne une dépense ou un revenu, TOUJOURS inclure le bloc transaction JSON. Ne jamais demander de confirmation avant de créer le bloc — l'app gère la confirmation.
- Montants en FCFA uniquement.
- Si tu manques d'info, pose UNE question précise. Ne devine jamais.
- Ne jamais inventer des données ou statistiques.
- Ne jamais donner de conseils financiers dangereux (actions, crypto).
- Ne jamais juger l'utilisateur.
- Si on t'envoie une image (ticket, reçu, relevé), analyse en 1-2 lignes + le bloc transaction JSON.
- Si on t'envoie un fichier, résume son contenu en 1 phrase.
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

    // Ensure first message is "user" (Anthropic requirement)
    while (conversationMessages.length > 0 && conversationMessages[0].role === "assistant") {
      conversationMessages.shift();
    }

    if (conversationMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun message à envoyer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        max_tokens: 2048,
        system: systemPrompt,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Clé API Anthropic invalide ou expirée." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Réessaie dans quelques secondes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 529 || response.status === 500) {
        return new Response(
          JSON.stringify({ error: "Service Anthropic temporairement indisponible. Réessaie." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erreur du service IA (" + response.status + ")" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
