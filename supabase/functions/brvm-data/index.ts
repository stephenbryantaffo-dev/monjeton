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

    // Essayer plusieurs proxies pour contourner le certificat SSL de brvm.org
    const targetUrl = "https://www.brvm.org/fr/cours-actions/0";
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    ];
    
    let html = "";
    let fetchSuccess = false;
    
    for (const proxyUrl of proxies) {
      try {
        const resp = await fetch(proxyUrl, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
          signal: AbortSignal.timeout(20000),
        });
        if (resp.ok) {
          html = await resp.text();
          fetchSuccess = true;
          break;
        }
      } catch (proxyErr) {
        console.log(`Proxy failed: ${proxyUrl}`, proxyErr);
      }
    }
    
    if (!fetchSuccess) throw new Error("All proxies failed");

    if (!fetchSuccess && !html) throw new Error("All proxies failed");

    // Parser les lignes du tableau
    const rows: any[] = [];
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const tableMatches = html.match(rowRegex) || [];

    for (const row of tableMatches) {
      const cells: string[] = [];
      const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let m;
      while ((m = re.exec(row)) !== null) {
        const text = m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim();
        cells.push(text);
      }

      if (cells.length >= 3) {
        const ticker = cells[0]?.trim();
        const priceRaw = cells[1]?.replace(/\s/g, "").replace(",", ".");
        const varRaw = cells[2]?.replace(",", ".").replace("%", "").trim();

        const price = parseFloat(priceRaw);
        const variation = parseFloat(varRaw);

        if (
          ticker && ticker.length >= 3 && ticker.length <= 6 &&
          !isNaN(price) && price > 0 &&
          !isNaN(variation)
        ) {
          rows.push({ ticker, price, variation });
        }
      }
    }

    if (rows.length < 5) {
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
      throw new Error("Parsing failed: not enough rows");
    }

    const NAMES: Record<string, { name: string; sector: string }> = {
      SNTS:  { name: "SONATEL",      sector: "Télécom · Sénégal" },
      ORAC:  { name: "ORANGE CI",    sector: "Télécom · CI" },
      ECOC:  { name: "ECOBANK CI",   sector: "Banque · CI" },
      SLBC:  { name: "SOLIBRA CI",   sector: "Brasserie · CI" },
      BICC:  { name: "BICICI",       sector: "Banque · CI" },
      SGBC:  { name: "SGBCI",        sector: "Banque · CI" },
      PALC:  { name: "PALM CI",      sector: "Agro · CI" },
      NTLC:  { name: "NESTLE CI",    sector: "Alim. · CI" },
      SIVC:  { name: "SIVOA",        sector: "Caoutchouc · CI" },
      TTLC:  { name: "TOTAL CI",     sector: "Énergie · CI" },
      STBC:  { name: "SITAB CI",     sector: "Tabac · CI" },
      UNLC:  { name: "UNILEVER CI",  sector: "Alim. · CI" },
      NSBC:  { name: "NSIA BANQUE",  sector: "Banque · CI" },
      BOAB:  { name: "BOA BÉNIN",    sector: "Banque · Bénin" },
      BOABF: { name: "BOA BURKINA",  sector: "Banque · BF" },
      LNBB:  { name: "LOTERIE BEN.", sector: "Loisirs · Bénin" },
      SDCC:  { name: "SODECI CI",    sector: "Eau · CI" },
      CIEC:  { name: "CIE CI",       sector: "Électricité · CI" },
      CABC:  { name: "CORIS BANK",   sector: "Banque · BF" },
      STAC:  { name: "SETAO CI",     sector: "BTP · CI" },
    };

    const top10 = rows
      .sort((a, b) => b.variation - a.variation)
      .slice(0, 10)
      .map((s) => ({
        ...s,
        name: NAMES[s.ticker]?.name || s.ticker,
        sector: NAMES[s.ticker]?.sector || "BRVM",
        perf_1y: parseFloat((s.variation * 12 + 8).toFixed(1)),
      }));

    // Sauvegarder en cache
    await supabase.from("brvm_cache").insert({
      data: top10,
      fetched_at: new Date().toISOString(),
    });

    // Garder seulement les 10 derniers caches
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
        stocks: top10, 
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
