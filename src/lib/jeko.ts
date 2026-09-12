import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type JekoMethod = "wave" | "orange" | "mtn" | "moov" | "djamo";

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

/** Demande le moyen de paiement via <JekoMethodPicker /> (obligatoire côté Jèko). */
function askMethod(): Promise<JekoMethod | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !(window as any).__jekoPickerMounted) {
      resolve("wave");
      return;
    }
    window.dispatchEvent(new CustomEvent("jeko:choose-method", { detail: { resolve } }));
  });
}

/**
 * Crée une demande de paiement Jèko côté serveur avec le user_id (ou
 * "guest:<email>") en référence : c'est ce qui permet au webhook d'activer
 * le bon compte. Sans cette référence, le paiement arrive orphelin — il n'y a
 * donc AUCUN lien de paiement statique en repli, on affiche une erreur.
 */
async function startJekoCheckout(plan: JekoPlan, guestEmail?: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token && !guestEmail) {
      // Visiteur non connecté : on passe par la page qui demande l'e-mail
      window.location.href = "/subscribe";
      return;
    }

    const paymentMethod = await askMethod();
    if (!paymentMethod) return; // annulé par l'utilisateur

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jeko-create-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          token ? { plan, paymentMethod } : { plan, paymentMethod, email: guestEmail }
        ),
      }
    );
    if (!res.ok) throw new Error(`jeko-create-payment ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (!json?.redirectUrl) throw new Error("redirectUrl manquante");

    await openJekoCheckout(String(json.redirectUrl));
    return;
  } catch (e) {
    console.error("Création du paiement Jèko impossible", e);
    toast.error("Le paiement est momentanément indisponible", {
      description: "Réessaye dans quelques instants. Aucun montant n'a été débité.",
    });
  }
}

export const openJekoPro = () => startJekoCheckout("pro");
export const openJekoMax = () => startJekoCheckout("ultra");

/** Paiement sans compte : l'e-mail sert à rattacher le paiement à l'inscription. */
export const openJekoProGuest = (email: string) => startJekoCheckout("pro", email);
export const openJekoMaxGuest = (email: string) => startJekoCheckout("ultra", email);
