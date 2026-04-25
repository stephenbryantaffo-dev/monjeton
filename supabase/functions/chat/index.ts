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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante (LOVABLE_API_KEY). Contacte le support." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    messages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.slice(0, MAX_MESSAGE_LENGTH) : "",
    })).filter((m: any) => m.content.trim().length > 0);

    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 3) : [];

    let userContext = "";
    let userName = "utilisateur";

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) {
      const [profileResult, txResult, walletsResult, debtsResult, savingsResult, budgetResult, tontinesResult] = await Promise.all([
        supabaseAuth.from("profiles").select("full_name, country, profile_type, financial_goal, income_range").eq("user_id", user.id).maybeSingle(),
        supabaseAuth.from("transactions").select("amount, type, note, date, categories(name), wallets(wallet_name)").eq("user_id", user.id).order("date", { ascending: false }).limit(15),
        supabaseAuth.from("wallets").select("wallet_name, currency, initial_balance").eq("user_id", user.id),
        supabaseAuth.from("debts").select("person_name, type, amount, due_date, status, note").eq("user_id", user.id).eq("status", "pending").order("due_date", { ascending: true }).limit(10),
        supabaseAuth.from("savings_goals").select("name, target_amount, current_amount, deadline").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabaseAuth.from("budgets").select("month, year, total_budget").eq("user_id", user.id).order("year", { ascending: false }).order("month", { ascending: false }).limit(1).maybeSingle(),
        supabaseAuth.from("tontines").select("id, name, frequency, contribution_amount, status, start_date").eq("user_id", user.id).eq("status", "active"),
      ]);

      const profile = profileResult.data;
      const txs = txResult.data || [];
      const wallets = walletsResult.data || [];
      const debts = debtsResult.data || [];
      const savings = savingsResult.data || [];
      const budget = budgetResult.data;
      const tontines = tontinesResult.data || [];

      if (profile?.full_name) userName = profile.full_name;

      // Load tontine members and open cycles for each active tontine
      let tontineContext = "";
      if (tontines.length > 0) {
        const tontineIds = tontines.map((t: any) => t.id);
        const [membersResult, cyclesResult] = await Promise.all([
          supabaseAuth.from("tontine_members").select("id, name, tontine_id, is_owner").in("tontine_id", tontineIds),
          supabaseAuth.from("tontine_cycles").select("id, tontine_id, cycle_number, period_label, status, total_expected, total_collected").in("tontine_id", tontineIds).eq("status", "open"),
        ]);
        const members = membersResult.data || [];
        const cycles = cyclesResult.data || [];

        // Load payments for open cycles
        const openCycleIds = cycles.map((c: any) => c.id);
        let payments: any[] = [];
        if (openCycleIds.length > 0) {
          const { data: payData } = await supabaseAuth.from("tontine_payments").select("cycle_id, member_id, amount_paid").in("cycle_id", openCycleIds);
          payments = payData || [];
        }

        for (const t of tontines) {
          const tMembers = members.filter((m: any) => m.tontine_id === t.id);
          const tCycle = cycles.find((c: any) => c.tontine_id === t.id);
          const memberNames = tMembers.map((m: any) => m.name).join(", ");
          
          let cycleInfo = "Aucun cycle ouvert";
          if (tCycle) {
            const cyclePays = payments.filter((p: any) => p.cycle_id === tCycle.id);
            const paidMemberIds = new Set(cyclePays.map((p: any) => p.member_id));
            const paidMembers = tMembers.filter((m: any) => paidMemberIds.has(m.id)).map((m: any) => m.name);
            const unpaidMembers = tMembers.filter((m: any) => !paidMemberIds.has(m.id)).map((m: any) => m.name);
            cycleInfo = `Cycle ${tCycle.cycle_number} (${tCycle.period_label}) — ${Number(tCycle.total_collected).toLocaleString()}/${Number(tCycle.total_expected).toLocaleString()} F collectés\n  Ont payé: ${paidMembers.join(", ") || "personne"}\n  Pas encore payé: ${unpaidMembers.join(", ") || "tous ont payé"}`;
          }

          tontineContext += `\n- Tontine "${t.name}" (ID: ${t.id}) — ${Number(t.contribution_amount).toLocaleString()} F/${t.frequency}\n  Membres: ${memberNames || "aucun"}\n  ${cycleInfo}`;
        }
      }

      const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const totalExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const walletList = wallets.map(w => `${w.wallet_name} (${w.currency})`).join(", ") || "aucun";

      const debtOwed = debts.filter(d => d.type === "i_owe").map(d => `- Doit ${Number(d.amount).toLocaleString()}F à ${d.person_name}${d.due_date ? ` (avant ${d.due_date})` : ""}`).join("\n");
      const debtOwedToMe = debts.filter(d => d.type === "owed_to_me").map(d => `- ${d.person_name} doit ${Number(d.amount).toLocaleString()}F${d.due_date ? ` (avant ${d.due_date})` : ""}`).join("\n");
      const savingsList = savings.map(s => `- ${s.name}: ${Number(s.current_amount).toLocaleString()}F / ${Number(s.target_amount).toLocaleString()}F${s.deadline ? ` (avant ${s.deadline})` : ""}`).join("\n");
      const txList = txs.map(t => `- ${t.date}: ${t.type === "expense" ? "-" : "+"}${Number(t.amount).toLocaleString()}F | ${(t.categories as any)?.name || "?"} | ${t.note || ""} | ${(t.wallets as any)?.wallet_name || ""}`).join("\n");

      userContext = `
=== CONTEXTE FINANCIER DE ${userName} ===
PROFIL : ${profile?.profile_type || "?"} | Objectif: ${profile?.financial_goal || "?"} | Revenus: ${profile?.income_range || "?"}
PAYS : ${profile?.country || "CI"}
PORTEFEUILLES : ${walletList}
REVENUS RÉCENTS : ${totalIncome.toLocaleString()} FCFA
DÉPENSES RÉCENTES : ${totalExpense.toLocaleString()} FCFA
SOLDE NET : ${(totalIncome - totalExpense).toLocaleString()} FCFA
${budget ? `BUDGET MENSUEL : ${Number(budget.total_budget).toLocaleString()} FCFA (${budget.month}/${budget.year})` : ""}
=== TONTINES ACTIVES ===${tontineContext || "\nAucune tontine active"}
=== DETTES QUE L'UTILISATEUR DOIT PAYER ===
${debtOwed || "Aucune dette à payer"}
=== CRÉANCES (ce qu'on lui doit) ===
${debtOwedToMe || "Personne ne lui doit d'argent"}
=== OBJECTIFS D'ÉPARGNE EN COURS ===
${savingsList || "Aucun objectif d'épargne"}
=== 15 DERNIÈRES TRANSACTIONS ===
${txList || "Aucune transaction"}
`;
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
{"action":"create_debt","debt_type":"i_owe","person_name":"nom","amount":montant,"due_date":"YYYY-MM-DD ou null","note":"contexte court"}
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

ACTIONS TONTINE :
Quand l'utilisateur mentionne un paiement de cotisation tontine (ex: "Ahmed a payé", "Ahmed vient de cotiser", "cotisation de Fatou 7000"), tu DOIS :
1. Identifier la tontine et le membre dans le contexte ci-dessous
2. Inclure un bloc action :
\`\`\`tontine_action
{"action":"record_tontine_payment","tontine_id":"ID_TONTINE","tontine_name":"NOM","member_name":"Ahmed","amount":7000,"cycle_id":"ID_CYCLE"}
\`\`\`
- Utilise l'ID exact de la tontine et du cycle ouvert depuis le contexte
- Si le montant n'est pas précisé, utilise le contribution_amount de la tontine
- Si le membre n'existe pas dans la tontine, dis-le et ne génère pas de bloc

OBJECTIF D'ÉPARGNE :
Quand l'utilisateur veut créer un objectif d'épargne (ex: "je veux économiser 500000 pour un téléphone", "objectif 1 million pour le loyer avant décembre") :
\`\`\`savings_action
{"action":"create_savings_goal","name":"Téléphone","target_amount":500000,"deadline":"YYYY-MM-DD ou null"}
\`\`\`

CONSULTATION DE SOLDE :
Quand l'utilisateur demande son solde ou combien il a dépensé :
- Calcule à partir des données du contexte
- Réponds directement avec les chiffres, pas besoin de bloc action

EXEMPLES TONTINE :
User: "Ahmed a cotisé"
Toi: "✅ Cotisation d'Ahmed notée ! 💰 7 000F pour la tontine [nom]. Il reste [X] membres à payer ce mois."

User: "Qui n'a pas encore payé dans ma tontine ?"
Toi: "📋 Tontine [nom] — Cycle [N] : [Liste des impayés]. Total collecté : [X]/[Y] F."

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

User: "Ahmed vient de cotiser 7000"
Toi: "✅ Cotisation d'Ahmed notée ! 💰 7 000F pour [tontine]. Il reste [X] membres à payer."

RÈGLES ABSOLUES :
- Si l'utilisateur mentionne une dépense ou un revenu, TOUJOURS inclure le bloc transaction JSON. Ne jamais demander de confirmation avant de créer le bloc — l'app gère la confirmation.
- Si l'utilisateur mentionne un paiement tontine, TOUJOURS inclure le bloc tontine_action JSON avec les bons IDs du contexte.
- Si l'utilisateur veut épargner, TOUJOURS inclure le bloc savings_action JSON.
- Montants en FCFA uniquement.
- Si tu manques d'info, pose UNE question précise. Ne devine jamais.
- Ne jamais inventer des données ou statistiques.
- Ne jamais donner de conseils financiers dangereux (actions, crypto).
- Ne jamais juger l'utilisateur.
- Si on t'envoie une image (ticket, reçu, relevé), analyse en 1-2 lignes + le bloc transaction JSON.
- Si on t'envoie un fichier, résume son contenu en 1 phrase.

MODIFICATION DE TRANSACTION :
Si l'utilisateur veut modifier une transaction existante (ex: "change ma dernière transaction à 5000", "ma dépense était de 5000 pas 4000", "ajoute 1000 sur ma dernière dépense", "modifie le montant"), tu DOIS inclure un bloc JSON :
\`\`\`update_action
{"action":{"type":"update_transaction","transaction_id":null,"field":"amount","old_value":4000,"new_value":5000,"description":"dernière dépense"}}
\`\`\`
- Si tu ne sais pas quelle transaction modifier exactement, mets transaction_id: null et description avec ce que l'utilisateur a dit (ex: "dernière dépense", "transport hier").
- L'app se chargera de trouver la bonne transaction.
- Place ce bloc APRÈS ton message texte court.
${userContext}`;

    // Build messages for Lovable AI gateway
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
                type: "image_url",
                image_url: { url: `data:${att.type};base64,${att.data}` },
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

    while (conversationMessages.length > 0 && conversationMessages[0].role === "assistant") {
      conversationMessages.shift();
    }

    if (conversationMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun message à envoyer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert messages to Anthropic format (system is separate, images use Anthropic source format)
    const anthropicMessages = conversationMessages.map((msg: any) => {
      if (Array.isArray(msg.content)) {
        const content = msg.content.map((part: any) => {
          if (part.type === "image_url") {
            const url = part.image_url?.url || "";
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              return { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } };
            }
            return { type: "text", text: "[Image non supportée]" };
          }
          return part;
        });
        return { role: msg.role, content };
      }
      return { role: msg.role, content: msg.content };
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Clé API Anthropic invalide." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Réessaie dans quelques secondes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 529) {
        return new Response(
          JSON.stringify({ error: "Service IA temporairement surchargé. Réessaie dans un instant." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erreur du service IA (" + response.status + ")" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Anthropic SSE stream to OpenAI-compatible SSE format
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let newlineIdx: number;
            while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, newlineIdx);
              buffer = buffer.slice(newlineIdx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ") || line.trim() === "") continue;

              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                  const openaiChunk = {
                    choices: [{ delta: { content: event.delta.text }, index: 0, finish_reason: null }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                }

                if (event.type === "message_stop") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch { /* skip malformed */ }
            }
          }
          // Ensure DONE is sent
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Stream transform error:", err);
        } finally {
          controller.close();
        }
      },
    });

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