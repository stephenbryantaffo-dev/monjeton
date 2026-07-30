import {
  Car, Heart, Shirt, Gamepad2, Brain, Home, Receipt,
  Smartphone, Users, CreditCard, Briefcase, Building2,
  ArrowRightLeft, Droplets, Wifi, Fuel, Plane, Gift,
  PiggyBank, Wallet,
} from "lucide-react";

/**
 * Icône d'une catégorie, déduite de son nom.
 *
 * Signature identique à la version précédente : aucun changement
 * nécessaire dans Dashboard.tsx ni Transactions.tsx.
 */

/** Lucide n'a pas de cornet de frites — dessiné à la main, même style. */
const Fries = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6.2 9h11.6l-1.3 11.2a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z" />
    <path d="M6.2 9h11.6" />
    <path d="M9.4 9V4.8M12 9V3.2M14.6 9V5.2" />
  </svg>
);

export const getCatIcon = (name: string, type: string) => {
  const n = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const c = "w-5 h-5";

  // Alimentation
  if (n.includes("aliment") || n.includes("repas") || n.includes("nourrit") ||
      n.includes("restaurant") || n.includes("course") || n.includes("garba"))
    return <Fries className={c} />;

  // Transport
  if (n.includes("transport") || n.includes("taxi") || n.includes("yango") ||
      n.includes("woro") || n.includes("deplacement") || n.includes("bus"))
    return <Car className={c} />;

  if (n.includes("carburant") || n.includes("essence") || n.includes("gasoil") ||
      n.includes("station"))
    return <Fuel className={c} />;

  // Santé
  if (n.includes("sante") || n.includes("pharma") || n.includes("medic") ||
      n.includes("hopital") || n.includes("medecin"))
    return <Heart className={c} />;

  // Shopping
  if (n.includes("shopping") || n.includes("vetement") || n.includes("habit") ||
      n.includes("beaute") || n.includes("chaussure"))
    return <Shirt className={c} />;

  // Loisirs
  if (n.includes("loisir") || n.includes("sport") || n.includes("sortie") ||
      n.includes("jeu") || n.includes("cinema") || n.includes("musique"))
    return <Gamepad2 className={c} />;

  // Éducation
  if (n.includes("scolarit") || n.includes("formation") || n.includes("education") ||
      n.includes("ecole") || n.includes("universit") || n.includes("cours"))
    return <Brain className={c} />;

  // Logement — avant "facture" pour que "loyer" ne tombe pas dans les factures
  if (n.includes("loyer") || n.includes("logement") || n.includes("maison") ||
      n.includes("immobilier"))
    return <Home className={c} />;

  // Factures & abonnements
  if (n.includes("eau"))
    return <Droplets className={c} />;
  if (n.includes("internet") || n.includes("wifi") || n.includes("abonnement"))
    return <Wifi className={c} />;
  if (n.includes("facture") || n.includes("electr") || n.includes("energie") ||
      n.includes("cie") || n.includes("sodeci"))
    return <Receipt className={c} />;

  // Télécom
  if (n.includes("telephone") || n.includes("phone") || n.includes("recharge") ||
      n.includes("credit de communication"))
    return <Smartphone className={c} />;

  // Argent partagé
  if (n.includes("tontine") || n.includes("cotis") || n.includes("caisse"))
    return <Users className={c} />;
  if (n.includes("dette") || n.includes("rembours") || n.includes("pret"))
    return <CreditCard className={c} />;

  // Entrées d'argent
  if (n.includes("salaire") || n.includes("vente") || n.includes("revenu") ||
      n.includes("freelance"))
    return <Briefcase className={c} />;
  if (n.includes("entreprise") || n.includes("charges") || n.includes("business"))
    return <Building2 className={c} />;

  // Divers
  if (n.includes("epargne") || n.includes("investis"))
    return <PiggyBank className={c} />;
  if (n.includes("voyage") || n.includes("vacance") || n.includes("avion"))
    return <Plane className={c} />;
  if (n.includes("cadeau") || n.includes("don") || n.includes("famille"))
    return <Gift className={c} />;
  if (n.includes("transfert"))
    return <ArrowRightLeft className={c} />;

  // Repli : une entrée d'argent sans catégorie reconnue reste une entrée
  if (type === "income") return <Briefcase className={c} />;
  return <Wallet className={c} />;
};

export default getCatIcon;
