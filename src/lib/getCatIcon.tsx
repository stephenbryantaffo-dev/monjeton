/**
 * Icônes de catégories — Mon Jeton
 * Tracés inspirés de Lucide, dessinés pour rester lisibles à 18-22 px.
 * Aucune dépendance, aucun émoji.
 */

type Props = {
  /** Nom de la catégorie tel qu'il est stocké en base ("Alimentation", "Santé", …) */
  name: string;
  className?: string;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Chaque entrée ne contient que le contenu du <svg>, les attributs sont communs. */
const PATHS: Record<string, JSX.Element> = {
  // Cornet de frites
  alimentation: (
    <>
      <path d="M6.2 9h11.6l-1.3 11.2a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z" />
      <path d="M6.2 9h11.6" />
      <path d="M9.4 9V4.8M12 9V3.2M14.6 9V5.2" />
    </>
  ),

  // Voiture
  transport: (
    <>
      <path d="M19 17h2a1 1 0 0 0 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3a2.6 2.6 0 0 0-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),

  // Maison
  logement: (
    <>
      <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 21v-7h6v7" />
    </>
  ),

  // Cœur
  sante: (
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
  ),

  // T-shirt
  shopping: (
    <path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2z" />
  ),

  // Manette de jeu
  loisirs: (
    <>
      <path d="M6 11h4M8 9v4" />
      <path d="M15.5 12h.01M18 10h.01" />
      <path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4a2 2 0 0 1 1.4-.6h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z" />
    </>
  ),

  // Reçu
  factures: (
    <>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </>
  ),

  // Cerveau
  education: (
    <>
      <path d="M12 5a3 3 0 1 0-5.9.1A4 4 0 0 0 3.5 11a4 4 0 0 0 .6 6.6A4 4 0 1 0 12 18z" />
      <path d="M12 5a3 3 0 1 1 5.9.1A4 4 0 0 1 20.5 11a4 4 0 0 1-.6 6.6A4 4 0 1 1 12 18z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </>
  ),

  // Repli : étiquette
  _default: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z" />
      <path d="M7.5 7.5h.01" />
    </>
  ),
};

/** Synonymes rencontrés en base ou saisis par les utilisateurs. */
const ALIAS: Record<string, string> = {
  nourriture: "alimentation",
  repas: "alimentation",
  restaurant: "alimentation",
  courses: "alimentation",
  deplacement: "transport",
  taxi: "transport",
  carburant: "transport",
  loyer: "logement",
  maison: "logement",
  medical: "sante",
  pharmacie: "sante",
  sortie: "loisirs",
  sorties: "loisirs",
  loisir: "loisirs",
  divertissement: "loisirs",
  vetements: "shopping",
  facture: "factures",
  abonnement: "factures",
  ecole: "education",
  scolarite: "education",
  formation: "education",
};

export function CategoryIcon({ name, className = "w-5 h-5" }: Props) {
  const key = norm(name);
  const resolved = ALIAS[key] ?? key;
  const content = PATHS[resolved] ?? PATHS._default;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

export default CategoryIcon;
