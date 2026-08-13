import { useRef, useEffect, useState, useCallback } from "react";

/**
 * Affichage éditable du montant, avec un vrai curseur.
 *
 * POURQUOI CE COMPOSANT
 * Avant, le montant était un simple <div> piloté par le pavé maison.
 * On ne pouvait donc pas :
 *   - placer le curseur entre deux chiffres (écrire 2550 à partir de 2500)
 *   - double-taper pour tout sélectionner puis remplacer
 *
 * Ici, le montant est un vrai champ. Le curseur clignote, se place au
 * toucher, et la sélection fonctionne. Mais on garde le pavé maison :
 *   inputMode="none" empêche le clavier système d'apparaître.
 *
 * La valeur remonte toujours en chiffres bruts ("2550"). Le formatage
 * avec espaces ("2 550") est purement visuel : le curseur est
 * reprojeté pour rester au bon endroit malgré les espaces ajoutés.
 */

type Props = {
  /** Chiffres bruts, sans espace ni séparateur. Ex : "2550". */
  value: string;
  onChange: (raw: string) => void;
  /** Position du curseur dans la chaîne BRUTE, exposée pour le pavé. */
  onCaretChange?: (caret: number) => void;
  currency?: string;
  className?: string;
};

/** Insère des espaces tous les 3 chiffres depuis la droite. */
function groupDigits(raw: string): string {
  if (!raw) return "";
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F"); // espace fine insécable
}

/**
 * Convertit une position dans la chaîne BRUTE vers la position
 * correspondante dans la chaîne FORMATÉE (avec espaces).
 */
function rawToFormatted(raw: string, rawCaret: number): number {
  const before = groupDigits(raw.slice(0, rawCaret));
  return before.length;
}

/**
 * Convertit une position dans la chaîne FORMATÉE vers la chaîne BRUTE
 * (en ignorant les espaces).
 */
function formattedToRaw(formatted: string, fmtCaret: number): number {
  let count = 0;
  for (let i = 0; i < fmtCaret && i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) count++;
  }
  return count;
}

export function AmountDisplay({
  value,
  onChange,
  onCaretChange,
  currency = "FCFA",
  className = "",
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const formatted = groupDigits(value);

  /** Repositionne le curseur natif après un reformatage. */
  const setCaret = useCallback(
    (rawCaret: number) => {
      const el = ref.current;
      if (!el) return;
      const fmt = rawToFormatted(value, rawCaret);
      requestAnimationFrame(() => {
        try {
          el.setSelectionRange(fmt, fmt);
        } catch {
          /* champ pas encore prêt */
        }
      });
    },
    [value]
  );

  /** Remonte la position du curseur brut vers le parent (pour le pavé). */
  const reportCaret = useCallback(() => {
    const el = ref.current;
    if (!el || !onCaretChange) return;
    const fmtCaret = el.selectionStart ?? formatted.length;
    onCaretChange(formattedToRaw(formatted, fmtCaret));
  }, [formatted, onCaretChange]);

  /**
   * L'utilisateur tape au clavier physique (rare) ou colle une valeur.
   * On ne garde que les chiffres et on reprojette le curseur.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const fmtCaret = el.selectionStart ?? el.value.length;
    const rawCaret = formattedToRaw(el.value, fmtCaret);
    const raw = el.value.replace(/\D/g, "");
    onChange(raw);
    setCaret(rawCaret);
  };

  // Garde le curseur cohérent quand la valeur change depuis le pavé.
  useEffect(() => {
    reportCaret();
  }, [value, reportCaret]);

  const empty = value.length === 0;

  return (
    <div className={`text-center ${className}`}>
      <div className="relative inline-flex items-baseline justify-center max-w-full">
        <input
          ref={ref}
          value={formatted}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSelect={reportCaret}
          onClick={reportCaret}
          onKeyUp={reportCaret}
          inputMode="none"
          enterKeyHint="done"
          aria-label="Montant"
          className="
            bg-transparent border-none outline-none text-center
            text-[44px] leading-none font-extrabold tracking-[-0.05em]
            text-foreground caret-primary
            flex-1 min-w-0 p-0 m-0
            placeholder:text-muted-foreground/40
          "
          placeholder="0"
          style={{ caretColor: "hsl(var(--primary))" }}
        />
        <span
          className={`ml-2 align-baseline text-[20px] font-bold pointer-events-none shrink-0 whitespace-nowrap ${
            empty ? "text-muted-foreground/40" : "text-muted-foreground"
          }`}
        >
          {currency}
        </span>
      </div>
      <p className="mt-2 text-[11.5px] font-medium text-muted-foreground">
        {focused
          ? "Place le curseur où tu veux, ou sélectionne pour tout remplacer"
          : "Tape le montant, le reste est déjà rempli"}
      </p>
    </div>
  );
}

export default AmountDisplay;
