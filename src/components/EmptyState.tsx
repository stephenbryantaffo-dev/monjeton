import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * <EmptyState> — écran vide invitant plutôt que constatant.
 *
 * POURQUOI
 * Avant : « Aucune transaction », « Aucune dette », « Aucune tontine ».
 * Ces libellés génériques ressemblent aux placeholders par défaut des
 * générateurs d'interface. Ils constatent un vide, ils n'invitent à rien.
 *
 * Après : une phrase courte qui parle à l'utilisateur et lui propose
 * l'action suivante. On garde le composant petit et flexible pour que
 * chaque écran puisse dire quelque chose de spécifique.
 *
 * USAGE
 *   <EmptyState
 *     title="Dis-moi ce que tu as dépensé aujourd'hui."
 *     hint="Tape le micro et parle."
 *     icon={Mic}
 *     action={{ label: "Ajouter", onClick: () => nav('/transactions/new') }}
 *   />
 */
type Props = {
  /** Phrase principale — courte, à la deuxième personne. */
  title: string;
  /** Aide facultative sous la phrase. */
  hint?: string;
  /** Icône Lucide affichée dans le cercle lime. */
  icon?: LucideIcon;
  /** Action principale — sinon rien, juste le message. */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Compact = moins de padding pour listes intégrées. */
  compact?: boolean;
};

export function EmptyState({ title, hint, icon: Icon, action, compact = false }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8" : "py-14"
      }`}
    >
      {Icon && (
        <div
          className={`${compact ? "w-12 h-12" : "w-14 h-14"} rounded-full flex items-center justify-center mb-4`}
          style={{
            background: "hsl(var(--primary) / 0.14)",
            boxShadow: "0 0 24px hsl(var(--primary) / 0.18)",
          }}
        >
          <Icon
            className={`${compact ? "w-5 h-5" : "w-6 h-6"} text-primary`}
            strokeWidth={2.2}
          />
        </div>
      )}
      <p
        className={`${
          compact ? "text-[14px]" : "text-[15px]"
        } font-semibold text-foreground max-w-xs leading-snug`}
      >
        {title}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">{hint}</p>}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5 gradient-primary text-primary-foreground font-bold"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
