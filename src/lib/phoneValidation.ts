// Country dial codes mapped to ISO codes used in COUNTRIES (src/lib/i18n.ts)
export const DIAL_CODES: Record<string, string> = {
  CI: "225", SN: "221", ML: "223", BF: "226", TG: "228", BJ: "229",
  CM: "237", GA: "241", FR: "33", BE: "32", CH: "41", MA: "212",
  US: "1", CA: "1", GB: "44", NG: "234", GH: "233",
  DE: "49", IT: "39", ES: "34",
};

// Pays qui suppriment le 0 (trunk prefix) en format international
const STRIP_TRUNK_ZERO: Record<string, boolean> = {
  FR: true, BE: true, CH: true, GB: true,
  MA: true, DE: true, IT: true, ES: true,
  // Pays qui GARDENT le 0 (fait partie du numéro national)
  CI: false, SN: false, ML: false, BF: false,
  TG: false, BJ: false, CM: false, GA: false,
  US: false, CA: false, NG: false, GH: false,
};

// Longueur attendue du numéro national APRÈS traitement (sans dial code)
// Pour les pays qui gardent le 0, on accepte avec OU sans le 0 initial.
const NATIONAL_LENGTHS: Record<string, [number, number]> = {
  CI: [9, 10], SN: [9, 9], ML: [8, 8], BF: [8, 8], TG: [8, 8], BJ: [8, 10],
  CM: [9, 9], GA: [8, 9], FR: [9, 9], BE: [9, 9], CH: [9, 9], MA: [9, 9],
  US: [10, 10], CA: [10, 10], GB: [10, 10], NG: [10, 10], GH: [9, 9],
  DE: [10, 11], IT: [9, 10], ES: [9, 9],
};

const EXAMPLES: Record<string, string> = {
  CI: "0778361988", SN: "771234567", ML: "70123456", BF: "70123456",
  TG: "90123456", BJ: "90123456", CM: "670123456", GA: "60123456",
  FR: "0612345678", BE: "0470123456", CH: "0791234567", MA: "0612345678",
  US: "5551234567", CA: "5551234567", GB: "07700123456", NG: "8031234567",
  GH: "201234567", DE: "01512345678", IT: "3123456789", ES: "612345678",
};

const COUNTRY_NAMES: Record<string, string> = {
  CI: "Côte d'Ivoire", SN: "Sénégal", ML: "Mali", BF: "Burkina Faso",
  TG: "Togo", BJ: "Bénin", CM: "Cameroun", GA: "Gabon",
  FR: "France", BE: "Belgique", CH: "Suisse", MA: "Maroc",
  US: "USA", CA: "Canada", GB: "UK", NG: "Nigeria", GH: "Ghana",
  DE: "Allemagne", IT: "Italie", ES: "Espagne",
};

export interface PhoneParseResult {
  valid: boolean;
  e164: string | null;
  display: string | null;
  error?: string;
}

export function parsePhone(input: string, countryCode: string): PhoneParseResult {
  const raw = (input || "").trim();
  if (!raw) return { valid: false, e164: null, display: null, error: "Numéro requis" };

  let cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.lastIndexOf("+") > 0) {
    cleaned = "+" + cleaned.replace(/\+/g, "");
  }

  let dial = DIAL_CODES[countryCode] || "";
  let national = "";
  let isoForDial = countryCode;

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    const matchedDial = Object.values(DIAL_CODES)
      .sort((a, b) => b.length - a.length)
      .find(d => digits.startsWith(d));
    if (!matchedDial) {
      return { valid: false, e164: null, display: null, error: "Indicatif pays non reconnu" };
    }
    dial = matchedDial;
    national = digits.slice(matchedDial.length);
    isoForDial = Object.entries(DIAL_CODES).find(([, d]) => d === matchedDial)?.[0] || countryCode;
  } else {
    if (!dial) {
      return { valid: false, e164: null, display: null, error: "Pays inconnu" };
    }
    const stripZero = STRIP_TRUNK_ZERO[countryCode] ?? false;
    if (stripZero) {
      national = cleaned.replace(/^0+/, "");
    } else {
      national = cleaned;
    }
    // Si l'utilisateur a tapé l'indicatif sans +, le retirer
    if (national.startsWith(dial)) national = national.slice(dial.length);
  }

  if (!/^\d+$/.test(national)) {
    return { valid: false, e164: null, display: null, error: "Chiffres uniquement" };
  }

  const [min, max] = NATIONAL_LENGTHS[isoForDial] || [7, 12];

  if (national.length < min || national.length > max) {
    const example = EXAMPLES[isoForDial] || "";
    const name = COUNTRY_NAMES[isoForDial] || isoForDial;
    return {
      valid: false,
      e164: null,
      display: null,
      error: `Numéro invalide pour ${name} : ${national.length} chiffres saisis, ${min === max ? min : `${min}-${max}`} attendus.${example ? ` Exemple : ${example}` : ""}`,
    };
  }

  const e164 = `+${dial}${national}`;
  const grouped = national.match(/.{1,2}/g)?.join(" ") || national;
  const display = `+${dial} ${grouped}`;

  return { valid: true, e164, display };
}

export function formatPhoneInput(input: string): string {
  let v = input.replace(/[^\d+\s]/g, "");
  if (v.lastIndexOf("+") > 0) v = (v.startsWith("+") ? "+" : "") + v.replace(/\+/g, "");
  return v.slice(0, 20);
}
