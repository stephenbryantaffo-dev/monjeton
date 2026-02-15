import {
  Utensils, Car, Home, ShoppingBag, Zap, Heart, GraduationCap,
  Plane, Gift, Phone, Wifi, Droplets, Shirt, Dumbbell, Music,
  Film, Coffee, Baby, PiggyBank, Briefcase, Stethoscope,
  Wrench, Bus, Fuel, Landmark, HandCoins, TrendingUp, Wallet,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Français
  alimentation: Utensils,
  nourriture: Utensils,
  repas: Utensils,
  restaurant: Coffee,
  transport: Car,
  taxi: Car,
  bus: Bus,
  carburant: Fuel,
  essence: Fuel,
  loyer: Home,
  logement: Home,
  maison: Home,
  shopping: ShoppingBag,
  vêtements: Shirt,
  habits: Shirt,
  électricité: Zap,
  énergie: Zap,
  factures: Zap,
  santé: Stethoscope,
  médecin: Stethoscope,
  pharmacie: Stethoscope,
  éducation: GraduationCap,
  école: GraduationCap,
  formation: GraduationCap,
  voyage: Plane,
  vacances: Plane,
  cadeau: Gift,
  cadeaux: Gift,
  téléphone: Phone,
  communication: Phone,
  internet: Wifi,
  eau: Droplets,
  sport: Dumbbell,
  loisirs: Music,
  divertissement: Film,
  cinéma: Film,
  bébé: Baby,
  enfants: Baby,
  épargne: PiggyBank,
  salaire: Briefcase,
  travail: Briefcase,
  freelance: Briefcase,
  réparation: Wrench,
  entretien: Wrench,
  banque: Landmark,
  investissement: TrendingUp,
  don: HandCoins,
  assurance: Heart,
  abonnement: Wifi,
};

export function getCategoryIcon(categoryName: string | undefined | null): LucideIcon {
  if (!categoryName) return Wallet;
  const key = categoryName.toLowerCase().trim();
  // Exact match
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];
  // Partial match
  for (const [k, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(k) || k.includes(key)) return icon;
  }
  return Wallet;
}
