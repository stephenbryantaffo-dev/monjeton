import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Plus } from "lucide-react";
import { VoiceWaveform } from "@/components/transaction/VoiceWaveform";

/**
 * Écran plein d'enregistrement vocal.
 *
 * Composant PUREMENT présentationnel : il ne touche pas à MediaRecorder.
 * Toute la mécanique d'enregistrement reste dans NewTransaction.tsx.
 * Le stream micro n'est lu que par la waveform (visualisation), jamais coupé ici.
 */

/** Formate des secondes en m:ss (0:03, 1:24…). */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  /** true dès que l'enregistrement a démarré (même en pause). */
  isRecording: boolean;
  isPaused: boolean;
  /** true pendant l'envoi à l'IA. */
  isProcessing: boolean;
  /** Secondes écoulées. */
  elapsed: number;
  /** Flux micro actif, pour la visualisation de la voix. */
  stream: MediaStream | null;
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
  /** Ferme le vocal et laisse l'utilisateur taper au clavier. */
  onWriteInstead: () => void;
};

export function VoiceRecorderSheet({
  open,
  isRecording,
  isProcessing,
  elapsed,
  stream,
  transcriptFinal,
  transcriptPartial,
  onStart,
  onStop,
  onCancel,
  onWriteInstead,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onCancel()}>
      <SheetContent
        side="bottom"
        className="h-[100dvh] max-h-[100dvh] rounded-none flex flex-col items-center justify-center px-6"
      >
        {isProcessing ? (
          <>
            <h2 className="text-xl font-bold text-foreground text-center">
              J'écris ta dépense
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Quelques secondes…
            </p>
            <Loader2 className="mx-auto my-10 h-12 w-12 animate-spin text-primary" />
            <div className="w-full max-w-sm min-h-[84px] rounded-2xl glass-card p-4 text-center">
              {transcriptFinal ? (
                <p className="text-[15px] text-foreground leading-relaxed">
                  {transcriptFinal}
                </p>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Analyse en cours…
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-foreground text-center">
              Dis ce que tu as payé
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-2">
              {isRecording ? "Je t'écoute…" : "Appuie et parle normalement"}
            </p>

            {/* Onde sonore + minuteur pendant l'écoute */}
            {isRecording && (
              <div className="w-full max-w-sm mt-6 animate-fade-in">
                <VoiceWaveform stream={stream} />
                <p
                  className="mt-1 text-center text-sm font-semibold tabular-nums"
                  style={{ color: "#7BFF3A" }}
                  aria-live="polite"
                >
                  {formatDuration(elapsed)}
                </p>
              </div>
            )}

            <button
              onClick={isRecording ? onStop : onStart}
              className={`w-32 h-32 rounded-full ${isRecording ? "my-4" : "my-10"} flex items-center justify-center gradient-primary text-primary-foreground transition-transform ${
                isRecording ? "scale-110 neon-glow" : ""
              }`}
              aria-label={isRecording ? "Arrêter" : "Parler"}
            >
              <Mic className="w-12 h-12" />
            </button>

            {/* Transcription en direct — l'utilisateur voit ce que l'IA comprend */}
            <div className="w-full max-w-sm min-h-[84px] rounded-2xl glass-card p-4 text-center">
              {transcriptFinal || transcriptPartial ? (
                <p className="text-[15px] text-foreground leading-relaxed">
                  {transcriptFinal}
                  {transcriptPartial && (
                    <span className="text-muted-foreground"> {transcriptPartial}</span>
                  )}
                </p>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Exemple : « J'ai payé 2 500 au garba »
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full max-w-sm mt-8">
              <Button variant="outline" className="flex-1 glass" onClick={onCancel}>
                Annuler
              </Button>
              <Button
                className="flex-1 gradient-primary text-primary-foreground"
                onClick={isRecording ? onStop : onStart}
              >
                {isRecording ? "Terminer" : "Parler"}
              </Button>
            </div>

            {!isRecording && !isProcessing && (
              <button
                onClick={onWriteInstead}
                className="mt-6 w-full max-w-sm rounded-2xl border border-border py-3.5 flex items-center justify-center gap-2 text-[13.5px] font-bold text-foreground active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4 text-primary" />
                Écrire à la main
              </button>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default VoiceRecorderSheet;
