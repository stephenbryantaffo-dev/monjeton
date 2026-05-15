export type CurrencyCode =
  | "XOF" | "XAF" | "EUR" | "USD" | "GBP"
  | "CAD" | "CHF" | "MAD" | "NGN" | "GHS" | "KES";

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  XOF: "F",
  XAF: "F",
  EUR: "€",
  USD: "$",
  GBP: "£",
  CAD: "$",
  CHF: "CHF",
  MAD: "DH",
  NGN: "₦",
  GHS: "GH₵",
  KES: "KSh",
};

export interface CurrencyOption {
  code: CurrencyCode;
  flag: string;
  label: string;
}

export const PRIMARY_CURRENCIES: CurrencyOption[] = [
  { code: "XOF", flag: "🌍", label: "F CFA (XOF) — Afrique de l'Ouest" },
  { code: "EUR", flag: "🇪🇺", label: "Euro (EUR) — Europe" },
  { code: "USD", flag: "🇺🇸", label: "Dollar (USD) — Amérique" },
  { code: "GBP", flag: "🇬🇧", label: "Pound (GBP) — UK" },
];

export const EXTRA_CURRENCIES: CurrencyOption[] = [
  { code: "XAF", flag: "🌍", label: "F CFA (XAF) — Afrique Centrale" },
  { code: "CAD", flag: "🇨🇦", label: "Dollar canadien (CAD)" },
  { code: "CHF", flag: "🇨🇭", label: "Franc suisse (CHF)" },
  { code: "MAD", flag: "🇲🇦", label: "Dirham (MAD)" },
  { code: "NGN", flag: "🇳🇬", label: "Naira (NGN)" },
  { code: "GHS", flag: "🇬🇭", label: "Cedi (GHS)" },
  { code: "KES", flag: "🇰🇪", label: "Shilling (KES)" },
];

export const ALL_CURRENCIES: CurrencyOption[] = [...PRIMARY_CURRENCIES, ...EXTRA_CURRENCIES];

/** @deprecated kept for back-compat */
export const CURRENCY_OPTIONS = PRIMARY_CURRENCIES;

export const ALL_CURRENCY_CODES = new Set<string>(ALL_CURRENCIES.map((c) => c.code));

/** Currencies that use the "no decimals + space thousand sep + suffix" format. */
export const NO_DECIMAL_CURRENCIES = new Set<CurrencyCode>(["XOF", "XAF"]);

export function getCurrencySymbol(code?: string | null): string {
  if (!code) return CURRENCY_SYMBOLS.XOF;
  return CURRENCY_SYMBOLS[code as CurrencyCode] ?? code;
}

/** Map a country code (ISO-2) to a sensible default currency for the user. */
export function currencyForCountry(countryCode?: string | null): CurrencyCode {
  if (!countryCode) return "XOF";
  const map: Record<string, CurrencyCode> = {
    CI: "XOF", SN: "XOF", ML: "XOF", BF: "XOF", TG: "XOF", BJ: "XOF", NE: "XOF", GW: "XOF",
    CM: "XAF", GA: "XAF", CG: "XAF", CF: "XAF", TD: "XAF", GQ: "XAF",
    FR: "EUR", BE: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR", IE: "EUR", LU: "EUR",
    CH: "CHF",
    GB: "GBP",
    US: "USD",
    CA: "CAD",
    MA: "MAD",
    NG: "NGN",
    GH: "GHS",
    KE: "KES",
  };
  return map[countryCode.toUpperCase()] ?? "XOF";
}
