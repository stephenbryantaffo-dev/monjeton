import { useEffect } from "react";

const SITE_URL = "https://monjeton.app";

interface Meta {
  title: string;
  description: string;
  path: string; // route path, e.g. "/login"
  ogImage?: string;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Sets per-route <title>, meta description, canonical and og:* tags.
 * Lightweight alternative to react-helmet-async (no provider needed).
 */
export function useDocumentMeta({ title, description, path, ogImage }: Meta) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertLink("canonical", url);

    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    if (ogImage) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: ogImage });
    }

    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
  }, [title, description, path, ogImage]);
}
