import { Capacitor } from "@capacitor/core";

// Utilisé pour masquer les offres d'abonnement sur iOS (conformité App Store 3.1.1)
export const isIOSNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
