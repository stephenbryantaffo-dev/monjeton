export const JEKO_BASE = 'https://api.jeko.africa/partner_api';

export const jekoFetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${JEKO_BASE}${path}`, {
    ...options,
    headers: {
      'X-API-KEY': Deno.env.get('JEKO_API_KEY')!,
      'X-API-KEY-ID': Deno.env.get('JEKO_API_KEY_ID')!,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) throw new Error(`Jèko ${res.status}: ${await res.text()}`);
  return res.json();
};
