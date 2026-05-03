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
