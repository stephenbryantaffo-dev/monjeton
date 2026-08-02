import type { ReactNode, ElementType } from "react";

/**
 * <UserText> — affiche du contenu saisi par l'utilisateur, sans traduction.
 *
 * POURQUOI
 * Mon Jeton traduit automatiquement son interface quand l'utilisateur
 * choisit l'anglais. Mais ce mécanisme ne fait pas la différence entre
 * un libellé de l'app et une donnée saisie : "Alimentation" devenait
 * "Feeding", "Factures" devenait "Bills", et le nom d'une personne à qui
 * on doit de l'argent pouvait être réécrit.
 *
 * Ces contenus appartiennent à l'utilisateur. On les enveloppe donc ici.
 *
 * USAGE
 *   <UserText>{categorie.nom}</UserText>
 *   <UserText as="h2" className="text-lg font-bold">{caisse.name}</UserText>
 *
 * L'attribut translate="no" est le standard HTML : il protège aussi le
 * contenu des traducteurs intégrés au navigateur (Chrome, Safari).
 */

type Props = {
  children: ReactNode;
  /** Balise à produire. Par défaut <span>, neutre dans un flux de texte. */
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

export function UserText({
  children,
  as: Tag = "span",
  className,
  style,
  title,
}: Props) {
  return (
    <Tag
      translate="no"
      data-no-translate=""
      className={className}
      style={style}
      title={title}
    >
      {children}
    </Tag>
  );
}

export default UserText;
