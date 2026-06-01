// Liens de paiement Jèko (Mon Jeton)
export const JEKO_PRO_URL = "https://pay.jeko.africa/pl/d616710c-47fb-4afc-b0e2-e9fe3e0b29ab";
export const JEKO_MAX_URL = "https://pay.jeko.africa/pl/e7715547-b693-40dd-b06e-9bbb63a90961";

/**
 * Ouvre un lien de paiement Jèko.
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

export const openJekoPro = () => openJekoCheckout(JEKO_PRO_URL);
export const openJekoMax = () => openJekoCheckout(JEKO_MAX_URL);
