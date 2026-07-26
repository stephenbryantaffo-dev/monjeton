/**
 * <AutoTranslate> — traduit AUTOMATIQUEMENT tout le contenu texte de ses enfants.
 *
 * Comment l'utiliser :
 *   Envelopper l'app entière (dans App.tsx ou PrivateApp.tsx) :
 *     <AutoTranslate>
 *       <Routes>...</Routes>
 *     </AutoTranslate>
 *
 * Comment ça marche :
 * - Un MutationObserver surveille le DOM
 * - Quand un nouveau nœud texte apparaît, on l'envoie au batcher de traduction
 * - Une fois traduit, on remplace le contenu du nœud
 * - Les textes traduits sont marqués pour ne pas être re-scannés
 *
 * Ce que ça NE traduit PAS (volontairement) :
 * - Les nombres et montants (128 500 FCFA reste 128 500 FCFA)
 * - Les textes très courts (< 2 caractères)
 * - Les textes contenant "Mon Jeton" ou d'autres mots protégés (filtré côté serveur)
 * - Le contenu des <input>, <textarea>, <script>, <style>
 */

import { useEffect, useRef, ReactNode } from "react";
import { useAppLang } from "@/lib/appTranslation";

const TRANSLATED_MARK = "data-mj-translated";
const TRANSLATING_MARK = "data-mj-translating";

// Balises dont on NE traduit PAS le contenu
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
]);

// Un texte doit contenir au moins une lettre pour valoir la peine d'être traduit
const HAS_LETTER = /[a-zA-ZÀ-ÿ]/;

function shouldTranslate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  if (!HAS_LETTER.test(trimmed)) return false; // Pur numérique / ponctuation
  return true;
}

function isInSkippedElement(node: Node): boolean {
  let el: Node | null = node.parentNode;
  while (el) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const tag = (el as Element).tagName;
      if (SKIP_TAGS.has(tag)) return true;
      // Si l'élément parent est déjà traduit ou en cours, on skip
      if ((el as Element).hasAttribute(TRANSLATING_MARK)) return true;
    }
    el = el.parentNode;
  }
  return false;
}

export function AutoTranslate({ children }: { children: ReactNode }) {
  const { lang, translate } = useAppLang();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Français = langue source, aucune traduction nécessaire
    if (lang === "fr") return;

    const root = rootRef.current;
    if (!root) return;

    // Fonction : scanne un nœud et traduit tous ses text nodes
    const scanAndTranslate = async (node: Node) => {
      const textNodes: Text[] = [];

      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const text = n.nodeValue || "";
          if (!shouldTranslate(text)) return NodeFilter.FILTER_REJECT;
          if (isInSkippedElement(n)) return NodeFilter.FILTER_REJECT;

          // Déjà traduit ?
          const parent = n.parentElement;
          if (parent?.getAttribute(TRANSLATED_MARK) === text.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let current = walker.nextNode();
      while (current) {
        textNodes.push(current as Text);
        current = walker.nextNode();
      }

      // Traduction (batchée automatiquement par le service)
      for (const textNode of textNodes) {
        const originalText = textNode.nodeValue || "";
        const trimmed = originalText.trim();

        // Marquer le parent comme "en cours" pour éviter double-traitement
        const parent = textNode.parentElement;
        if (parent) parent.setAttribute(TRANSLATING_MARK, "1");

        try {
          const translated = await translate(trimmed);
          // Préserver les espaces avant/après
          const leadingSpace = originalText.match(/^\s*/)?.[0] || "";
          const trailingSpace = originalText.match(/\s*$/)?.[0] || "";
          textNode.nodeValue = leadingSpace + translated + trailingSpace;

          if (parent) {
            parent.setAttribute(TRANSLATED_MARK, translated.trim());
            parent.removeAttribute(TRANSLATING_MARK);
          }
        } catch {
          if (parent) parent.removeAttribute(TRANSLATING_MARK);
        }
      }
    };

    // Scan initial
    scanAndTranslate(root);

    // MutationObserver : détecte les nouveaux textes qui apparaissent
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Nouveaux nœuds ajoutés
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            scanAndTranslate(node);
          }
        });
        // Nœud texte modifié
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          const parent = (mutation.target as Text).parentElement;
          if (parent && !parent.hasAttribute(TRANSLATING_MARK)) {
            parent.removeAttribute(TRANSLATED_MARK);
            scanAndTranslate(mutation.target);
          }
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [lang, translate]);

  return <div ref={rootRef}>{children}</div>;
}
