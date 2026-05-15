import { getActiveCurrency, getActiveCurrencySymbol } from "./currencyStore";
import { CURRENCY_SYMBOLS, NO_DECIMAL_CURRENCIES, type CurrencyCode } from "./currency";
import { getRateState } from "./exchangeRateStore";

/**
 * Smart money formatting.
 * Inputs are XOF (the database pivot currency). When the user's active
 * currency is different, we silently convert via the cached XOF→active rate
 * before formatting. If conversion is unavailable the helper falls back to XOF.
 */
export function formatMoneySmart(
  amount: number,
  opts?: { currency?: CurrencyCode; withSymbol?: boolean; raw?: boolean }
): string {
  const rate = getRateState();
  // `raw` skips conversion (used when the value is already in the target currency).
  const skipConvert = opts?.raw === true || opts?.currency !== undefined;
  const targetCurrency =
    opts?.currency ??
    (rate.fallback ? "XOF" : getActiveCurrency());
  const withSymbol = opts?.withSymbol !== false;
  const symbol = CURRENCY_SYMBOLS[targetCurrency];
  const converted = skipConvert ? amount : amount * rate.xofToActive;
  const sign = converted < 0 ? "-" : "";
  const abs = Math.abs(converted);
  const currency = targetCurrency;

  let body: string;
  if (NO_DECIMAL_CURRENCIES.has(currency)) {
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
