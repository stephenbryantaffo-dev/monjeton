import { createClient } from 'jsr:@supabase/supabase-js@2';

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

    const body = await req.json();
    const {
      modifiedCategory,
      newAmount,
      originalAmount,
      currentPlan,
      totalBudget,
      context,
      validatedCategories,
    } = body;

    if (!modifiedCategory || newAmount === undefined || !currentPlan) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI configuration missing' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Propose les 3 options pour rééquilibrer après modification de ${modifiedCategory}. Réponds uniquement le JSON, rien d'autre.` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA épuisés' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error('AI gateway failed');
    }

    const aiJson = await aiRes.json();
    const text = aiJson.choices?.[0]?.message?.content;
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
