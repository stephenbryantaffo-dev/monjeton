import { Capacitor } from "@capacitor/core";

/**
 * Initialisation des plugins natifs — Mon Jeton
 *
 * Appelé une seule fois au démarrage, depuis main.tsx.
 *
 * POURQUOI CE FICHIER
 * La configuration de capacitor.config.json ne fait que définir des
 * valeurs par défaut. Sur iOS, la barre d'état et le clavier doivent
 * être pilotés explicitement au lancement, sinon :
 *   - la barre d'état garde le style du système (texte noir sur fond
 *     anthracite = illisible)
 *   - le clavier recouvre les champs au lieu de redimensionner la vue
 *
 * Tout est enveloppé dans des try/catch et des imports dynamiques :
 * sur le web, aucun de ces plugins n'existe, et l'app doit démarrer
 * exactement comme avant.
 */

const INK = "#14171C";

export async function initNative(): Promise<void> {
  // Sur navigateur (PWA incluse), il n'y a rien à faire.
  if (!Capacitor.isNativePlatform()) return;

  // ---- Barre d'état ----
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Style.Dark = contenu clair sur fond sombre
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: INK });
    }
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) {
    console.warn("[native] StatusBar indisponible", e);
  }

  // ---- Clavier ----
  try {
    const { Keyboard, KeyboardResize, KeyboardStyle } = await import(
      "@capacitor/keyboard"
    );
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setStyle({ style: KeyboardStyle.Dark });
    // Sur iOS, la barre "Précédent / Suivant / OK" au-dessus du clavier
    // n'a aucun sens avec notre pavé numérique maison.
    if (Capacitor.getPlatform() === "ios") {
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
    }
  } catch (e) {
    console.warn("[native] Keyboard indisponible", e);
  }

  // ---- Écran de démarrage ----
  // launchAutoHide est à true dans la config, mais on le masque
  // explicitement une fois React monté : l'utilisateur ne voit jamais
  // d'écran blanc entre le splash et l'interface.
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch (e) {
    console.warn("[native] SplashScreen indisponible", e);
  }
}

export default initNative;
