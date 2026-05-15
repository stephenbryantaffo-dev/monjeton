import waveIcon from "@/assets/wallets/wave.svg";
import orangeIcon from "@/assets/wallets/orange-money.svg";
import mtnIcon from "@/assets/wallets/mtn-mobile-money.svg";
import moovIcon from "@/assets/wallets/moov-money.svg";
import cashIcon from "@/assets/wallets/cash.svg";

/** Mapping name → asset URL (Vite-resolved). */
export const WALLET_ICONS: Record<string, string> = {
  "Wave": waveIcon,
  "Orange Money": orangeIcon,
  "MTN Mobile Money": mtnIcon,
  "MTN Money": mtnIcon,
  "Moov Money": moovIcon,
  "Cash": cashIcon,
  "Espèces": cashIcon,
};

/** Fallback color generated from the wallet name (used when no logo). */
export function walletFallbackColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export function getWalletIcon(name: string): string | null {
  return WALLET_ICONS[name?.trim()] ?? null;
}
