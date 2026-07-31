import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Mic, X, Pause, Play, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Feuille d'enregistrement vocal.
 *
 * Composant PUREMENT présentationnel : il ne touche pas à MediaRecorder.
 * Toute la mécanique d'enregistrement reste dans NewTransaction.tsx,
 * ce composant se contente d'afficher l'état et de remonter les gestes.
 *
 * Le contrôleur reprend les codes du dictaphone :
 *   [ X ]  [ ■ TERMINER ]  [ ‖ ]
 * Annuler à gauche (loin du pouce), action principale au centre,
 * pause à droite. Le carré rouge est le signal universel d'arrêt.
 */

type Props = {
  open: boolean;
  /** true dès que l'enregistrement a démarré (même en pause). */
  isRecording: boolean;
  isPaused: boolean;
  /** true pendant l'envoi à l'IA. */
  isProcessing: boolean;
  /** Secondes écoulées. */
  elapsed: number;
  /** Mots confirmés par la reconnaissance locale. */
  transcriptFinal: string;
  /** Mots encore incertains. */
  transcriptPartial: string;
  /** false si le navigateur ne fait pas de transcription en direct. */
  transcriptSupported: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
};

/** Durée minimale avant de pouvoir terminer (règle métier existante). */
const MIN_SECONDS = 2;

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VoiceRecorderSheet({
  open,
  isRecording,
  isPaused,
  isProcessing,
  elapsed,
  transcriptFinal,
  transcriptPartial,
  transcriptSupported,
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
}: Props) {
  const canStop = elapsed >= MIN_SECONDS;
  const hasText = !!(transcriptFinal || transcriptPartial);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onCancel()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border pb-8 pt-4 text-center"
      >
        {/* ---------------------------------------------- État : analyse */}
        {isProcessing ? (
          <>
            <h2 className="text-[19px] font-extrabold tracking-tight text-foreground">
              J'écris ta dépense
            </h2>
            <p className="mt-2 text-[13.5px] font-medium text-muted-foreground">
              Quelques secondes…
            </p>

            <Loader2 className="mx-auto mt-6 h-12 w-12 animate-spin text-primary" />

            {hasText && (
              <div className="mt-6 rounded-2xl border border-border bg-secondary p-4 text-left">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.11em] text-primary">
                  Ce que tu as dit
                </p>
                <p className="text-[15.5px] font-semibold leading-relaxed text-foreground">
                  {transcriptFinal}
                </p>
              </div>
            )}
          </>
        ) : !isRecording ? (
          /* ------------------------------------------- État : prêt */
          <>
            <h2 className="text-[19px] font-extrabold tracking-tight text-foreground">
              Dis ta dépense
            </h2>
            <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-muted-foreground">
              Par exemple :{" "}
              <span className="font-bold text-foreground">
                « J'ai payé 2 500 au garba »
              </span>
            </p>

            <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border border-border bg-secondary">
              <Mic className="h-9 w-9 text-primary" strokeWidth={2} />
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full gradient-primary py-4 text-base font-extrabold text-primary-foreground"
            >
              <Mic className="h-5 w-5" strokeWidth={2.3} />
              Appuie pour parler
            </motion.button>

            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full py-2.5 text-sm font-bold text-muted-foreground"
            >
              Annuler
            </button>
          </>
        ) : (
          /* ------------------------------- État : écoute / pause */
          <>
            <div className="flex items-center justify-center gap-3">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  isPaused ? "bg-amber-400" : "animate-pulse bg-destructive"
                )}
              />
              <span className="text-[31px] font-extrabold tabular-nums tracking-tight text-foreground">
                {fmt(elapsed)}
              </span>
            </div>

            <p className="mt-2 text-[13px] font-medium text-muted-foreground">
              {isPaused
                ? "En pause — tu peux reprendre où tu t'es arrêté"
                : "Parle normalement, puis appuie sur Terminer"}
            </p>

            {/* Transcription en direct */}
            <div className="mt-4 min-h-[92px] rounded-2xl border border-border bg-secondary p-4 text-left">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.11em] text-primary">
                {isPaused ? "En pause" : "Ce que j'entends"}
              </p>

              {hasText ? (
                <p className="text-[15.5px] font-semibold leading-relaxed">
                  <span className="text-foreground">{transcriptFinal}</span>{" "}
                  <span className="text-muted-foreground">
                    {transcriptPartial}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  {transcriptSupported
                    ? "J'attends que tu parles…"
                    : "J'écoute… le texte apparaîtra après l'analyse."}
                </p>
              )}
            </div>

            {/* ------------------------------------ Le contrôleur */}
            <div className="mt-5 flex items-center gap-2.5 rounded-full border border-border bg-secondary p-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onCancel}
                aria-label="Annuler l'enregistrement"
                className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-background"
              >
                <X className="h-5 w-5 text-foreground" strokeWidth={2.4} />
              </motion.button>

              <motion.button
                type="button"
                whileTap={canStop ? { scale: 0.97 } : undefined}
                onClick={() => canStop && onStop()}
                disabled={!canStop}
                aria-label="Terminer l'enregistrement"
                className={cn(
                  "flex h-14 flex-1 items-center justify-center gap-3 rounded-full bg-background",
                  "text-[15px] font-extrabold tracking-[0.07em] text-foreground",
                  !canStop && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "block h-[18px] w-[18px] rounded-[5px]",
                    canStop
                      ? "bg-destructive shadow-[0_0_14px_hsl(var(--destructive)/0.55)]"
                      : "bg-muted-foreground"
                  )}
                />
                TERMINER
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={isPaused ? onResume : onPause}
                aria-label={isPaused ? "Reprendre" : "Mettre en pause"}
                className={cn(
                  "flex h-14 w-14 flex-none items-center justify-center rounded-full",
                  isPaused ? "bg-amber-400" : "bg-background"
                )}
              >
                {isPaused ? (
                  <Play
                    className="h-5 w-5 text-background"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                ) : (
                  <Pause
                    className="h-5 w-5 text-foreground"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                )}
              </motion.button>
            </div>

            <p className="mt-3 text-[11.5px] font-semibold text-muted-foreground">
              {canStop
                ? "Le carré rouge termine et enregistre"
                : `Parle au moins ${MIN_SECONDS} secondes`}
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default VoiceRecorderSheet;
