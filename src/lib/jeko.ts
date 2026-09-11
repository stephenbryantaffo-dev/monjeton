import { supabase } from "@/integrations/supabase/client";

// Liens de paiement Jèko (Mon Jeton) — repli si la création dynamique échoue
export const JEKO_PRO_URL = "https://pay.jeko.africa/pl/d616710c-47fb-4afc-b0e2-e9fe3e0b29ab";
export const JEKO_MAX_URL = "https://pay.jeko.africa/pl/e7715547-b693-40dd-b06e-9bbb63a90961";

/**
 * Ouvre une URL de paiement Jèko.
 * - Sur Capacitor (iOS/Android natif), utilise le Browser plugin (in-app browser).
 * - Sur le web, ouvre un nouvel onglet.
 */
export async function openJekoCheckout(url: string): Promise<void> {
  try {
    // Détection Capacitor à runtime pour ne pas casser le web
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    }
  } catch (e) {
    // fallback web
    console.warn("Capacitor Browser indisponible, fallback web", e);
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

type JekoPlan = "pro" | "ultra";

/**
 * Crée une demande de paiement Jèko côté serveur avec le user_id en référence
 * (le webhook active ensuite le bon compte automatiquement), puis ouvre la
 * page de paiement. En cas d'échec, repli sur le lien de paiement statique.
 */
async function startJekoCheckout(
  plan: JekoPlan,
  fallbackUrl: string,
  guestEmail?: string
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token && !guestEmail) throw new Error("no session");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jeko-create-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(token ? { plan } : { plan, email: guestEmail }),
      }
    );
    if (!res.ok) throw new Error(`jeko-create-payment ${res.status}`);
    const json = await res.json();
    if (!json?.redirectUrl) throw new Error("redirectUrl manquante");

    await openJekoCheckout(String(json.redirectUrl));
    return;
  } catch (e) {
    console.warn("Paiement dynamique indisponible, repli sur le lien statique", e);
  }
  await openJekoCheckout(fallbackUrl);
}

export const openJekoPro = () => startJekoCheckout("pro", JEKO_PRO_URL);
export const openJekoMax = () => startJekoCheckout("ultra", JEKO_MAX_URL);
