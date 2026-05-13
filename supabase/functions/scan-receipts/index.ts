import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { imageBase64, mediaType } = body;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeMediaType = mediaType || 'image/jpeg';

    const systemPrompt = `Tu es un expert OCR spécialisé dans la détection de transactions financières pour Mon Jeton, app fintech en Afrique de l'Ouest (UEMOA, F CFA).

TU DOIS ANALYSER L'IMAGE et détecter TOUTES les transactions financières visibles, peu importe leur format :

TYPES D'IMAGES SUPPORTÉS :
- Reçus physiques (1 ou plusieurs côte à côte)
- Screenshots Wave (historique, confirmation)
- Screenshots Orange Money
- Relevés bancaires (CIB, Ecobank, etc.)
- Factures commerçants (Carrefour, Total CI)
- Reçus de restaurants, pharmacies, etc.
- N'importe quel document montrant un montant

RÈGLES D'EXTRACTION :
1. Détecter CHAQUE transaction séparément
2. Ne JAMAIS mélanger deux transactions
3. Si une transaction est illisible ou floue, mettre confidence < 0.5 et noter le problème
4. Convertir TOUS les montants en nombre (ex: "25 000 FCFA" → 25000)
5. Convertir les montants étrangers si visible (ex: "$10" → noter en USD et estimer FCFA)
6. Date : format YYYY-MM-DD si possible, sinon mettre la date d'aujourd'hui
7. Type : toujours 'expense' sauf si c'est clairement un crédit/dépôt/réception

CATÉGORIES DISPONIBLES (choisir la plus proche) :
- Alimentation (courses, supermarché, restaurant, maquis, boulangerie)
- Transport (taxi, carburant, parking, Yango, Uber)
- Communication (recharge téléphone, internet, abonnement)
- Santé (pharmacie, clinique, médecin)
- Loisirs (cinéma, sport, divertissement)
- Éducation (école, formation, livres)
- Factures (électricité, eau, loyer, abonnement)
- Shopping (vêtements, chaussures, électro)
- Transfert (envoi d'argent Wave/OM)
- Autre (si aucune catégorie ne correspond)

LANGUE : L'image peut être en français, anglais, ou mélangée. Traiter les deux.

RETOURNER UNIQUEMENT CE JSON (sans markdown, sans backticks) :
{
  "document_type": "receipts_physical" | "wave_screenshot" | "orange_money_screenshot" | "bank_statement" | "invoice" | "mixed" | "unknown",
  "total_detected": 3,
  "transactions": [
    {
      "id": "tx_1",
      "merchant": "Carrefour Abidjan",
      "amount": 25000,
      "currency": "XOF",
      "date": "2026-05-13",
      "type": "expense",
      "category_suggestion": "Alimentation",
      "note": "Courses supermarché",
      "confidence": 0.95,
      "raw_text": "texte brut extrait de l'image pour ce reçu",
      "issues": ""
    }
  ],
  "global_confidence": 0.90,
  "warnings": []
}

Si aucune transaction détectée :
{
  "document_type": "unknown",
  "total_detected": 0,
  "transactions": [],
  "global_confidence": 0,
  "warnings": ["Aucune transaction lisible dans cette image"]
}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: safeMediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Analyse cette image et détecte TOUTES les transactions financières visibles. Retourne uniquement le JSON demandé, sans aucun texte autour.',
              },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error('Claude Vision error:', err);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text;
    if (!text) throw new Error('Empty AI response');

    let result;
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error('Parse error:', text);
      throw new Error('Invalid JSON from AI');
    }

    if (!Array.isArray(result.transactions)) {
      result.transactions = [];
    }

    result.transactions = result.transactions.map((tx: any, i: number) => ({
      id: tx.id || `tx_${i + 1}`,
      merchant: String(tx.merchant || 'Inconnu').slice(0, 100),
      amount: Math.max(0, Math.min(999999999, Math.floor(Number(tx.amount) || 0))),
      currency: tx.currency || 'XOF',
      date: tx.date || new Date().toISOString().split('T')[0],
      type: tx.type === 'income' ? 'income' : 'expense',
      category_suggestion: tx.category_suggestion || 'Autre',
      note: String(tx.note || '').slice(0, 200),
      confidence: Math.max(0, Math.min(1, Number(tx.confidence) || 0.5)),
      raw_text: String(tx.raw_text || '').slice(0, 500),
      issues: String(tx.issues || ''),
    }));

    result.total_detected = result.transactions.length;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('scan-receipts error:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
