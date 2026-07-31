import {
  Target, Smartphone, Home, GraduationCap, Plane, Car, Gift,
  Laptop, Wallet, ShoppingBag, UtensilsCrossed, Trophy, Gamepad2,
  Heart, Palmtree, Baby, Briefcase, PiggyBank, Shirt, Wrench,
  Building2, Bike, Camera, Music, BookOpen, Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Traducteur émoji → icône Lucide.
 *
 * POURQUOI CE FICHIER
 * La colonne `savings_goals.emoji` contient déjà des émojis chez tes
 * utilisateurs. On ne peut pas les effacer sans casser leurs objectifs.
 *
 * Ce traducteur accepte DEUX formats :
 *   - un émoji hérité  ("🎯", "📱", "🏠"…)  → converti à l'affichage
 *   - une clé stable   ("target", "phone"…) → nouveau format écrit en base
 *
 * Résultat : aucune migration de base, et plus un seul émoji à l'écran.
 * Les anciens objectifs s'affichent avec une icône, les nouveaux stockent
 * une clé lisible.
 */

export type IconKey =
  | "target" | "phone" | "home" | "school" | "travel" | "car" | "gift"
  | "laptop" | "money" | "shopping" | "food" | "sport" | "game"
  | "health" | "beach" | "family" | "work" | "savings" | "clothes"
  | "tools" | "business" | "bike" | "photo" | "music" | "book" | "care";

const ICONS: Record<IconKey, LucideIcon> = {
  target: Target,
  phone: Smartphone,
  home: Home,
  school: GraduationCap,
  travel: Plane,
  car: Car,
  gift: Gift,
  laptop: Laptop,
  money: Wallet,
  shopping: ShoppingBag,
  food: UtensilsCrossed,
  sport: Trophy,
  game: Gamepad2,
  health: Heart,
  beach: Palmtree,
  family: Baby,
  work: Briefcase,
  savings: PiggyBank,
  clothes: Shirt,
  tools: Wrench,
  business: Building2,
  bike: Bike,
  photo: Camera,
  music: Music,
  book: BookOpen,
  care: Stethoscope,
};

/** Correspondance des émojis déjà stockés en base. */
const LEGACY: Record<string, IconKey> = {
  "🎯": "target",
  "📱": "phone",
  "🏠": "home",
  "🏡": "home",
  "🎓": "school",
  "✈️": "travel",
  "✈": "travel",
  "🏖️": "beach",
  "🏖": "beach",
  "🚗": "car",
  "🚕": "car",
  "🎁": "gift",
  "💻": "laptop",
  "💰": "money",
  "💵": "money",
  "🛍️": "shopping",
  "🛍": "shopping",
  "🍽️": "food",
  "🍽": "food",
  "🍛": "food",
  "⚽": "sport",
  "🎮": "game",
  "💍": "gift",
  "❤️": "health",
  "🩺": "care",
  "👶": "family",
  "💼": "work",
  "🐷": "savings",
  "👗": "clothes",
  "🔧": "tools",
  "🏢": "business",
  "🚲": "bike",
  "📷": "photo",
  "🎵": "music",
  "📚": "book",
};

/** Ce que propose le sélecteur d'icône, à la création d'un objectif. */
export const ICON_CHOICES: IconKey[] = [
  "target", "phone", "home", "school", "travel", "car",
  "laptop", "money", "shopping", "clothes", "sport", "game",
  "gift", "health", "family", "savings",
];

/** Étiquette lisible, utile pour l'accessibilité. */
export const ICON_LABELS: Partial<Record<IconKey, string>> = {
  target: "Objectif", phone: "Téléphone", home: "Maison",
  school: "Études", travel: "Voyage", car: "Voiture",
  laptop: "Ordinateur", money: "Argent", shopping: "Achats",
  clothes: "Vêtements", sport: "Sport", game: "Jeux",
  gift: "Cadeau", health: "Santé", family: "Famille",
  savings: "Épargne",
};

/** Convertit une valeur stockée (émoji hérité OU clé) en clé d'icône. */
export function toIconKey(stored: string | null | undefined): IconKey {
  if (!stored) return "target";
  const s = stored.trim();
  if (s in ICONS) return s as IconKey;
  if (s in LEGACY) return LEGACY[s];
  // Émoji inconnu ou champ libre : repli neutre plutôt qu'un carré vide
  return "target";
}

type Props = {
  /** Valeur venant de la base : émoji hérité ou clé d'icône. */
  value: string | null | undefined;
  className?: string;
};

/** Affiche l'icône correspondant à la valeur stockée. */
export function GoalIcon({ value, className = "w-5 h-5" }: Props) {
  const Icon = ICONS[toIconKey(value)];
  return <Icon className={className} aria-hidden="true" />;
}

export default GoalIcon;
