// Helpers to detect the existing auth method for an email, to prevent
// the same person from creating duplicate accounts via email vs Google.

export type AuthMethod = "email" | "google" | "apple" | "other" | null;

export interface AuthMethodResult {
  exists: boolean;
  method: AuthMethod;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

/**
 * Asks the `check-auth-method` edge function whether an account already
 * exists for this email and which provider it uses.
 *
 * Fail-open: on network/edge errors we return `{ exists: false, method: null }`
 * so we never block a legitimate user because of a glitch.
 */
export async function checkAuthMethod(email: string): Promise<AuthMethodResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !PROJECT_ID) return { exists: false, method: null };

  try {
    const res = await fetch(
      `https://${PROJECT_ID}.supabase.co/functions/v1/check-auth-method`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      },
    );
    if (!res.ok) return { exists: false, method: null };
    const data = await res.json().catch(() => null);
    if (!data || typeof data.exists !== "boolean") {
      return { exists: false, method: null };
    }
    return { exists: data.exists, method: (data.method ?? null) as AuthMethod };
  } catch {
    return { exists: false, method: null };
  }
}

/** Human message guiding the user to the correct method. */
export function methodMismatchMessage(method: AuthMethod, attempted: "email" | "google" | "apple"): string | null {
  if (!method) return null;
  if (method === attempted) return null;
  if (method === "email") {
    return "Ce compte a été créé avec un email et un mot de passe. Connecte-toi avec ton mot de passe, ou utilise « Mot de passe oublié » si besoin.";
  }
  if (method === "google") {
    return "Ce compte utilise la connexion Google. Clique sur « Continuer avec Google » pour te connecter.";
  }
  if (method === "apple") {
    return "Ce compte utilise la connexion Apple. Clique sur « Continuer avec Apple » pour te connecter.";
  }
  return null;
}
