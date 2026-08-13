import { Delete } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Pavé numérique pour la saisie d'un montant en FCFA.
 *
 * INSERTION À LA POSITION DU CURSEUR
 * Le pavé insère et efface à l'endroit du curseur, pas seulement à la
 * fin. Si le parent fournit `caret` et `onCaretChange`, on respecte la
 * position ; sinon on retombe sur l'ancien comportement (ajout au bout).
 */

type Props = {
  value: string;
  onChange: (next: string) => void;
  caret?: number;
  onCaretChange?: (caret: number) => void;
  maxDigits?: number;
  className?: string;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"];

export function AmountKeypad({
  value,
  onChange,
  caret,
  onCaretChange,
  maxDigits = 12,
  className,
}: Props) {
  const pos = caret == null ? value.length : Math.min(caret, value.length);

  const press = (key: string) => {
    const left = value.slice(0, pos);
    const right = value.slice(pos);

    if (key === "0" && left === "" && right === "") return;
    if (key === "000" && left === "" && right === "") return;

    const nextLeft = left + key;
    let next = nextLeft + right;

    const cleaned = next.replace(/^0+(?=\d)/, "");
    const removed = next.length - cleaned.length;
    next = cleaned;

    if (next.replace(/\D/g, "").length > maxDigits) return;

    onChange(next);
    onCaretChange?.(Math.max(0, nextLeft.length - removed));
  };

  const erase = () => {
    if (pos === 0) return;
    const left = value.slice(0, pos - 1);
    const right = value.slice(pos);
    onChange(left + right);
    onCaretChange?.(pos - 1);
  };

  const eraseAll = () => {
    onChange("");
    onCaretChange?.(0);
  };

  return (
    <div className={cn("grid grid-cols-3 grid-rows-4 gap-2 h-full", className)}>
      {KEYS.map((k) => (
        <motion.button
          key={k}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => press(k)}
          className={cn(
            "rounded-2xl bg-secondary border border-border min-h-[44px] flex items-center justify-center",
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
        className="rounded-2xl bg-secondary border border-border min-h-[44px] flex items-center justify-center active:bg-secondary/70 transition-colors"
        aria-label="Effacer le chiffre avant le curseur"
      >
        <Delete className="w-5 h-5 text-muted-foreground" />
      </motion.button>
    </div>
  );

}

export default AmountKeypad;
