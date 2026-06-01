export const JEKO_BASE = 'https://api.jeko.africa/partner_api';

export const jekoFetch = async (
  path: string,
  options: RequestInit = {},
  maxRetries = 4
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(`${JEKO_BASE}${path}`, {
      ...options,
      headers: {
        'X-API-KEY': Deno.env.get('JEKO_API_KEY')!,
        'X-API-KEY-ID': Deno.env.get('JEKO_API_KEY_ID')!,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // 429 → backoff exponentiel 1s, 2s, 4s, 8s
    if (res.status === 429) {
      const wait = Math.pow(2, attempt) * 1000;
      console.warn(`Jèko rate limited, retry in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) throw new Error(`Jèko ${res.status}: ${await res.text()}`);
    return res.json();
  }

  throw new Error('Jèko: max retries exceeded (rate limit)');
};

// Liste les transactions récentes du magasin pour double-vérif
export const listRecentTransactions = async (storeId?: string) => {
  const q = storeId ? `?storeId=${storeId}&limit=100` : '?limit=100';
  return jekoFetch(`/transactions${q}`);
};
