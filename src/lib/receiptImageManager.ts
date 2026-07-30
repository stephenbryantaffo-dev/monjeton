import { supabase } from '@/integrations/supabase/client';

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export type ImageStatus = 'loading' | 'available' | 'expired' | 'unavailable';

/**
 * Resolve a usable image URL from a Supabase storage path or fallback URL.
 * ALWAYS returns a string or null — NEVER an object.
 */
export const getReceiptImageUrl = async (
  storagePath: string | null | undefined,
  fallbackUrl: string | null | undefined = null
): Promise<string | null> => {
  if (!storagePath && !fallbackUrl) return null;

  // Cache lookup
  if (storagePath && urlCache.has(storagePath)) {
    const cached = urlCache.get(storagePath)!;
    if (cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.url;
    }
    urlCache.delete(storagePath);
  }

  if (storagePath) {
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(storagePath, 86400);

      // CRITICAL: extract data.signedUrl (a string), not the whole object
      if (!error && data && data.signedUrl) {
        urlCache.set(storagePath, {
          url: data.signedUrl,
          expiresAt: Date.now() + 23 * 60 * 60 * 1000,
        });
        return data.signedUrl;
      }
    } catch (e) {
      console.error('createSignedUrl error:', e);
    }
  }

  if (
    fallbackUrl &&
    typeof fallbackUrl === 'string' &&
    fallbackUrl.startsWith('http')
  ) {
    return fallbackUrl;
  }

  return null;
};

/**
 * Signe une LISTE de chemins en un seul appel réseau.
 *
 * Remplace 36 appels séquentiels à getReceiptImageUrl par un seul
 * createSignedUrls. Renvoie une Map { storagePath -> url }.
 *
 * - Les chemins déjà en cache (non expirés) ne repartent pas sur le réseau.
 * - Un chemin qui échoue est simplement absent de la Map (pas d'exception).
 */
export const getReceiptImageUrls = async (
  storagePaths: (string | null | undefined)[]
): Promise<Map<string, string>> => {
  const result = new Map<string, string>();

  // Chemins uniques, non vides
  const unique = Array.from(
    new Set(storagePaths.filter((p): p is string => !!p))
  );

  const toFetch: string[] = [];

  // On sert d'abord ce qui est déjà en cache
  for (const path of unique) {
    const cached = urlCache.get(path);
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      result.set(path, cached.url);
    } else {
      if (cached) urlCache.delete(path);
      toFetch.push(path);
    }
  }

  if (toFetch.length === 0) return result;

  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrls(toFetch, 86400);

    if (!error && Array.isArray(data)) {
      for (const entry of data) {
        // createSignedUrls renvoie { path, signedUrl, error } par élément
        if (entry.signedUrl && entry.path) {
          urlCache.set(entry.path, {
            url: entry.signedUrl,
            expiresAt: Date.now() + 23 * 60 * 60 * 1000,
          });
          result.set(entry.path, entry.signedUrl);
        }
      }
    }
  } catch (e) {
    console.error('createSignedUrls error:', e);
  }

  return result;
};

/** Type guard ensuring a value is a usable image URL string. */
export const isValidImageUrl = (value: unknown): value is string => {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    (value.startsWith('http') ||
      value.startsWith('blob:') ||
      value.startsWith('data:'))
  );
};
