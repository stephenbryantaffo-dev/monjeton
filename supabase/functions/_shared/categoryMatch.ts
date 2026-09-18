/**
 * Rapprochement de noms de catégories.
 *
 * Objectif : éviter les doublons du type « Santé » / « Santé et bien-être »
 * créés automatiquement par le scan IA, la saisie vocale ou les suggestions
 * de budget. On compare les noms de façon insensible à la casse, aux accents,
 * à la ponctuation et aux variantes proches.
 */

export function normalizeCategoryName(name: string | null | undefined): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mots vides ignorés lors de la comparaison par jetons. */
const STOP_WORDS = new Set([
  "et", "ou", "de", "du", "des", "la", "le", "les", "un", "une", "aux", "au",
  "and", "or", "the", "of", "divers", "autres", "autre",
]);

/** Familles de synonymes : un nom qui tombe dans la même famille est un doublon. */
const SYNONYM_GROUPS: string[][] = [
  ["sante", "sante et bien etre", "bien etre", "wellness", "health", "pharmacie", "medical", "soins"],
  ["alimentation", "nourriture", "food", "courses", "restauration", "restaurant", "repas", "groceries"],
  ["transport", "transports", "deplacement", "deplacements", "taxi", "carburant", "essence"],
  ["telephone", "communication", "communications", "recharge", "credit telephonique", "phone", "internet", "data"],
  ["factures", "facture", "charges", "bills", "utilities", "electricite", "eau"],
  ["loisirs", "loisir", "divertissement", "entertainment", "sorties", "fun"],
  ["shopping", "vetements", "habillement", "clothes", "mode", "achats"],
  ["logement", "loyer", "maison", "housing", "rent"],
  ["education", "scolarite", "ecole", "school", "etudes", "formation"],
  ["sport", "sports", "fitness", "gym", "musculation"],
  ["epargne", "savings", "economies"],
  ["salaire", "salary", "paie", "revenu principal"],
  ["business", "entreprise", "commerce", "affaires"],
  ["famille", "enfants", "family"],
  ["imprevus", "imprevu", "urgence", "urgences", "divers"],
  ["transfert", "transferts", "virement", "transfer"],
];

function groupOf(normalized: string): number {
  return SYNONYM_GROUPS.findIndex((g) => g.includes(normalized));
}

function tokens(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t && !STOP_WORDS.has(t));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

/** Score de similarité entre 0 et 1. 1 = identique après normalisation. */
export function categorySimilarity(a: string, b: string): number {
  const na = normalizeCategoryName(a);
  const nb = normalizeCategoryName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ga = groupOf(na);
  const gb = groupOf(nb);
  if (ga >= 0 && ga === gb) return 0.97;

  const ta = tokens(na);
  const tb = tokens(nb);
  if (ta.length && tb.length) {
    // « Santé » vs « Santé et bien-être » : un nom contient entièrement l'autre.
    const setA = new Set(ta);
    const setB = new Set(tb);
    const contained = ta.every((t) => setB.has(t)) || tb.every((t) => setA.has(t));
    if (contained) return 0.95;

    // Un jeton principal en commun dans la même famille de synonymes.
    for (const t1 of ta) {
      for (const t2 of tb) {
        if (t1 === t2 && t1.length >= 4) {
          const g1 = groupOf(t1);
          if (g1 >= 0) return 0.9;
        }
      }
    }
  }

  const dist = levenshtein(na, nb);
  const ratio = 1 - dist / Math.max(na.length, nb.length);
  return ratio;
}

const MATCH_THRESHOLD = 0.85;

export interface MatchableCategory {
  id?: string;
  name: string;
  type?: string | null;
}

/**
 * Cherche la catégorie existante correspondant au nom donné.
 * Renvoie null si rien de suffisamment proche n'existe.
 */
export function findMatchingCategory<T extends MatchableCategory>(
  name: string | null | undefined,
  categories: T[],
  type?: "expense" | "income" | null,
): T | null {
  if (!name) return null;
  const pool = type ? categories.filter((c) => !c.type || c.type === type) : categories;
  const candidates = pool.length ? pool : categories;

  let best: T | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = categorySimilarity(name, c.name);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

/** Regroupe les catégories qui se ressemblent (au moins 2 par groupe). */
export function findSimilarGroups<T extends MatchableCategory>(categories: T[]): T[][] {
  const groups: T[][] = [];
  const used = new Set<number>();
  categories.forEach((c, i) => {
    if (used.has(i)) return;
    const group = [c];
    categories.forEach((other, j) => {
      if (j <= i || used.has(j)) return;
      if ((c.type || null) !== (other.type || null)) return;
      if (categorySimilarity(c.name, other.name) >= MATCH_THRESHOLD) {
        group.push(other);
        used.add(j);
      }
    });
    if (group.length > 1) {
      used.add(i);
      groups.push(group);
    }
  });
  return groups;
}
