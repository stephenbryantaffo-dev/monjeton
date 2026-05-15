import { useEffect, useState } from "react";
import type { CurrencyCode } from "./currency";

/**
 * Synchronous store for the XOF → active-currency exchange rate.
 * The app stores all transaction amounts in XOF (pivot). This rate lets us
 * convert any XOF total into the user's preferred currency at display time
 * without making an async call inside synchronous formatters.
 *
 * `xofToActive` means: 1 XOF = X active-currency units.
 * For XOF active currency the rate is 1. For EUR it's ~1/655.957.
 */

interface RateState {
  /** Multiplier to apply to a XOF amount to get the active-currency amount. */
  xofToActive: number;
  /** Currency the rate corresponds to. */
  forCurrency: CurrencyCode;
  /** True when conversion failed and we fall back to displaying XOF. */
  fallback: boolean;
  /** Loaded at least once. */
  ready: boolean;
}

let state: RateState = {
  xofToActive: 1,
  forCurrency: "XOF",
  fallback: false,
  ready: true,
};

const listeners = new Set<(s: RateState) => void>();

export function getRateState(): RateState {
  return state;
}

export function setRateState(next: Partial<RateState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l(state));
}

export function subscribeRate(fn: (s: RateState) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useExchangeRateState(): RateState {
  const [s, setS] = useState<RateState>(state);
  useEffect(() => subscribeRate(setS), []);
  return s;
}

/** Convert a XOF amount to the active currency using the cached rate. */
export function convertFromXof(xofAmount: number): number {
  return xofAmount * state.xofToActive;
}
