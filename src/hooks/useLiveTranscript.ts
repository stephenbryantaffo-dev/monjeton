import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Transcription en direct pendant l'enregistrement.
 *
 * IMPORTANT — ce hook ne sert QU'À L'AFFICHAGE.
 * La vérité reste l'audio envoyé à l'edge function speech-to-text,
 * qui gère bien mieux le nouchi, les noms locaux et les montants.
 * Ici on veut juste montrer à l'utilisateur qu'on l'écoute vraiment.
 *
 * Disponibilité :
 *  - Chrome / Android / Edge : oui (webkitSpeechRecognition)
 *  - Safari iOS en navigateur : non → `supported` vaut false,
 *    l'interface affiche simplement « J'écoute… » sans texte.
 *
 * Le repli est silencieux : aucune erreur remontée à l'utilisateur.
 */

type LiveTranscript = {
  /** Mots déjà confirmés par le moteur. */
  final: string;
  /** Mots en cours, encore incertains (affichés en gris). */
  partial: string;
  /** false si le navigateur ne sait pas faire de reconnaissance locale. */
  supported: boolean;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export function useLiveTranscript(): LiveTranscript {
  const [final, setFinal] = useState("");
  const [partial, setPartial] = useState("");
  const [supported, setSupported] = useState(false);

  const recRef = useRef<any>(null);
  // On distingue un arrêt volontaire d'une coupure automatique du moteur,
  // qui s'arrête tout seul après quelques secondes de silence.
  const wantedRef = useRef(false);

  useEffect(() => {
    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const build = useCallback(() => {
    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Ctor) return null;

    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let confirmed = "";
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) confirmed += r[0].transcript;
        else pending += r[0].transcript;
      }
      if (confirmed) setFinal((prev) => (prev + " " + confirmed).trim());
      setPartial(pending.trim());
    };

    // Le moteur se coupe seul après un silence : on relance tant que
    // l'utilisateur n'a pas explicitement arrêté ou mis en pause.
    rec.onend = () => {
      if (wantedRef.current && recRef.current) {
        try {
          recRef.current.start();
        } catch {
          /* déjà démarré, on ignore */
        }
      }
    };

    rec.onerror = () => {
      /* repli silencieux : l'enregistrement audio continue de son côté */
    };

    return rec;
  }, []);

  const start = useCallback(() => {
    const rec = build();
    if (!rec) return;
    recRef.current = rec;
    wantedRef.current = true;
    setFinal("");
    setPartial("");
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }, [build]);

  const stop = useCallback(() => {
    wantedRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setPartial("");
  }, []);

  const pause = useCallback(() => {
    wantedRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setPartial("");
  }, []);

  const resume = useCallback(() => {
    if (!recRef.current) {
      const rec = build();
      if (!rec) return;
      recRef.current = rec;
    }
    wantedRef.current = true;
    try {
      recRef.current.start();
    } catch {
      /* ignore */
    }
  }, [build]);

  const reset = useCallback(() => {
    setFinal("");
    setPartial("");
  }, []);

  // Sécurité : on coupe le moteur si le composant disparaît
  useEffect(() => {
    return () => {
      wantedRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { final, partial, supported, start, stop, pause, resume, reset };
}

export default useLiveTranscript;
