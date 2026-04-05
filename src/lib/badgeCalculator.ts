export interface Badge {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  category: "food" | "transport" | "saving" | "balanced" | "shopping" | "social" | "champion";
}

export const BADGES_CI: Record<string, Badge> = {
  glouton: {
    id: "glouton",
    emoji: "🍛",
    title: "Le Gros Glouton",
    subtitle: "Ah le boss, tu dépenses beaucoup dans dabali hein !",
    description: "Plus de 40% de tes dépenses sont en nourriture",
    color: "hsl(25, 95%, 53%)",
    category: "food",
  },
  chauffeur: {
    id: "chauffeur",
    emoji: "🚕",
    title: "Roi du Yango",
    subtitle: "Gbaka, wôrô-wôrô, Yango... tu fais des allers-retours !",
    description: "Transport = ta plus grosse dépense du mois",
    color: "hsl(45, 96%, 58%)",
    category: "transport",
  },
  sapeuse: {
    id: "sapeuse",
    emoji: "👗",
    title: "La Sapeuse",
    subtitle: "Boutique Placard CI t'a vu cette semaine ou comment ?",
    description: "Vêtements et beauté représentent +30% de tes dépenses",
    color: "hsl(300, 70%, 60%)",
    category: "shopping",
  },
  sapeur: {
    id: "sapeur",
    emoji: "👔",
    title: "Le Vrai Sapeur",
    subtitle: "Tu t'es bien sapé ce mois-ci hein, on voit !",
    description: "Shopping & vêtements = top dépense du mois",
    color: "hsl(200, 70%, 60%)",
    category: "shopping",
  },
  economiste: {
    id: "economiste",
    emoji: "💰",
    title: "L'Économiste",
    subtitle: "C'est toi le vrai gestionnaire ! Tout le quartier peut apprendre",
    description: "Tu as épargné plus de 20% de tes revenus",
    color: "hsl(84, 81%, 44%)",
    category: "saving",
  },
  equilibre: {
    id: "equilibre",
    emoji: "⚖️",
    title: "La Balance",
    subtitle: "Ni trop dépenser, ni trop garder. Équilibre parfait !",
    description: "Tes dépenses sont bien réparties entre catégories",
    color: "hsl(180, 70%, 50%)",
    category: "balanced",
  },
  telecom: {
    id: "telecom",
    emoji: "📱",
    title: "Le Telecom",
    subtitle: "Credit, data, forfait... Orange et Wave te connaissent bien !",
    description: "Téléphone et abonnements = gros poste de dépense",
    color: "hsl(25, 80%, 45%)",
    category: "social",
  },
  champion: {
    id: "champion",
    emoji: "🏆",
    title: "Le Champion du Mois",
    subtitle: "Vraiment trop fort ! Tu as tout noté, tout géré. Respect !",
    description: "100% de jours notés, épargne positive ce mois",
    color: "hsl(45, 100%, 55%)",
    category: "champion",
  },
  social: {
    id: "social",
    emoji: "🎉",
    title: "Le Social Butterfly",
    subtitle: "Sorties, restaurants, maquis... tu aimes la vie !",
    description: "Loisirs et sorties = +25% de tes dépenses",
    color: "hsl(320, 70%, 55%)",
    category: "social",
  },
  dette: {
    id: "dette",
    emoji: "💳",
    title: "Le Rembourseur",
    subtitle: "Tu gères tes dettes sérieusement. Chapeau !",
    description: "Tu as remboursé des dettes ce mois-ci",
    color: "hsl(0, 70%, 60%)",
    category: "balanced",
  },
  tontine_champion: {
    id: "tontine_champion",
    emoji: "🤝",
    title: "Le Solidaire",
    subtitle: "Tu cotises toujours à l'heure ! La tontine t'adore boss.",
    description: "100% de tes cotisations payées à temps",
    color: "hsl(150, 70%, 45%)",
    category: "champion",
  },
  tontine_retard: {
    id: "tontine_retard",
    emoji: "😅",
    title: "Le Toujours Tard",
    subtitle: "Eh fréro, la tontine c'est pas 'on verra demain' hein !",
    description: "Tu as des cotisations en retard ce mois",
    color: "hsl(30, 90%, 55%)",
    category: "social",
  },
};

export const calculateMonthlyBadge = (
  transactions: any[],
  profile: any,
  tontineStats?: { totalCycles: number; paidOnTime: number; hasLatePayments: boolean }
): Badge => {
  // Tontine badges take priority if user has tontines
  if (tontineStats && tontineStats.totalCycles > 0) {
    if (tontineStats.hasLatePayments) return BADGES_CI.tontine_retard;
    if (tontineStats.paidOnTime === tontineStats.totalCycles && tontineStats.totalCycles >= 1) {
      return BADGES_CI.tontine_champion;
    }
  }

  const expenses = transactions.filter((t) => t.type === "expense");
  const income = transactions.filter((t) => t.type === "income");
  const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);

  // % par catégorie
  const byCategory: Record<string, number> = {};
  expenses.forEach((t) => {
    const cat = t.categories?.name || "Autre";
    byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
  });

  const topCat = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];
  const topCatName = topCat?.[0]?.toLowerCase() || "";
  const topCatPct = totalExpense > 0 && topCat ? (topCat[1] / totalExpense) * 100 : 0;

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Attribution logic
  if (savingsRate >= 20 && transactions.length >= 10) return BADGES_CI.economiste;
  if (topCatName.includes("aliment") && topCatPct > 40) return BADGES_CI.glouton;
  if (topCatName.includes("transport") && topCatPct > 30) return BADGES_CI.chauffeur;
  if (
    (topCatName.includes("vêtement") || topCatName.includes("beauté") || topCatName.includes("shopping")) &&
    topCatPct > 25
  ) {
    return profile?.gender === "femme" ? BADGES_CI.sapeuse : BADGES_CI.sapeur;
  }
  if (topCatName.includes("téléphone") && topCatPct > 20) return BADGES_CI.telecom;
  if (topCatName.includes("loisir") && topCatPct > 25) return BADGES_CI.social;

  const maxCatPct =
    totalExpense > 0 ? Math.max(...Object.values(byCategory).map((v) => (v / totalExpense) * 100)) : 0;
  if (maxCatPct < 35 && transactions.length >= 5) return BADGES_CI.equilibre;

  return BADGES_CI.equilibre;
};
