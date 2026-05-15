import { getWalletIcon, walletFallbackColor } from "@/lib/wallet-icons";

interface WalletIconProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Displays the official logo of the wallet when known,
 * otherwise a colored circle with the first letter as fallback.
 */
const WalletIcon = ({ name, size = 32, className = "" }: WalletIconProps) => {
  const icon = getWalletIcon(name);
  const dim = { width: size, height: size };

  if (icon) {
    return (
      <img
        src={icon}
        alt={name}
        style={dim}
        className={`rounded-full flex-shrink-0 object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  const color = walletFallbackColor(name || "?");
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ ...dim, backgroundColor: color }}
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
    >
      <span style={{ fontSize: size * 0.45 }}>{letter}</span>
    </div>
  );
};

export default WalletIcon;
