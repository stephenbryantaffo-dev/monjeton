import { toast } from "sonner";
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
 * Crée une demande de paiement Jèko côté serveur avec le user_id (ou
 * "guest:<email>") en référence : c'est ce qui permet au webhook d'activer
 * le bon compte. Sans cette référence, le paiement arrive orphelin, donc on
 * n'ouvre JAMAIS le lien statique en repli — on affiche une erreur.
 */
async function startJekoCheckout(
  plan: JekoPlan,
  _fallbackUrl: string,
  guestEmail?: string
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token && !guestEmail) {
      // Visiteur non connecté : on passe par la page qui demande l'e-mail
      window.location.href = "/subscribe";
      return;
    }

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
    console.error("Création du paiement Jèko impossible", e);
    toast.error("Paiement indisponible pour le moment", {
      description: "Réessaie dans un instant. Aucun montant n'a été débité.",
    });
  }
}

export const openJekoPro = () => startJekoCheckout("pro", JEKO_PRO_URL);
export const openJekoMax = () => startJekoCheckout("ultra", JEKO_MAX_URL);

/** Paiement sans compte : l'e-mail sert à rattacher le paiement à l'inscription. */
export const openJekoProGuest = (email: string) =>
  startJekoCheckout("pro", JEKO_PRO_URL, email);
export const openJekoMaxGuest = (email: string) =>
  startJekoCheckout("ultra", JEKO_MAX_URL, email);
