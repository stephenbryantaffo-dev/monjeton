import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { JekoMethod } from "@/lib/jeko";

const METHODS: { id: JekoMethod; label: string; emoji: string }[] = [
  { id: "wave", label: "Wave", emoji: "🌊" },
  { id: "orange", label: "Orange Money", emoji: "🟠" },
  { id: "mtn", label: "MTN MoMo", emoji: "🟡" },
  { id: "moov", label: "Moov Money", emoji: "🔵" },
  { id: "djamo", label: "Djamo", emoji: "💳" },
];

/**
 * Jèko exige le moyen de paiement à la création de la demande.
 * Ce composant, monté une seule fois, répond à l'événement "jeko:choose-method".
 */
const JekoMethodPicker = () => {
  const [resolver, setResolver] = useState<((m: JekoMethod | null) => void) | null>(null);

  useEffect(() => {
    (window as any).__jekoPickerMounted = true;
    const onAsk = (e: Event) => {
      const resolve = (e as CustomEvent).detail?.resolve as (m: JekoMethod | null) => void;
      setResolver(() => resolve);
    };
    window.addEventListener("jeko:choose-method", onAsk);
    return () => {
      (window as any).__jekoPickerMounted = false;
      window.removeEventListener("jeko:choose-method", onAsk);
    };
  }, []);

  const answer = (m: JekoMethod | null) => {
    resolver?.(m);
    setResolver(null);
  };

  return (
    <Dialog open={resolver !== null} onOpenChange={(o) => !o && answer(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Comment veux-tu payer ?</DialogTitle>
          <DialogDescription>Choisis ton moyen de paiement pour continuer.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2.5">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => answer(m.id)}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-3 text-sm font-medium text-foreground transition hover:border-primary/60 hover:bg-secondary/70"
            >
              <span className="text-lg">{m.emoji}</span>
              <span className="truncate">{m.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JekoMethodPicker;
