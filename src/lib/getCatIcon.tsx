import {
  Utensils, Car, Smartphone, Heart,
  ShoppingBag, Home, Gamepad2, Users,
  CreditCard, Briefcase, GraduationCap,
  Building2, ArrowRightLeft, DollarSign,
  Wallet
} from "lucide-react";

export const getCatIcon = (name: string, type: string) => {
  const n = (name || "").toLowerCase();
  const iconStyle: React.CSSProperties = {
    display: 'block',
    WebkitTransform: 'translateZ(0)',
    transform: 'translateZ(0)',
    flexShrink: 0,
    minWidth: 20,
    minHeight: 20,
  };
  if (n.includes("aliment") || n.includes("repas") || n.includes("nourrit"))
    return <Utensils className="w-5 h-5" style={iconStyle} />;
  if (n.includes("transport") || n.includes("taxi") || n.includes("yango") || n.includes("woro"))
    return <Car className="w-5 h-5" style={iconStyle} />;
  if (n.includes("téléphone") || n.includes("phone") || n.includes("recharge"))
    return <Smartphone className="w-5 h-5" style={iconStyle} />;
  if (n.includes("santé") || n.includes("pharma"))
    return <Heart className="w-5 h-5" style={iconStyle} />;
  if (n.includes("shopping") || n.includes("vêtement") || n.includes("beauté"))
    return <ShoppingBag className="w-5 h-5" style={iconStyle} />;
  if (n.includes("loyer") || n.includes("facture") || n.includes("électr"))
    return <Home className="w-5 h-5" style={iconStyle} />;
  if (n.includes("loisir") || n.includes("sport"))
    return <Gamepad2 className="w-5 h-5" style={iconStyle} />;
  if (n.includes("tontine") || n.includes("cotis"))
    return <Users className="w-5 h-5" style={iconStyle} />;
  if (n.includes("dette") || n.includes("rembours"))
    return <CreditCard className="w-5 h-5" style={iconStyle} />;
  if (n.includes("salaire") || n.includes("vente"))
    return <Briefcase className="w-5 h-5" style={iconStyle} />;
  if (n.includes("scolarit") || n.includes("formation"))
    return <GraduationCap className="w-5 h-5" style={iconStyle} />;
  if (n.includes("entreprise") || n.includes("charges"))
    return <Building2 className="w-5 h-5" style={iconStyle} />;
  if (n.includes("transfert"))
    return <ArrowRightLeft className="w-5 h-5" style={iconStyle} />;
  if (type === "income")
    return <DollarSign className="w-5 h-5" style={iconStyle} />;
  return <Wallet className="w-5 h-5" style={iconStyle} />;
};
