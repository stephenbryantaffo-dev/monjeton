import { useCountry } from "@/contexts/CountryContext";
import { getLandingStrings } from "@/lib/landingI18n";

export const useLandingT = () => {
  const { country } = useCountry();
  return { lt: getLandingStrings(country.lang), lang: country.lang };
};
