export type Currency = "XOF" | "XAF" | "EUR" | "USD" | "GBP" | "NGN" | "GHS" | "MAD";
export type Lang = "fr" | "en";

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  lang: Lang;
  currency: Currency;
  currencySymbol: string;
  subscriptionPrice: number;
  subscriptionLabel: string;
}

export const COUNTRIES: CountryConfig[] = [
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", lang: "fr", currency: "XOF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "SN", name: "Sénégal",        flag: "🇸🇳", lang: "fr", currency: "XOF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "ML", name: "Mali",           flag: "🇲🇱", lang: "fr", currency: "XOF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "BF", name: "Burkina Faso",   flag: "🇧🇫", lang: "fr", currency: "XOF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "TG", name: "Togo",           flag: "🇹🇬", lang: "fr", currency: "XOF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "BJ", name: "Bénin",          flag: "🇧🇯", lang: "fr", currency: "XOF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "CM", name: "Cameroun",       flag: "🇨🇲", lang: "fr", currency: "XAF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "GA", name: "Gabon",          flag: "🇬🇦", lang: "fr", currency: "XAF", currencySymbol: "F CFA", subscriptionPrice: 2000,  subscriptionLabel: "2 000 FCFA/mois" },
  { code: "FR", name: "France",         flag: "🇫🇷", lang: "fr", currency: "EUR", currencySymbol: "€",     subscriptionPrice: 3,     subscriptionLabel: "3€/mois" },
  { code: "BE", name: "Belgique",       flag: "🇧🇪", lang: "fr", currency: "EUR", currencySymbol: "€",     subscriptionPrice: 3,     subscriptionLabel: "3€/mois" },
  { code: "CH", name: "Suisse",         flag: "🇨🇭", lang: "fr", currency: "EUR", currencySymbol: "€",     subscriptionPrice: 3,     subscriptionLabel: "3€/mois" },
  { code: "MA", name: "Maroc",          flag: "🇲🇦", lang: "fr", currency: "MAD", currencySymbol: "DH",    subscriptionPrice: 30,    subscriptionLabel: "30 DH/mois" },
  { code: "US", name: "United States",  flag: "🇺🇸", lang: "en", currency: "USD", currencySymbol: "$",     subscriptionPrice: 3,     subscriptionLabel: "$3/month" },
  { code: "CA", name: "Canada",         flag: "🇨🇦", lang: "en", currency: "USD", currencySymbol: "$",     subscriptionPrice: 3,     subscriptionLabel: "$3/month" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", lang: "en", currency: "GBP", currencySymbol: "£",     subscriptionPrice: 2.5,   subscriptionLabel: "£2.5/month" },
  { code: "NG", name: "Nigeria",        flag: "🇳🇬", lang: "en", currency: "NGN", currencySymbol: "₦",     subscriptionPrice: 1500,  subscriptionLabel: "₦1,500/month" },
  { code: "GH", name: "Ghana",          flag: "🇬🇭", lang: "en", currency: "GHS", currencySymbol: "GH₵",  subscriptionPrice: 15,    subscriptionLabel: "GH₵15/month" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export const detectCountry = async (): Promise<CountryConfig> => {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const found = COUNTRIES.find(c => c.code === data.country_code);
    return found || DEFAULT_COUNTRY;
  } catch {
    const lang = navigator.language?.toLowerCase() || "";
    if (lang.includes("en")) {
      return COUNTRIES.find(c => c.code === "US") || DEFAULT_COUNTRY;
    }
    if (lang.includes("fr")) return DEFAULT_COUNTRY;
    return DEFAULT_COUNTRY;
  }
};

export const TRANSLATIONS = {
  fr: {
    subscribe_title: "Abonnement requis",
    subscribe_desc: "Abonne-toi au plan Pro pour débloquer toutes les fonctionnalités",
    subscribe_btn: "Voir les tarifs",
    pricing_title: "Choisissez votre plan",
    free_plan: "Gratuit",
    pro_plan: "Pro",
    per_month: "/mois",
    features_free: ["Saisie manuelle", "5 transactions/jour", "1 portefeuille"],
    features_pro: ["Tout illimité", "Saisie vocale", "Assistant IA", "Scan OCR", "Tontines", "Rapports PDF"],
    select_country: "Choisir mon pays",
    dashboard_hello: "Bonjour",
    new_transaction: "Nouvelle transaction",
    amount: "Montant",
    category: "Catégorie",
    wallet: "Portefeuille",
    save: "Enregistrer",
  },
  en: {
    subscribe_title: "Subscription required",
    subscribe_desc: "Subscribe to the Pro plan to unlock all features",
    subscribe_btn: "See pricing",
    pricing_title: "Choose your plan",
    free_plan: "Free",
    pro_plan: "Pro",
    per_month: "/month",
    features_free: ["Manual entry", "5 transactions/day", "1 wallet"],
    features_pro: ["Everything unlimited", "Voice entry", "AI Assistant", "OCR Scan", "Tontines", "PDF Reports"],
    select_country: "Choose my country",
    dashboard_hello: "Hello",
    new_transaction: "New transaction",
    amount: "Amount",
    category: "Category",
    wallet: "Wallet",
    save: "Save",
  }
} as const;
