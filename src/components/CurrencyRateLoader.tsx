import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCurrency } from "@/lib/currencyStore";
import { setRateState } from "@/lib/exchangeRateStore";
import { useToast } from "@/hooks/use-toast";

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Background loader that keeps the XOF → active-currency exchange rate fresh
 * in the synchronous store. Mount once at the app root.
 *
 * Strategy: amounts in DB are XOF. We need a multiplier xofToActive so that
 * `xofAmount * xofToActive = activeAmount`. We get it by asking convert-currency
 * how many XOF make 1 unit of the active currency, then inverting.
 */
const CurrencyRateLoader = () => {
  const active = useActiveCurrency();
  const { toast } = useToast();
  const warnedRef = useRef(false);

  const { data, error } = useQuery({
    queryKey: ["xof-rate", active],
    enabled: active !== "XOF",
    staleTime: SIX_HOURS,
    gcTime: SIX_HOURS,
    retry: 1,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("no_session");

      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/convert-currency`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: 1,
          from_currency: active,
          to_currency: "XOF",
        }),
      });
      if (!res.ok) throw new Error("convert_failed");
      const json = await res.json();
      const activeToXof = Number(json.exchange_rate) || Number(json.converted_amount);
      if (!activeToXof || activeToXof <= 0) throw new Error("invalid_rate");
      return { activeToXof };
    },
  });

  useEffect(() => {
    if (active === "XOF") {
      setRateState({ xofToActive: 1, forCurrency: "XOF", fallback: false, ready: true });
      warnedRef.current = false;
      return;
    }
    if (data?.activeToXof) {
      setRateState({
        xofToActive: 1 / data.activeToXof,
        forCurrency: active,
        fallback: false,
        ready: true,
      });
      warnedRef.current = false;
    } else if (error) {
      setRateState({ xofToActive: 1, forCurrency: "XOF", fallback: true, ready: true });
      if (!warnedRef.current) {
        warnedRef.current = true;
        toast({
          title: "Conversion indisponible",
          description: "Montants affichés en F CFA temporairement.",
        });
      }
    }
  }, [active, data, error, toast]);

  return null;
};

export default CurrencyRateLoader;
