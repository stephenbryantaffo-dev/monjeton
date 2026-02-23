import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Server configuration error");

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "Fichier audio manquant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return new Response(JSON.stringify({ error: "Fichier audio trop volumineux (max 10 Mo)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert audio to base64 in chunks to avoid stack overflow
    const arrayBuffer = await audioFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binary);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Tu es un transcripteur. Transcris EXACTEMENT ce que dit l'audio en français. Retourne UNIQUEMENT le texte transcrit, rien d'autre. Pas de commentaire, pas d'explication."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcris cet audio :" },
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: "wav"
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("STT error:", response.status);
      return new Response(JSON.stringify({ error: "Erreur de transcription" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const transcript = String(result.choices?.[0]?.message?.content || "").slice(0, 2000);

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("speech-to-text error:", e);
    return new Response(JSON.stringify({ error: "Erreur de traitement" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
