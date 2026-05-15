import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ScanProgressProps {
  isAnalyzing: boolean;
  hasError?: boolean;
  className?: string;
}

const PHASES = [
  { until: 30, label: "Préparation de l'image", stepMs: 60 },
  { until: 65, label: "Détection des transactions", stepMs: 180 },
  { until: 90, label: "Validation des montants", stepMs: 110 },
  { until: 95, label: "Finalisation", stepMs: 400 },
];

const phaseFor = (p: number) =>
  PHASES.find((ph) => p < ph.until) ?? PHASES[PHASES.length - 1];

export const ScanProgress = ({
  isAnalyzing,
  hasError = false,
  className,
}: ScanProgressProps) => {
  const [progress, setProgress] = useState(0);

  // Progression simulée plafonnée à 95% jusqu'à fin réelle
  useEffect(() => {
    if (!isAnalyzing) {
      // À la complétion : saute à 100%
      if (progress > 0 && !hasError) setProgress(100);
      return;
    }
    setProgress(0);
    let p = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phase = phaseFor(p);
      // Incrément aléatoire petit pour effet réaliste
      const inc = Math.random() * 1.5 + 0.4;
      p = Math.min(95, p + inc);
      setProgress(p);
      if (p < 95) timer = setTimeout(tick, phase.stepMs);
    };
    timer = setTimeout(tick, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyzing]);

  // Reset si erreur
  useEffect(() => {
    if (hasError) setProgress(0);
  }, [hasError]);

  if (hasError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 py-4 px-2 text-center",
          className
        )}
      >
        <AlertCircle className="w-7 h-7 text-destructive" />
        <p className="text-sm font-medium text-foreground">
          Analyse interrompue
        </p>
        <p className="text-xs text-muted-foreground">
          Réessaie avec une image plus nette.
        </p>
      </div>
    );
  }

  const label = phaseFor(Math.min(progress, 94)).label;

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center gap-3 py-3 px-2",
        className
      )}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <Sparkles className="w-4 h-4 text-primary" />
      </motion.div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">{label}…</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {Math.round(progress)}%
        </p>
      </div>

      <Progress value={progress} className="w-full max-w-xs h-1.5" />
    </div>
  );
};

export default ScanProgress;
