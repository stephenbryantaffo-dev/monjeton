// Traduction en batch via l'IA Lovable.
// Reçoit une liste de textes français, renvoie leurs traductions.
//
// Optimisé pour l'app :
// - Traite jusqu'à 100 textes en une seule requête (économie de crédits)
// - Ne traduit PAS les mots réservés (Mon Jeton, tontine, FCFA, nouchi, etc.)
// - Renvoie l'ordre exact des textes reçus
// - Fallback : si l'IA échoue, renvoie le texte original (jamais d'écran vide)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mots et expressions qu'on ne traduit JAMAIS (marque + termes locaux)
const DO_NOT_TRANSLATE = [
  "Mon Jeton",
  "monjeton.app",
  "tontine",
  "tontines",
  "nouchi",
  "dioula",
  "FCFA",
  "F CFA",
  "XOF",
  "XAF",
  "Wave",
  "Orange Money",
  "MTN",
  "Moov",
];

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  ar: "Arabic",
  de: "German",
  it: "Italian",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY manquante" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const texts: string[] = Array.isArray(body?.texts) ? body.texts : [];
    const targetLang: string = String(body?.target || "").toLowerCase();

    if (texts.length === 0 || !targetLang) {
      return new Response(
        JSON.stringify({ error: "texts et target requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si la cible est le français, on renvoie l'original tel quel
    if (targetLang === "fr") {
      return new Response(
        JSON.stringify({ translations: texts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetName = LANG_NAMES[targetLang] || targetLang;

    // On limite à 100 textes par batch pour rester rapide
    const batch = texts.slice(0, 100);

    // Prompt strict : on demande un JSON avec les textes traduits dans le même ordre
    const systemPrompt = `You are a professional translator for a personal finance mobile app used in West Africa.

Rules:
1. Translate each text from French to ${targetName}.
2. Keep the EXACT same order as the input array.
3. Preserve punctuation, capitalization style, and any placeholders like {name}, {amount}, %s.
4. NEVER translate these words (keep them as-is): ${DO_NOT_TRANSLATE.join(", ")}.
5. Use natural, conversational tone (not literal word-for-word).
6. For financial terms, use standard vocabulary of the target language.
7. Output ONLY a JSON object with the shape: {"translations": ["...", "...", ...]}
8. The translations array MUST have exactly ${batch.length} items.`;

    const userPrompt = JSON.stringify({ texts: batch });

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
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Lovable AI translation error:", response.status, errText);
      // Fallback : on renvoie les textes originaux, jamais d'écran vide
      return new Response(
        JSON.stringify({ translations: texts, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Réponse IA non-JSON:", content.slice(0, 200));
      return new Response(
        JSON.stringify({ translations: texts, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const translations = Array.isArray(parsed?.translations) ? parsed.translations : [];

    // Vérification longueur : si l'IA n'a pas respecté le nombre, on complète avec l'original
    const final: string[] = [];
    for (let i = 0; i < batch.length; i++) {
      const t = translations[i];
      final.push(typeof t === "string" && t.trim().length > 0 ? t : batch[i]);
    }

    return new Response(
      JSON.stringify({ translations: final }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate function fatal:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

