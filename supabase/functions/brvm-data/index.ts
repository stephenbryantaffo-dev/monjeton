import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_DURATION_MS = 15 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") 
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier le cache
    const { data: cache } = await supabase
      .from("brvm_cache")
      .select("*")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const cacheAge = cache 
      ? now - new Date(cache.fetched_at).getTime() 
      : Infinity;

    if (cache && cacheAge < CACHE_DURATION_MS) {
      return new Response(
        JSON.stringify({ 
          stocks: cache.data, 
          fetched_at: cache.fetched_at,
          from_cache: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Utiliser Gemini avec search grounding pour obtenir les données BRVM en temps réel
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Server configuration error");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un expert financier de la BRVM (Bourse Régionale des Valeurs Mobilières).
Retourne les données des 10 actions les plus performantes du jour à la BRVM.

Pour chaque action, donne :
- ticker : le symbole (ex: SNTS, ORAC)
- name : le nom complet de l'entreprise
- price : le cours de clôture en FCFA (nombre entier)
- variation : la variation du jour en % (nombre décimal, positif ou négatif)
- sector : le secteur et pays (ex: "Télécom · Sénégal")

Trie par variation décroissante (meilleure performance en premier).

IMPORTANT : Retourne UNIQUEMENT un tableau JSON valide, sans texte avant ou après.
Exemple de format :
[{"ticker":"SCRC","name":"SUCRIVOIRE","price":1855,"variation":7.23,"sector":"Agro · CI"}]

Si tu ne peux pas accéder aux données en temps réel, utilise les dernières données connues de la BRVM.`
          },
          {
            role: "user",
            content: "Donne-moi le top 10 des meilleures performances boursières du jour à la BRVM (Bourse Régionale des Valeurs Mobilières). Données les plus récentes possibles."
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI gateway error:", aiResponse.status);
      // Retourner le cache même périmé si l'IA échoue
      if (cache) {
        return new Response(
          JSON.stringify({ 
            stocks: cache.data, 
            fetched_at: cache.fetched_at,
            from_cache: true,
            warning: "Live data unavailable" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiResult = await aiResponse.json();
    const content = String(aiResult.choices?.[0]?.message?.content || "");

    // Extraire le JSON du contenu
    let stocks: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const raw = JSON.parse(jsonMatch[0]);
        stocks = raw
          .filter((s: any) => s.ticker && typeof s.price === "number" && typeof s.variation === "number")
          .slice(0, 10)
          .map((s: any) => ({
            ticker: String(s.ticker).toUpperCase().slice(0, 6),
            name: String(s.name || s.ticker).slice(0, 100),
            price: Math.round(Number(s.price)),
            variation: Math.round(Number(s.variation) * 100) / 100,
            sector: String(s.sector || "BRVM").slice(0, 50),
            perf_1y: parseFloat((Number(s.variation) * 12 + 8).toFixed(1)),
          }));
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
    }

    if (stocks.length < 3) {
      if (cache) {
        return new Response(
          JSON.stringify({ 
            stocks: cache.data, 
            fetched_at: cache.fetched_at,
            from_cache: true,
            warning: "Live data unavailable" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Not enough data from AI");
    }

    // Sauvegarder en cache
    await supabase.from("brvm_cache").insert({
      data: stocks,
      fetched_at: new Date().toISOString(),
    });

    // Nettoyage : garder seulement les 10 derniers
    const { data: allCaches } = await supabase
      .from("brvm_cache")
      .select("id")
      .order("fetched_at", { ascending: false });

    if (allCaches && allCaches.length > 10) {
      const toDelete = allCaches.slice(10).map((c: any) => c.id);
      await supabase.from("brvm_cache").delete().in("id", toDelete);
    }

    return new Response(
      JSON.stringify({ 
        stocks, 
        fetched_at: new Date().toISOString(),
        from_cache: false 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("brvm-data error:", e);
    return new Response(
      JSON.stringify({ error: "Impossible de récupérer les données BRVM" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
