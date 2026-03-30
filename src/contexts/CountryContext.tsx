import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CountryConfig, detectCountry, DEFAULT_COUNTRY, TRANSLATIONS, COUNTRIES } from "@/lib/i18n";

interface CountryContextType {
  country: CountryConfig;
  setCountry: (c: CountryConfig) => void;
  t: (typeof TRANSLATIONS)["fr"] | (typeof TRANSLATIONS)["en"];
  formatLocalAmount: (amount: number) => string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const CountryProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountryState] = useState<CountryConfig>(() => {
    const saved = localStorage.getItem("monjeton_country");
    if (saved) {
      const found = COUNTRIES.find(c => c.code === saved);
      if (found) return found;
    }
    return DEFAULT_COUNTRY;
  });

  useEffect(() => {
    if (!localStorage.getItem("monjeton_country")) {
      detectCountry().then(detected => {
        setCountryState(detected);
        localStorage.setItem("monjeton_country", detected.code);
      });
    }
  }, []);

  const setCountry = (c: CountryConfig) => {
    setCountryState(c);
    localStorage.setItem("monjeton_country", c.code);
  };

  const t = TRANSLATIONS[country.lang];

  const formatLocalAmount = (amount: number) => {
    return new Intl.NumberFormat(
      country.lang === "fr" ? "fr-FR" : "en-US",
      { style: "currency", currency: country.currency, maximumFractionDigits: 0 }
    ).format(amount);
  };

  return (
    <CountryContext.Provider value={{ country, setCountry, t, formatLocalAmount }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
};
