export type CurrencyCode = "XOF" | "EUR" | "USD";

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  XOF: "F",
  EUR: "€",
  USD: "$",
};

export const CURRENCY_OPTIONS: { code: CurrencyCode; flag: string; label: string }[] = [
  { code: "XOF", flag: "🇨🇮", label: "Franc CFA (XOF)" },
  { code: "EUR", flag: "🇪🇺", label: "Euro (EUR)" },
  { code: "USD", flag: "🇺🇸", label: "Dollar US (USD)" },
];

export function getCurrencySymbol(code?: string | null): string {
  if (!code) return CURRENCY_SYMBOLS.XOF;
  return CURRENCY_SYMBOLS[code as CurrencyCode] ?? code;
}
