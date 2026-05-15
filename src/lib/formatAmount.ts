// Formatage des montants avec séparateur de milliers (espace fine \u202F)

export const formatThousands = (
  value: string | number | null | undefined
): string => {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'string'
    ? value.replace(/[\s\u00A0\u202F]/g, '')
    : String(value);
  const cleaned = raw.replace(/[^\d]/g, '');
  if (!cleaned) return '';
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
};

export const parseThousands = (
  value: string | number | null | undefined
): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^\d]/g, '');
  return Number(cleaned) || 0;
};

import { getActiveCurrencySymbol } from "./currencyStore";

export const formatMoneyDisplay = (
  value: number,
  showCurrency: boolean = true
): string => {
  const formatted = formatThousands(value);
  return showCurrency ? `${formatted}\u202F${getActiveCurrencySymbol()}` : formatted;
};
