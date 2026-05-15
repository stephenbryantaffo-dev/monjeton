import { useEffect, useState } from "react";
import type { CurrencyCode } from "./currency";
import { CURRENCY_SYMBOLS } from "./currency";

const STORAGE_KEY = "monjeton_active_currency";

let active: CurrencyCode = (() => {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (v === "XOF" || v === "EUR" || v === "USD") return v;
  } catch {}
  return "XOF";
})();

const listeners = new Set<(c: CurrencyCode) => void>();

export function getActiveCurrency(): CurrencyCode {
  return active;
}

export function getActiveCurrencySymbol(): string {
  return CURRENCY_SYMBOLS[active];
}

export function setActiveCurrency(code: CurrencyCode) {
  if (code === active) return;
  active = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  listeners.forEach((fn) => fn(code));
}

export function subscribeActiveCurrency(fn: (c: CurrencyCode) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useActiveCurrency(): CurrencyCode {
  const [c, setC] = useState<CurrencyCode>(active);
  useEffect(() => {
    const unsub = subscribeActiveCurrency(setC);
    return () => { unsub; };
  }, []);
  return c;
}
