import { getActiveCurrency, getActiveCurrencySymbol } from "./currencyStore";
import { CURRENCY_SYMBOLS, type CurrencyCode } from "./currency";

/**
 * Smart money formatting.
 * For XOF (FCFA) we use the compact West-African format (150 000, 1,2 M, 1,2 Md).
 * For EUR/USD we use the standard fr-FR 2-decimal format.
 * The active currency symbol is appended (separated by a thin space).
 */
export function formatMoneySmart(
  amount: number,
  opts?: { currency?: CurrencyCode; withSymbol?: boolean }
): string {
  const currency = opts?.currency ?? getActiveCurrency();
  const withSymbol = opts?.withSymbol !== false;
  const symbol = CURRENCY_SYMBOLS[currency];
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  let body: string;
  if (currency === "XOF") {
    if (abs < 1000) {
      body = `${Math.round(abs)}`;
    } else if (abs < 1_000_000) {
      body = Math.round(abs).toLocaleString("fr-FR");
    } else if (abs < 1_000_000_000) {
      const millions = abs / 1_000_000;
      body = (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace(".", ",")) + " M";
    } else {
      const milliards = abs / 1_000_000_000;
      body = (milliards % 1 === 0 ? milliards.toFixed(0) : milliards.toFixed(1).replace(".", ",")) + " Md";
    }
  } else {
    body = abs.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return withSymbol ? `${sign}${body}\u202F${symbol}` : `${sign}${body}`;
}

/** Convenience: format with the current active currency symbol. */
export function fmtMoney(amount: number): string {
  return formatMoneySmart(amount);
}

/** Just the active symbol (helper for templates). */
export function activeSymbol(): string {
  return getActiveCurrencySymbol();
}

/** Adaptive font size class based on formatted string length. */
export function getAmountFontClass(formattedAmount: string): string {
  const len = formattedAmount.length;
  if (len <= 4) return "text-2xl";
  if (len <= 7) return "text-xl";
  if (len <= 10) return "text-lg";
  return "text-base";
}
