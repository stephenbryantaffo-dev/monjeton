/**
 * Système de traduction à la volée pour Mon Jeton.
 *
 * Comment ça marche :
 * - L'utilisateur choisit sa langue dans Paramètres → stockée dans localStorage
 * - Chaque texte à l'écran passe par le composant <T>...</T> ou le hook useT()
 * - Au premier affichage, le texte français est envoyé à la fonction edge "translate"
 *   qui le traduit via l'IA Lovable
 * - La traduction est mise en cache (localStorage) pour ne jamais retraduire deux fois
 * - Batching : tous les textes demandés dans les 100 ms suivants partent en UNE requête
 *
 * Coût : minimal grâce au cache. La 2e ouverture de l'app est instantanée.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppLang = "fr" | "en";

const LANG_STORAGE_KEY = "monjeton_app_lang";
const CACHE_KEY_PREFIX = "monjeton_translations_v1_";

// ================================================================
// Cache localStorage
// ================================================================

function loadCache(lang: AppLang): Record<string, string> {
  if (lang === "fr") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + lang);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: AppLang, cache: Record<string, string>) {
  if (lang === "fr") return;
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + lang, JSON.stringify(cache));
  } catch {
    // Silencieux : le cache est un bonus, pas un bloquant
  }
}

// ================================================================
// Batching : on regroupe les demandes de traduction
// ================================================================

type PendingRequest = {
  text: string;
  resolve: (translation: string) => void;
};

class TranslationBatcher {
  private pending: PendingRequest[] = [];
  private timer: number | null = null;
  private lang: AppLang;
  private cache: Record<string, string>;
  private onCacheUpdate: (cache: Record<string, string>) => void;

  constructor(
    lang: AppLang,
    cache: Record<string, string>,
    onCacheUpdate: (cache: Record<string, string>) => void
  ) {
    this.lang = lang;
    this.cache = cache;
    this.onCacheUpdate = onCacheUpdate;
  }

  request(text: string): Promise<string> {
    // Cache hit → réponse immédiate
    if (this.cache[text]) {
      return Promise.resolve(this.cache[text]);
    }

    return new Promise((resolve) => {
      this.pending.push({ text, resolve });

      // On attend 100 ms pour regrouper les demandes simultanées
      if (this.timer !== null) return;
      this.timer = window.setTimeout(() => this.flush(), 100);
    });
  }

  private async flush() {
    const requests = this.pending;
    this.pending = [];
    this.timer = null;
    if (requests.length === 0) return;

    // Dédoublonnage : si le même texte est demandé plusieurs fois, on ne l'envoie qu'une fois
    const uniqueTexts = Array.from(new Set(requests.map((r) => r.text)));

    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: { texts: uniqueTexts, target: this.lang },
      });

      if (error || !data?.translations) {
        // Fallback : renvoyer les originaux
        requests.forEach((r) => r.resolve(r.text));
        return;
      }

      // Construction du mapping texte → traduction
      const mapping: Record<string, string> = {};
      uniqueTexts.forEach((text, i) => {
        mapping[text] = data.translations[i] || text;
      });

      // Mise à jour cache
      Object.assign(this.cache, mapping);
      this.onCacheUpdate({ ...this.cache });

      // Résolution des promesses
      requests.forEach((r) => r.resolve(mapping[r.text] || r.text));
    } catch (e) {
      console.error("Translation batch failed:", e);
      requests.forEach((r) => r.resolve(r.text));
    }
  }
}

// ================================================================
// Contexte React
// ================================================================

interface AppLangContextType {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  translate: (text: string) => Promise<string>;
}

const AppLangContext = createContext<AppLangContextType | undefined>(undefined);

export function AppLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === "en" ? "en" : "fr";
  });

  const [cache, setCache] = useState<Record<string, string>>(() => loadCache(lang));

  // Le batcher est recréé quand la langue change
  const batcher = useMemo(
    () =>
      new TranslationBatcher(lang, cache, (newCache) => {
        setCache(newCache);
        saveCache(lang, newCache);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );

  const setLang = useCallback((newLang: AppLang) => {
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
    setLangState(newLang);
    setCache(loadCache(newLang));
  }, []);

  const translate = useCallback(
    (text: string) => {
      if (lang === "fr" || !text || text.trim().length === 0) {
        return Promise.resolve(text);
      }
      return batcher.request(text);
    },
    [lang, batcher]
  );

  return (
    <AppLangContext.Provider value={{ lang, setLang, translate }}>
      {children}
    </AppLangContext.Provider>
  );
}

export function useAppLang(): AppLangContextType {
  const ctx = useContext(AppLangContext);
  if (!ctx) throw new Error("useAppLang doit être utilisé dans un AppLangProvider");
  return ctx;
}

// ================================================================
// Hook useT : traduit un texte, avec état de chargement
// ================================================================

export function useT(text: string): string {
  const { lang, translate } = useAppLang();
  const [translated, setTranslated] = useState<string>(text);

  useEffect(() => {
    if (lang === "fr") {
      setTranslated(text);
      return;
    }
    let cancelled = false;
    translate(text).then((result) => {
      if (!cancelled) setTranslated(result);
    });
    return () => {
      cancelled = true;
    };
  }, [text, lang, translate]);

  return translated;
}

// ================================================================
// Composant <T> : traduit son contenu (enfant string)
// ================================================================

export function T({ children }: { children: string }) {
  const translated = useT(children);
  return <>{translated}</>;
}
