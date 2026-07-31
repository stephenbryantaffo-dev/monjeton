import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, Plus, Wallet as WalletFallbackIcon } from "lucide-react";
import { getCatIcon } from "@/lib/getCatIcon";
import { getWalletIcon } from "@/lib/wallet-icons";
import { cn } from "@/lib/utils";

/**
 * Les trois sélecteurs de la saisie manuelle.
 *
 * Chacun s'ouvre depuis une pastille sous le montant. Les valeurs sont
 * pré-remplies avec des choix intelligents ; l'utilisateur n'ouvre ces
 * feuilles que s'il veut changer quelque chose.
 */

/* ---------------------------------------------------------------- Catégorie */

type CategorySheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: any[];
  value: string;
  onSelect: (id: string) => void;
  type: "expense" | "income";
};

export function CategorySheet({
  open,
  onOpenChange,
  categories,
  value,
  onSelect,
  type,
}: CategorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg font-extrabold tracking-tight">
            Catégorie
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-2.5 pb-6">
          {categories.map((c) => {
            const active = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "rounded-2xl border p-3 text-center transition-colors",
                  active
                    ? "border-primary/55 bg-primary/10"
                    : "border-border bg-secondary"
                )}
              >
                <span
                  className={cn(
                    "mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full",
                    "bg-primary/10 text-primary"
                  )}
                >
                  {getCatIcon(c.name || "", type)}
                </span>
                <span className="block text-[11.5px] font-bold leading-tight text-foreground">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------- Portefeuille */

type WalletSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wallets: any[];
  value: string;
  onSelect: (id: string) => void;
};

export function WalletSheet({
  open,
  onOpenChange,
  wallets,
  value,
  onSelect,
}: WalletSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg font-extrabold tracking-tight">
            Moyen de paiement
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2.5 pb-6">
          {wallets.map((w) => {
            const active = value === w.id;
            const name = w.wallet_name || "";
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  onSelect(w.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary/55 bg-primary/5"
                    : "border-border bg-secondary"
                )}
              >
                {getWalletIcon(name) ? (
                  <img
                    src={getWalletIcon(name) as string}
                    alt=""
                    aria-hidden="true"
                    className="h-11 w-11 flex-none rounded-xl"
                  />
                ) : (
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary/10">
                    <WalletFallbackIcon className="h-5 w-5 text-primary" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {name}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 flex-none items-center justify-center rounded-full border",
                    active
                      ? "border-primary bg-primary"
                      : "border-border"
                  )}
                >
                  {active && (
                    <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3.2} />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------------------------------------------------- Date */

type DateSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Format ISO court : "2026-07-30" */
  value: string;
  onSelect: (iso: string) => void;
};

const isoOf = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split("T")[0];
};

export function DateSheet({ open, onOpenChange, value, onSelect }: DateSheetProps) {
  const quick = useMemo(
    () => [
      { label: "Aujourd'hui", iso: isoOf(0) },
      { label: "Hier", iso: isoOf(1) },
      { label: "Avant-hier", iso: isoOf(2) },
    ],
    []
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg font-extrabold tracking-tight">
            Date
          </SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 pb-4">
          {quick.map((q) => {
            const active = value === q.iso;
            return (
              <button
                key={q.iso}
                type="button"
                onClick={() => {
                  onSelect(q.iso);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex-1 rounded-full border py-3 text-[13px] font-bold transition-colors",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-muted-foreground"
                )}
              >
                {q.label}
              </button>
            );
          })}
        </div>

        <label className="mb-6 block">
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Une autre date
          </span>
          <input
            type="date"
            value={value}
            max={isoOf(0)}
            onChange={(e) => {
              if (e.target.value) {
                onSelect(e.target.value);
                onOpenChange(false);
              }
            }}
            className="w-full rounded-2xl border border-border bg-secondary px-4 py-3.5 text-[15px] font-semibold text-foreground"
          />
        </label>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ Pastille */

type ChipProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  /** Style pointillé quand la valeur est vide et facultative. */
  empty?: boolean;
};

export function MetaChip({ icon, label, onClick, empty }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full border bg-card px-4 py-3",
        "text-[13px] font-bold transition-colors",
        empty
          ? "border-dashed border-border text-muted-foreground"
          : "border-border text-foreground"
      )}
    >
      <span className={cn("flex-none", empty ? "text-muted-foreground" : "text-primary")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    </button>
  );
}

export { Plus as ChipPlusIcon };
