import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const MIN_AUDIO_SIZE = 3000;

const HALLUCINATIONS = [
  "sous-titres", "transcription", "merci d'avoir",
  "sous-titrage", "musique", "♪", "inaudible",
  "[inaudible]", "[silence]", "aucun son",
  "pas de voix", "audio vide", "rien à transcrire"
];

function isHallucination(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < 3) return true;
  if (cleaned === '""' || cleaned === "''") return true;
  const lower = cleaned.toLowerCase();
  if (HALLUCINATIONS.some(h => lower.includes(h))) return true;
  const words = lower.split(' ');
  if (words.length > 5 && new Set(words).size / words.length < 0.4) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Server configuration error");

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "Fichier audio manquant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validation taille minimum — audio trop court = silence
    if (audioFile.size < MIN_AUDIO_SIZE) {
      return new Response(JSON.stringify({ transcript: "", empty: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return new Response(JSON.stringify({ error: "Fichier audio trop volumineux (max 10 Mo)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binary);

    const mimeType = audioFile.type || "audio/webm";
    const formatMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
    };
    const audioFormat = formatMap[mimeType] || "webm";

    console.log("STT: received audio", { mimeType, audioFormat, size: audioFile.size });

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
            content: `Tu es un transcripteur audio spécialisé dans le français ivoirien et ouest-africain.

RÈGLE ABSOLUE NUMÉRO 1 : Si tu n'entends PAS de voix humaine claire dans cet audio, retourne EXACTEMENT et UNIQUEMENT cette string vide : ""

RÈGLE ABSOLUE NUMÉRO 2 : N'invente JAMAIS de texte. N'ajoute jamais de mots que tu n'as pas entendus. N'ajoute jamais de ponctuation inventée. N'ajoute jamais de commentaires.

RÈGLE ABSOLUE NUMÉRO 3 : Si l'audio contient uniquement du bruit, du silence, de la musique, ou est incompréhensible, retourne EXACTEMENT : ""

Si et SEULEMENT si tu entends clairement une voix humaine qui parle : transcris mot pour mot ce qu'elle dit, en français, sans aucun ajout.

Contexte : L'utilisateur gère ses finances. Il peut dire des choses comme :
"j'ai payé taxi 3000 francs"
"reçu 50 mille Wave"
"garba 500 alloco 1000"

RETOURNE UNIQUEMENT le texte transcrit ou "".
JAMAIS de commentaire. JAMAIS d'explication.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: 'Transcris cet audio. Si aucune voix humaine claire, retourne uniquement deux guillemets vides : ""' },
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: audioFormat
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
    let transcript = String(result.choices?.[0]?.message?.content || "").slice(0, 2000);

    // Nettoyer les guillemets vides retournés par le modèle
    if (transcript.trim() === '""' || transcript.trim() === "''") {
      transcript = "";
    }

    // Filtre anti-hallucination post-transcription
    if (!transcript.trim() || isHallucination(transcript)) {
      return new Response(JSON.stringify({ transcript: "", empty: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
