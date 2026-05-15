// Currency-aware context for AI prompts.
// Adapts the system prompt of budget / scan / coaching functions to the user's
// preferred currency so users outside the UEMOA zone get region-relevant advice.

export type SupportedCurrency =
  | 'XOF' | 'XAF' | 'EUR' | 'USD' | 'GBP'
  | 'CAD' | 'CHF' | 'MAD' | 'NGN' | 'GHS' | 'KES';

export interface CurrencyCtx {
  code: SupportedCurrency;
  label: string;       // human label used in prompts
  region: string;
  wallets: string;     // common payment methods in that region
  costExamples: string;
  savingsRate: string;
  language: 'fr' | 'en';
}

const DEFAULT: CurrencyCtx = {
  code: 'XOF',
  label: 'F CFA',
  region: "Afrique de l'Ouest (UEMOA)",
  wallets: 'Wave, Orange Money, MTN MoMo, Moov Money',
  costExamples: 'loyer Abidjan, tontine, transport SOTRA, marché',
  savingsRate: '10-20%',
  language: 'fr',
};

export const CURRENCY_CONTEXTS: Record<SupportedCurrency, CurrencyCtx> = {
  XOF: DEFAULT,
  XAF: { ...DEFAULT, code: 'XAF', region: 'Afrique Centrale (CEMAC)', wallets: 'Orange Money, MTN MoMo, Express Union' },
  EUR: {
    code: 'EUR', label: '€',
    region: 'Europe (France, Belgique, Suisse FR)',
    wallets: 'compte bancaire, Wise, Revolut, N26, Lydia, PayPal',
    costExamples: 'loyer, abonnement transport, courses supermarché, électricité',
    savingsRate: '15-25%',
    language: 'fr',
  },
  USD: {
    code: 'USD', label: '$',
    region: 'United States / Canada',
    wallets: 'checking account, Venmo, Cash App, Zelle, PayPal',
    costExamples: 'rent, utilities, groceries, gas, subscriptions',
    savingsRate: '15-30% (50/30/20 rule)',
    language: 'en',
  },
  CAD: {
    code: 'CAD', label: 'CAD$',
    region: 'Canada',
    wallets: 'compte bancaire, Interac, PayPal',
    costExamples: 'loyer, épicerie, transport, factures',
    savingsRate: '15-25%',
    language: 'fr',
  },
  GBP: {
    code: 'GBP', label: '£',
    region: 'United Kingdom',
    wallets: 'current account, Monzo, Starling, Revolut, PayPal',
    costExamples: 'rent, council tax, TfL, groceries, utilities',
    savingsRate: '15-25%',
    language: 'en',
  },
  CHF: {
    code: 'CHF', label: 'CHF',
    region: 'Suisse',
    wallets: 'compte bancaire, TWINT, Revolut',
    costExamples: 'loyer, assurance maladie, transports CFF, courses',
    savingsRate: '15-25%',
    language: 'fr',
  },
  MAD: {
    code: 'MAD', label: 'DH',
    region: 'Maroc',
    wallets: 'compte bancaire, cash, M-Wallet',
    costExamples: 'loyer, courses, carburant, factures',
    savingsRate: '10-20%',
    language: 'fr',
  },
  NGN: {
    code: 'NGN', label: '₦',
    region: 'Nigeria',
    wallets: 'bank account, OPay, PalmPay, Kuda',
    costExamples: 'rent, food, transport, fuel, data',
    savingsRate: '10-20%',
    language: 'en',
  },
  GHS: {
    code: 'GHS', label: 'GH₵',
    region: 'Ghana',
    wallets: 'bank account, MTN MoMo, Vodafone Cash',
    costExamples: 'rent, food, transport, utilities',
    savingsRate: '10-20%',
    language: 'en',
  },
  KES: {
    code: 'KES', label: 'KSh',
    region: 'Kenya',
    wallets: 'M-Pesa, Airtel Money, bank account',
    costExamples: 'rent, food, matatu, utilities',
    savingsRate: '10-20%',
    language: 'en',
  },
};

export function getCurrencyCtx(code?: string | null): CurrencyCtx {
  if (!code) return DEFAULT;
  const c = code.toUpperCase() as SupportedCurrency;
  return CURRENCY_CONTEXTS[c] || DEFAULT;
}

/** Loads the user's currency_preference from the profiles table. Returns 'XOF' on any failure. */
export async function loadUserCurrency(
  supabase: any,
  userId: string
): Promise<CurrencyCtx> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('currency_preference')
      .eq('user_id', userId)
      .maybeSingle();
    return getCurrencyCtx(data?.currency_preference);
  } catch {
    return DEFAULT;
  }
}
