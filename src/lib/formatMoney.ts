/**
 * Smart money formatting for West African fintech
 * Rules:
 * < 1 000 → normal display
 * 1 000 – 999 999 → French space format (ex: 150 000)
 * 1 000 000 – 999 999 999 → X,X M
 * ≥ 1 000 000 000 → X,X Md
 */
export function formatMoneySmart(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs < 1000) {
    return `${sign}${abs}`;
  }

  if (abs < 1_000_000) {
    return `${sign}${abs.toLocaleString("fr-FR")}`;
  }

  if (abs < 1_000_000_000) {
    const millions = abs / 1_000_000;
    const formatted = millions % 1 === 0
      ? millions.toFixed(0)
      : millions.toFixed(1).replace(".", ",");
    return `${sign}${formatted} M`;
  }

  const milliards = abs / 1_000_000_000;
  const formatted = milliards % 1 === 0
    ? milliards.toFixed(0)
    : milliards.toFixed(1).replace(".", ",");
  return `${sign}${formatted} Md`;
}

/**
 * Adaptive font size class based on formatted string length
 */
export function getAmountFontClass(formattedAmount: string): string {
  const len = formattedAmount.length;
  if (len <= 4) return "text-2xl";
  if (len <= 7) return "text-xl";
  if (len <= 10) return "text-lg";
  return "text-base";
}
