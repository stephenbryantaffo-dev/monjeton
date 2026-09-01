import { useEffect, useRef } from "react";

/**
 * Onde sonore temps réel (type WhatsApp) branchée sur le flux micro.
 *
 * Web Audio API : AudioContext -> AnalyserNode -> requestAnimationFrame.
 * Les barres suivent le niveau de la voix avec un lissage exponentiel :
 * elles montent vite quand on parle et redescendent doucement au silence,
 * ce qui montre que l'app écoute toujours.
 *
 * Ce composant NE touche PAS au MediaRecorder ni aux pistes du micro :
 * il observe le stream et libère seulement ses propres ressources audio
 * (AudioContext, noeuds, boucle d'animation) à l'arrêt ou au démontage.
 */

const BAR_COUNT = 24;
/** Vitesse de montée (attaque) et de descente (relâchement). */
const ATTACK = 0.5;
const RELEASE = 0.12;
/** Hauteur minimale d'une barre au silence (fraction de la hauteur max). */
const FLOOR = 0.06;

type Props = {
  /** Flux micro (getUserMedia). null = onde au repos. */
  stream: MediaStream | null;
  className?: string;
};

export function VoiceWaveform({ stream, className }: Props) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const levelsRef = useRef<number[]>(new Array(BAR_COUNT).fill(FLOOR));

  useEffect(() => {
    if (!stream) {
      // Sans flux, l'onde retombe au repos.
      levelsRef.current.fill(FLOOR);
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.transform = `scaleY(${FLOOR})`;
      });
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let rafId = 0;
    let cancelled = false;

    try {
      audioCtx = new AudioCtx();
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
    } catch {
      return;
    }

    // Certains navigateurs (iOS) suspendent le contexte si l'enregistrement
    // démarre hors d'un geste utilisateur.
    audioCtx.resume().catch(() => {});

    const freq = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (cancelled || !analyser) return;
      analyser.getByteFrequencyData(freq);

      // Niveau global de la voix : moyenne des basses/moyennes fréquences,
      // là où se concentre la parole (les bins hauts sont surtout du bruit).
      const speechBins = Math.floor(freq.length * 0.7);
      let sum = 0;
      for (let i = 0; i < speechBins; i++) sum += freq[i];
      const level = Math.min(1, (sum / speechBins / 255) * 2.4);

      for (let i = 0; i < BAR_COUNT; i++) {
        // Chaque barre échantillonne une tranche de spectre pour donner
        // un mouvement organique (les aigus réagissent différemment des graves).
        const binIdx = Math.floor((i / BAR_COUNT) * speechBins);
        const binLevel = Math.min(1, (freq[binIdx] / 255) * 1.8);
        // Mélange spectre local + niveau global pour éviter les barres mortes.
        const target = Math.max(FLOOR, Math.min(1, binLevel * 0.55 + level * 0.6));
        const current = levelsRef.current[i];
        const k = target > current ? ATTACK : RELEASE;
        const next = current + (target - current) * k;
        levelsRef.current[i] = next;
        const bar = barsRef.current[i];
        if (bar) bar.style.transform = `scaleY(${next.toFixed(3)})`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      try {
        source?.disconnect();
      } catch {
        /* déjà déconnecté */
      }
      audioCtx?.close().catch(() => {});
      analyser = null;
      audioCtx = null;
      source = null;
    };
  }, [stream]);

  return (
    <div
      className={`flex items-center justify-center gap-[3px] h-16 ${className ?? ""}`}
      role="img"
      aria-label="Niveau sonore du micro"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="w-[4px] h-full rounded-full"
          style={{
            backgroundColor: "#7BFF3A",
            transform: `scaleY(${FLOOR})`,
            transformOrigin: "center",
            boxShadow: "0 0 6px rgba(123, 255, 58, 0.35)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

export default VoiceWaveform;
