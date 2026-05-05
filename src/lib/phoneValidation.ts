// Country dial codes mapped to ISO codes used in COUNTRIES (src/lib/i18n.ts)
export const DIAL_CODES: Record<string, string> = {
  CI: "225", SN: "221", ML: "223", BF: "226", TG: "228", BJ: "229",
  CM: "237", GA: "241", FR: "33", BE: "32", CH: "41", MA: "212",
  US: "1", CA: "1", GB: "44", NG: "234", GH: "233",
};

// Expected national digit length (without country code)
const NATIONAL_LENGTHS: Record<string, [number, number]> = {
  CI: [10, 10], SN: [9, 9], ML: [8, 8], BF: [8, 8], TG: [8, 8], BJ: [8, 10],
  CM: [9, 9], GA: [8, 9], FR: [9, 9], BE: [9, 9], CH: [9, 9], MA: [9, 9],
  US: [10, 10], CA: [10, 10], GB: [10, 10], NG: [10, 10], GH: [9, 9],
};

export interface PhoneParseResult {
  valid: boolean;
  e164: string | null;       // ex: "+22507xxxxxxx" - stocké en BDD
  display: string | null;    // ex: "+225 07 xx xx xx xx"
  error?: string;
}

/**
 * Normalise et valide un numéro WhatsApp.
 * Si l'utilisateur commence par "+", on garde tel quel.
 * Sinon, on préfixe avec l'indicatif du pays sélectionné.
 */
export function parsePhone(input: string, countryCode: string): PhoneParseResult {
  const raw = (input || "").trim();
  if (!raw) return { valid: false, e164: null, display: null, error: "Numéro requis" };

  // Garder uniquement chiffres et +
  let cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.lastIndexOf("+") > 0) {
    cleaned = "+" + cleaned.replace(/\+/g, "");
  }

  let dial = DIAL_CODES[countryCode] || "";
  let national = "";

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    // Trouver le dial code correspondant
    const matchedDial = Object.values(DIAL_CODES).find(d => digits.startsWith(d));
    if (!matchedDial) {
      return { valid: false, e164: null, display: null, error: "Indicatif pays non reconnu" };
    }
    dial = matchedDial;
    national = digits.slice(matchedDial.length);
  } else {
    if (!dial) {
      return { valid: false, e164: null, display: null, error: "Pays inconnu" };
    }
    national = cleaned.replace(/^0+/, "");
    // Si l'utilisateur a déjà tapé l'indicatif sans +, le retirer
    if (national.startsWith(dial)) national = national.slice(dial.length);
  }

  if (!/^\d+$/.test(national)) {
    return { valid: false, e164: null, display: null, error: "Chiffres uniquement" };
  }

  // Trouver country pour bornes
  const isoForDial = Object.entries(DIAL_CODES).find(([, d]) => d === dial)?.[0] || countryCode;
  const [min, max] = NATIONAL_LENGTHS[isoForDial] || [7, 12];

  if (national.length < min) {
    return { valid: false, e164: null, display: null, error: `Trop court (${national.length}/${min} chiffres)` };
  }
  if (national.length > max) {
    return { valid: false, e164: null, display: null, error: `Trop long (${national.length}/${max} chiffres max)` };
  }

  const e164 = `+${dial}${national}`;
  // Display: groupes de 2
  const grouped = national.match(/.{1,2}/g)?.join(" ") || national;
  const display = `+${dial} ${grouped}`;

  return { valid: true, e164, display };
}

export function formatPhoneInput(input: string): string {
  // Permet uniquement chiffres, espaces et un seul + en tête
  let v = input.replace(/[^\d+\s]/g, "");
  if (v.lastIndexOf("+") > 0) v = (v.startsWith("+") ? "+" : "") + v.replace(/\+/g, "");
  return v.slice(0, 20);
}
