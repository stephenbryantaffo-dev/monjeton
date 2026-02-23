/**
 * Security utilities for Mon Jeton - Fintech-grade security
 */

// ─── Rate Limiting ───────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export const checkRateLimit = (
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000, // 5 minutes
  backoffMultiplier: number = 2
): { allowed: boolean; retryAfterMs: number } => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Check if currently blocked (exponential backoff)
  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }

  // Reset window if expired
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    // Exponential backoff: 30s, 60s, 120s, 240s...
    const backoffTime = 30_000 * Math.pow(backoffMultiplier, entry.count - maxAttempts - 1);
    const cappedBackoff = Math.min(backoffTime, 15 * 60 * 1000); // Max 15 min
    entry.blockedUntil = now + cappedBackoff;
    rateLimitStore.set(key, entry);
    return { allowed: false, retryAfterMs: cappedBackoff };
  }

  rateLimitStore.set(key, entry);
  return { allowed: true, retryAfterMs: 0 };
};

export const resetRateLimit = (key: string) => {
  rateLimitStore.delete(key);
};

// ─── Input Sanitization ─────────────────────────────────────────
export const sanitizeText = (input: string): string => {
  if (!input) return "";
  return input
    .replace(/[<>]/g, "") // Strip angle brackets
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/data:/gi, "")
    .trim();
};

export const sanitizeNote = (input: string, maxLength: number = 500): string => {
  return sanitizeText(input).slice(0, maxLength);
};

// ─── Input Validation ───────────────────────────────────────────
const ALLOWED_CURRENCIES = ["XOF", "USD", "EUR", "GBP", "NGN", "GHS", "MAD", "TND", "XAF", "CVE"];

export const validateAmount = (amount: unknown): { valid: boolean; value: number; error?: string } => {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return { valid: false, value: 0, error: "Montant invalide" };
  if (num < 0) return { valid: false, value: 0, error: "Montant négatif non autorisé" };
  if (num > 999_999_999_999) return { valid: false, value: 0, error: "Montant trop élevé" };
  return { valid: true, value: num };
};

export const validateCurrency = (currency: string): boolean => {
  return ALLOWED_CURRENCIES.includes(currency.toUpperCase());
};

export const validateTransactionType = (type: string): boolean => {
  return type === "expense" || type === "income";
};

// ─── Password Strength ──────────────────────────────────────────
export const validatePasswordStrength = (password: string): { strong: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Minimum 8 caractères");
  if (!/[A-Z]/.test(password)) errors.push("Au moins une majuscule");
  if (!/[a-z]/.test(password)) errors.push("Au moins une minuscule");
  if (!/[0-9]/.test(password)) errors.push("Au moins un chiffre");
  return { strong: errors.length === 0, errors };
};

// ─── Session Security ───────────────────────────────────────────
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
let lastActivity = Date.now();
let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;
let onSessionExpiredCallback: (() => void) | null = null;

const resetActivityTimer = () => {
  lastActivity = Date.now();
  if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
  sessionTimeoutId = setTimeout(() => {
    if (onSessionExpiredCallback) onSessionExpiredCallback();
  }, SESSION_TIMEOUT_MS);
};

export const initSessionMonitor = (onSessionExpired: () => void) => {
  onSessionExpiredCallback = onSessionExpired;
  const events = ["mousedown", "keydown", "touchstart", "scroll"];
  events.forEach((e) => window.addEventListener(e, resetActivityTimer, { passive: true }));
  resetActivityTimer();

  return () => {
    events.forEach((e) => window.removeEventListener(e, resetActivityTimer));
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
  };
};

// ─── Payload Size Validation ────────────────────────────────────
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const validatePayloadSize = (blob: Blob, maxBytes: number): boolean => {
  return blob.size <= maxBytes;
};
