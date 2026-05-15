import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.25.76';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
import { loadUserCurrency } from '../_shared/currency-context.ts';

const RebalanceSchema = z.object({
  modifiedCategory: z.string().trim().min(1).max(100),
  newAmount: z.number().min(0).max(999_999_999),
  originalAmount: z.number().min(0).max(999_999_999).optional(),
  currentPlan: z.array(z.object({
    categorie: z.string().max(100),
    montant: z.number().min(0).max(999_999_999),
  }).passthrough()).max(100),
  totalBudget: z.number().min(0).max(999_999_999),
  context: z.record(z.string(), z.any()).optional(),
  validatedCategories: z.array(z.string().max(100)).max(100).optional(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rl = await checkRateLimit(user.id, 'budget-rebalance-suggest', 20, 60);
    if (!rl.allowed) return rateLimitResponse('budget-rebalance-suggest', rl.retryAfter, corsHeaders);

    const rawBody = await req.json().catch(() => null);
    const parsed = RebalanceSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const {
      modifiedCategory,
      newAmount,
      originalAmount = 0,
      currentPlan,
      totalBudget,
      context,
      validatedCategories,
    } = parsed.data;

    const difference = Number(newAmount) - Number(originalAmount);
    const sumPlan = currentPlan.reduce((s: number, c: any) => s + Number(c.montant), 0);
    const newSum = sumPlan + Number(newAmount);
    const overshoot = newSum - Number(totalBudget);

    const systemPrompt = `Tu es un conseiller financier pour Mon Jeton, app fintech UEMOA (F CFA). L'utilisateur vient de modifier le budget d'une catégorie. Tu dois proposer LA MEILLEURE stratégie pour rééquilibrer.

CONTEXTE UTILISATEUR :
- Revenu : ${context?.revenu_principal || 0} F
- Situation : ${context?.situation_familiale || 'seul'} (${context?.nb_personnes || 1} personnes)
- Objectifs : ${(context?.objectifs || []).join(', ')}
- Budget total disponible : ${totalBudget} F

MODIFICATION FAITE PAR L'USER :
- Catégorie modifiée : "${modifiedCategory}"
- Avant : ${originalAmount} F
- Après : ${newAmount} F
- Différence : ${difference > 0 ? '+' : ''}${difference} F

ÉTAT ACTUEL DU PLAN (sans la modification) :
${currentPlan.map((c: any) => `- ${c.categorie} : ${c.montant} F`).join('\n')}

CATÉGORIES DÉJÀ VALIDÉES (ne PAS toucher) :
${(validatedCategories || []).join(', ') || 'aucune'}

DÉSÉQUILIBRE :
- Nouvelle somme totale : ${newSum} F
- Budget total : ${totalBudget} F
- Dépassement : ${overshoot > 0 ? '+' : ''}${overshoot} F

TA MISSION :
${overshoot > 0
  ? `L'user a augmenté de ${difference} F. Trouver d'où retirer ${overshoot} F dans les autres catégories NON validées, de façon INTELLIGENTE (pas proportionnelle).`
  : `L'user a diminué. Suggérer où réallouer ces ${Math.abs(overshoot)} F de surplus de façon utile pour ses objectifs.`}

RÈGLES STRICTES :
1. Ne JAMAIS modifier les catégories validées
2. Privilégier les catégories non essentielles (Loisirs > Imprévus > Communication)
3. Préserver l'Alimentation et le Logement
4. Si l'user dépasse trop, suggérer d'augmenter le budget global

PROPOSER 3 OPTIONS DISTINCTES (A: rééquilibrage intelligent, B: retrait d'une catégorie, C: augmenter le budget total).

FORMAT JSON OBLIGATOIRE (sans markdown) :
{
  "summary": "Phrase courte expliquant la situation",
  "recommended": "A",
  "options": [
    {
      "id": "A",
      "title": "Rééquilibrer intelligemment",
      "description": "Description courte",
      "changes": [{"category": "Loisirs", "from": 25000, "to": 15000, "diff": -10000}],
      "result_total": ${totalBudget}
    },
    {
      "id": "B",
      "title": "Retirer d'une catégorie",
      "description": "...",
      "changes": [],
      "result_total": ${totalBudget}
    },
    {
      "id": "C",
      "title": "Augmenter le budget total",
      "description": "Passer le budget à ${totalBudget + Math.max(0, overshoot)} F",
      "changes": [],
      "result_total": ${totalBudget + Math.max(0, overshoot)},
      "new_total_budget": ${totalBudget + Math.max(0, overshoot)}
    }
  ]
}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Propose les 3 options pour rééquilibrer après modification de ${modifiedCategory}. Réponds uniquement le JSON, rien d'autre.`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude error:', errText);
      throw new Error('Claude API failed');
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text;
    if (!text) throw new Error('Empty AI response');

    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('rebalance error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
