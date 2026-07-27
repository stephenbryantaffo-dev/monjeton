/**
 * Lexique nouchi partagé pour les fonctions IA de Mon Jeton.
 *
 * Source : dataset "nouchi-lexicon" de Prince Kouamé (licence MIT)
 * https://huggingface.co/datasets/princekouame1/nouchi-lexicon
 *
 * FILTRAGE VOLONTAIRE :
 * Le dataset original contient 125 entrées, dont une partie de termes
 * vulgaires, sexuels ou insultants. Mon Jeton est utilisée par des familles,
 * des mères de famille et des commerçants : ces termes sont exclus.
 * Seuls les mots utiles à la gestion d'argent sont conservés.
 *
 * Usage : importer NOUCHI_PROMPT et l'injecter dans le prompt système
 * des fonctions parse-voice et chat.
 */

/** Montants — la partie la plus critique pour l'extraction de transactions. */
export const NOUCHI_MONTANTS: Record<string, string> = {
  togo: "100 FCFA",
  plomb: "100 FCFA",
  gbess: "500 FCFA",
  gbêss: "500 FCFA",
  barre: "1 000 FCFA",
  barres: "1 000 FCFA chacune",
  brique: "1 000 FCFA",
  briques: "1 000 FCFA chacune",
  balle: "1 FCFA (unité)",
  balles: "francs CFA",
};

/** Argent, finance, possession. */
export const NOUCHI_ARGENT: Record<string, string> = {
  djê: "argent",
  dje: "argent",
  bédou: "portefeuille",
  bedou: "portefeuille",
  piqué: "être fauché, sans argent",
  pique: "être fauché, sans argent",
  vaper: "dépenser, gaspiller",
  faroter: "distribuer de l'argent, dépenser pour impressionner",
  farot: "dépense ostentatoire",
  "c'est dass": "c'est gratuit, c'est offert",
  dass: "gratuit, cadeau",
  bôrô: "beaucoup, un sac (grande quantité)",
  boro: "beaucoup, une grande quantité",
};

/** Travail et revenus. */
export const NOUCHI_TRAVAIL: Record<string, string> = {
  bara: "travail, travailler",
  djossi: "petit boulot, activité rémunérée",
  gbô: "travail, business, activité qui rapporte",
  gbo: "travail, business",
  brobro: "travailler dur, se débrouiller",
  ken: "plan, affaire, deal",
  boua: "père, vieux (respectueux)",
};

/** Alimentation. */
export const NOUCHI_ALIMENTATION: Record<string, string> = {
  dabali: "nourriture, repas",
  bourou: "pain",
  garba: "plat de thon frit et attiéké (repas de rue)",
  alloco: "bananes plantains frites",
  attiéké: "semoule de manioc",
  placali: "pâte de manioc",
  gnamankoudji: "jus de gingembre",
  maquis: "restaurant/bar populaire",
};

/** Transport. */
export const NOUCHI_TRANSPORT: Record<string, string> = {
  "woro-woro": "taxi collectif communal",
  woroworo: "taxi collectif communal",
  gbaka: "minibus de transport en commun",
  yango: "VTC (application de course)",
};

/** Social, entraide, tontines. */
export const NOUCHI_SOCIAL: Record<string, string> = {
  môgô: "ami, personne, gars",
  mogo: "ami, personne",
  gnamakro: "amis proches, frères de cœur",
  gbonhi: "groupe d'amis, bande",
  soutra: "aider, dépanner, secourir",
  yako: "condoléances, compassion",
  "ya foye": "il n'y a rien, pas de problème",
  gaou: "naïf, qui ne connaît pas",
  enjailler: "faire plaisir, s'amuser",
  agnon: "habits, vêtements",
  bigo: "téléphone",
  zo: "beau, joli",
  kpata: "beau, magnifique",
  choco: "élégant, chic",
};

/**
 * Fragment compact à injecter dans un prompt système.
 * Format optimisé pour limiter le coût en tokens.
 */
export const NOUCHI_PROMPT = `
LEXIQUE NOUCHI (argot ivoirien) — comprends ces termes s'ils apparaissent :

MONTANTS (essentiel) : togo/plomb = 100 F · gbêss = 500 F · barre/brique = 1000 F · balles = francs CFA
Exemples : "deux barres" = 2000 F · "trois gbêss" = 1500 F · "un togo" = 100 F

ARGENT : djê = argent · bédou = portefeuille · piqué = fauché · vaper = dépenser/gaspiller · faroter = dépenser pour impressionner · c'est dass = c'est gratuit · bôrô = beaucoup

TRAVAIL : bara = travail · djossi = petit boulot · gbô = business qui rapporte · brobro = se débrouiller · ken = affaire/deal

NOURRITURE : dabali = nourriture · bourou = pain · garba = thon-attiéké · alloco = plantains frits · attiéké · placali · gnamankoudji = jus de gingembre · maquis = restaurant populaire

TRANSPORT : woro-woro = taxi collectif · gbaka = minibus · yango = VTC

SOCIAL : môgô = ami · gnamakro/gbonhi = bande d'amis · soutra = aider/dépanner · yako = condoléances · ya foye = pas de problème · gaou = naïf · enjailler = s'amuser · agnon = habits · bigo = téléphone · zo/kpata = beau

RÈGLE DE TON : tu comprends le nouchi parfaitement. Tu peux répondre avec quelques
touches de nouchi si l'utilisateur en emploie, mais reste toujours clair et respectueux.
N'utilise JAMAIS de termes vulgaires, sexuels ou insultants, même s'ils existent en nouchi :
l'application est utilisée par des familles et des commerçants.
`.trim();

/** Lexique complet fusionné, si besoin d'une recherche mot à mot. */
export const NOUCHI_LEXICON: Record<string, string> = {
  ...NOUCHI_MONTANTS,
  ...NOUCHI_ARGENT,
  ...NOUCHI_TRAVAIL,
  ...NOUCHI_ALIMENTATION,
  ...NOUCHI_TRANSPORT,
  ...NOUCHI_SOCIAL,
};

/** Traduit un mot nouchi en français, ou renvoie null si inconnu. */
export function traduireNouchi(mot: string): string | null {
  const clé = mot.toLowerCase().trim();
  return NOUCHI_LEXICON[clé] ?? null;
}

/** Convertit une expression de montant nouchi en FCFA. Ex: "deux barres" → 2000 */
const MULTIPLICATEURS: Record<string, number> = {
  togo: 100,
  plomb: 100,
  gbess: 500,
  gbêss: 500,
  barre: 1000,
  barres: 1000,
  brique: 1000,
  briques: 1000,
};

const NOMBRES_FR: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
  six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
};

export function montantNouchiVersFcfa(expression: string): number | null {
  const texte = expression.toLowerCase().trim();
  const mots = texte.split(/\s+/);

  for (let i = 0; i < mots.length; i++) {
    const unité = MULTIPLICATEURS[mots[i]];
    if (!unité) continue;

    // Cherche le nombre juste avant (chiffre ou mot)
    const précédent = mots[i - 1] ?? "";
    const quantité =
      Number(précédent) || NOMBRES_FR[précédent] || 1;

    return quantité * unité;
  }

  return null;
}
