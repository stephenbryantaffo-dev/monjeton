import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

async function computeHmac(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('JEKO_WEBHOOK_SECRET');
    const testPayload = '{"test":"monjeton"}';
    let testSignature: string | null = null;
    if (secret) {
      testSignature = await computeHmac(testPayload, secret);
    }

    return new Response(
      JSON.stringify({
        secretConfigured: !!secret,
        secretLength: secret?.length ?? 0,
        secretPrefix: secret ? secret.substring(0, 6) : null,
        testPayload,
        testSignature,
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
