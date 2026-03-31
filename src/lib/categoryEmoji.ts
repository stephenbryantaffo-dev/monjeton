const EMOJI_RULES: Array<{ keywords: string[]; emoji: string }> = [
  { keywords: ["aliment", "nourrit", "repas"], emoji: "🍛" },
  { keywords: ["transport", "taxi", "yango"], emoji: "🚕" },
  { keywords: ["téléphone", "phone", "recharge"], emoji: "📱" },
  { keywords: ["santé", "pharma", "médic"], emoji: "💊" },
  { keywords: ["shopping", "vêtement", "beauté"], emoji: "👗" },
  { keywords: ["facture", "loyer", "électr"], emoji: "🏠" },
  { keywords: ["loisir", "sport", "sortie"], emoji: "🎮" },
  { keywords: ["tontine", "cotis"], emoji: "🤝" },
  { keywords: ["dette", "rembours"], emoji: "💳" },
  { keywords: ["salaire", "revenu", "vente"], emoji: "💰" },
  { keywords: ["transfert"], emoji: "↔️" },
  { keywords: ["scolarit", "formation"], emoji: "🎓" },
  { keywords: ["entreprise", "charges"], emoji: "🏢" },
  { keywords: ["eau", "water"], emoji: "💧" },
  { keywords: ["internet", "wifi", "abonnement"], emoji: "🌐" },
  { keywords: ["café", "coffee", "restaurant"], emoji: "☕" },
  { keywords: ["assurance", "mutuelle"], emoji: "🛡️" },
  { keywords: ["cadeau", "don"], emoji: "🎁" },
  { keywords: ["voyage", "vacance", "avion"], emoji: "✈️" },
];

export function getCategoryEmoji(
  categoryName: string | undefined | null,
  type?: string
): string {
  const name = (categoryName || "").toLowerCase();
  for (const rule of EMOJI_RULES) {
    if (rule.keywords.some((k) => name.includes(k))) return rule.emoji;
  }
  return type === "income" ? "💰" : "💸";
}
