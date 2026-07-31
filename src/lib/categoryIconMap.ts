import {
  Utensils, Car, Home, ShoppingBag, Zap, Heart, GraduationCap,
  Plane, Gift, Phone, Wifi, Shirt, Dumbbell, Music, Film,
  Coffee, Baby, PiggyBank, Briefcase, Stethoscope, Wrench,
  Bus, Fuel, Landmark, HandCoins, TrendingUp, Wallet,
  Gamepad2, Building2, Smartphone, Package, CreditCard,
  MoreHorizontal, Tag, Receipt, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Icônes proposées pour personnaliser une catégorie.
 *
 * POURQUOI CETTE TABLE EXISTE
 * Le code précédent faisait `import { icons } from "lucide-react"`, ce qui
 * embarquait les ~1500 icônes de la bibliothèque dans le bundle — 638 Ko
 * pour un sélecteur qui n'en propose que 32.
 *
 * En listant les icônes explicitement, l'optimiseur ne garde que
 * celles-ci. Le nom stocké en base (`categories.icon`) ne change pas :
 * c'est toujours une chaîne du type "Utensils".
 */

/** Les icônes proposées dans le sélecteur, dans l'ordre d'affichage. */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Utensils, Car, Home, ShoppingBag, Zap, Heart, GraduationCap,
  Plane, Gift, Phone, Wifi, Shirt, Dumbbell, Music, Film,
  Coffee, Baby, PiggyBank, Briefcase, Stethoscope, Wrench,
  Bus, Fuel, Landmark, HandCoins, TrendingUp, Wallet,
  Gamepad2, Building2, Smartphone, Package, CreditCard,

  // Valeurs déjà présentes en base chez certains utilisateurs,
  // absentes du sélecteur mais qui doivent continuer de s'afficher.
  MoreHorizontal, Tag, Receipt, Users,
};

/** Noms proposés dans la grille de sélection. */
export const ICON_OPTIONS: string[] = [
  "Utensils", "Car", "Home", "ShoppingBag", "Zap", "Heart", "GraduationCap",
  "Plane", "Gift", "Phone", "Wifi", "Shirt", "Dumbbell", "Music", "Film",
  "Coffee", "Baby", "PiggyBank", "Briefcase", "Stethoscope", "Wrench",
  "Bus", "Fuel", "Landmark", "HandCoins", "TrendingUp", "Wallet",
  "Gamepad2", "Building2", "Smartphone", "Package", "CreditCard",
];

/**
 * Résout un nom d'icône stocké en base.
 * Repli sur Wallet si le nom est inconnu — jamais de case vide.
 */
export function resolveCategoryIcon(name?: string | null): LucideIcon {
  if (!name) return Wallet;
  return CATEGORY_ICON_MAP[name] ?? Wallet;
}

export default resolveCategoryIcon;
