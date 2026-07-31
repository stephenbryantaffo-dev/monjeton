import { Delete } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Pavé numérique pour la saisie d'un montant en FCFA.
 *
 * Pourquoi un pavé maison plutôt que le clavier système :
 *  - le clavier natif saute et recouvre la moitié de l'écran sur mobile
 *  - on peut ajouter la touche "000", indispensable en FCFA où
 *    les montants courants sont des milliers (2 500, 15 000, 100 000)
 *
 * La valeur est gérée en chaîne de chiffres bruts ("2500"), ce qui
 * reste compatible avec la validation existante (validateAmount).
 */

type Props = {
  /** Montant courant, en chiffres bruts sans séparateur. Ex : "2500" */
  value: string;
  onChange: (next: string) => void;
  /** Nombre maximal de chiffres, pour éviter les saisies absurdes. */
  maxDigits?: number;
  className?: string;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"];

export function AmountKeypad({
  value,
  onChange,
  maxDigits = 12,
  className,
}: Props) {
  const press = (key: string) => {
    // Pas de zéros en tête : "0" puis "5" doit donner "5", pas "05"
    const base = value === "0" ? "" : value;
    const next = base + key;
    if (next.replace(/\D/g, "").length > maxDigits) return;
    onChange(next.replace(/^0+(?=\d)/, ""));
  };

  const erase = () => {
    onChange(value.slice(0, -1));
  };

  const eraseAll = () => onChange("");

  return (
    <div className={cn("grid grid-cols-3 gap-2.5", className)}>
      {KEYS.map((k) => (
        <motion.button
          key={k}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => press(k)}
          className={cn(
            "rounded-2xl bg-secondary border border-border py-4",
            "text-2xl font-bold tracking-tight text-foreground",
            "active:bg-secondary/70 transition-colors",
            k === "000" && "text-base font-extrabold text-muted-foreground"
          )}
          aria-label={k === "000" ? "trois zéros" : k}
        >
          {k}
        </motion.button>
      ))}

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={erase}
        onContextMenu={(e) => {
          e.preventDefault();
          eraseAll();
        }}
        className="rounded-2xl bg-secondary border border-border py-4 flex items-center justify-center active:bg-secondary/70 transition-colors"
        aria-label="Effacer le dernier chiffre"
      >
        <Delete className="w-5 h-5 text-muted-foreground" />
      </motion.button>
    </div>
  );
}

export default AmountKeypad;
