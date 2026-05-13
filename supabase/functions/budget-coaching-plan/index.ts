import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { context, disponible, month, year } = body;

    if (!context || disponible === undefined) {
      return new Response(JSON.stringify({ error: 'Missing context or disponible' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildSystemPrompt(context, disponible, month, year);

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Génère le plan complet pour ${disponible} F CFA disponibles ce mois.`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error('Claude API error:', err);
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text;
    if (!text) throw new Error('Empty response from AI');

    let plan;
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      plan = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Parse error:', text);
      throw new Error('Invalid JSON from AI');
    }

    if (!Array.isArray(plan.repartition) || !plan.conseil_global) {
      throw new Error('Invalid plan structure');
    }

    const total = plan.repartition.reduce(
      (s: number, r: any) => s + (Number(r.montant) || 0), 0
    );
    const safeDisponible = Math.max(0, Number(disponible) || 0);

    if (safeDisponible > 0 && Math.abs(total - safeDisponible) > safeDisponible * 0.05) {
      const ratio = total > 0 ? safeDisponible / total : 0;
      plan.repartition = plan.repartition.map((r: any) => {
        const adjusted = (Number(r.montant) || 0) * ratio;
        return {
          ...r,
          montant: Math.floor(adjusted),
          pourcentage: Math.round((adjusted / safeDisponible) * 100),
        };
      });
    }

    plan.repartition = plan.repartition.map((r: any) => ({
      categorie: String(r.categorie || 'Autre').slice(0, 50),
      montant: Math.max(0, Math.min(999999999, Math.floor(Number(r.montant) || 0))),
      pourcentage: Math.max(0, Math.min(100, Math.round(Number(r.pourcentage) || 0))),
    }));

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('budget-coaching error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(context: any, disponible: number, month: number, year: number): string {
  const monthNames = [
    'janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre'
  ];
  const safeDisp = Math.max(0, Number(disponible) || 0);
  const chargesList = (context.charges_fixes || [])
    .map((c: any) => `  • ${c.nom}: ${c.montant} F`)
    .join('\n') || '  Aucune';

  return `Tu es un conseiller financier expert pour Mon Jeton, app fintech en Afrique de l'Ouest (zone UEMOA, F CFA).

CONTEXTE UTILISATEUR :
- Période : ${monthNames[month-1]} ${year}
- Revenu principal : ${context.revenu_principal} F (${context.revenu_type})
- Revenu exceptionnel : ${context.revenu_exceptionnel} F ${context.revenu_exceptionnel_source ? `(${context.revenu_exceptionnel_source})` : ''}
- Charges fixes :
${chargesList}
- Dettes ce mois : ${context.dettes_mois} F
- Objectifs : ${(context.objectifs || []).join(', ') || 'aucun défini'}
- Situation : ${context.situation_familiale} (${context.nb_personnes} personne(s))
- Habitudes : ${context.habitude_depense}
- Mois spécial : ${context.mois_special}
${context.mois_special_note ? `  Note: ${context.mois_special_note}` : ''}

DISPONIBLE APRÈS CHARGES + DETTES : ${safeDisp} F CFA pour ce mois.

RÈGLES ABSOLUES :

1. SI disponible <= 0 :
   → Plan d'URGENCE en 3 catégories max :
     • Alimentation 60% • Transport 30% • Imprévus 10%
   → Conseil : prioriser ne pas s'endetter davantage, suggérer de revoir les charges.

2. SI disponible > 0 :
   → Répartir 100% du disponible entre 5-8 catégories adaptées.

3. RATIOS RÉALISTES UEMOA :
   - Alimentation : 30-50% (selon nb_personnes)
   - Transport : 10-20%
   - Communication : 3-8%
   - Loisirs : 5-15%
   - Épargne : 10-20% (selon objectifs)
   - Imprévus : 5-10%

4. AJUSTEMENTS PAR CONTEXTE :
   - situation = 'famille' : +Éducation/Enfants 10-15%
   - situation = 'couple' : -10% loisirs personnels
   - objectifs include 'epargne' : épargne minimum 15%
   - objectifs include 'dette' : remboursement minimum 20%
   - mois_special = 'rentree' : ajouter Scolarité 15-25%
   - mois_special = 'fetes' : ajouter Fêtes 10-20%
   - habitude = 'gros_achats' : suggérer "Courses mensuelles"
   - habitude = 'petits_achats' : suggérer micro-budgets quotidiens

5. CONSEILS :
   - Ton bienveillant, encourageant, jamais culpabilisant
   - Français simple, pas de jargon
   - Max 2 phrases par catégorie
   - Adapté à l'Afrique de l'Ouest (Wave, Orange Money OK)

6. FORMAT JSON OBLIGATOIRE :
{
  "repartition": [
    { "categorie": "Alimentation", "montant": 75000, "pourcentage": 30 }
  ],
  "conseil_global": "Phrase motivante en 1-2 lignes",
  "conseils_par_categorie": {
    "Alimentation": "Conseil court et concret"
  }
}

IMPORTANT :
- Pas de markdown, pas de \`\`\`, JSON pur
- Somme des montants ≤ ${safeDisp} F
- Si disponible = 0, retourne plan d'urgence`;
}
