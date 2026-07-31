import React, { CSSProperties, ReactNode, HTMLAttributes } from 'react';

/**
 * Liseré lumineux qui tourne autour d'un bloc.
 *
 * Les couleurs suivent désormais les tokens de l'application
 * (--card, --primary, --destructive) au lieu d'être codées en dur.
 * L'ancienne version utilisait le lime olive et un violet qui
 * n'existent plus dans la charte.
 *
 * `tone` choisit la couleur du reflet :
 *   "lime"  — entrées d'argent, actions positives (défaut)
 *   "red"   — sorties d'argent
 *   "muted" — blocs neutres, reflet discret
 */

type Tone = 'lime' | 'red' | 'muted';

interface BorderRotateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children: ReactNode;
  className?: string;
  /** Durée d'un tour complet, en secondes. */
  animationSpeed?: number;
  tone?: Tone;
  /** Couleur du fond intérieur. Par défaut, celle des cartes. */
  surface?: string;
  style?: CSSProperties;
}

const TONES: Record<Tone, { dim: string; bright: string }> = {
  lime: { dim: 'hsl(var(--primary) / 0.35)', bright: 'hsl(var(--primary))' },
  red: {
    dim: 'hsl(var(--destructive) / 0.35)',
    bright: 'hsl(var(--destructive))',
  },
  muted: {
    dim: 'hsl(var(--border))',
    bright: 'hsl(var(--muted-foreground) / 0.7)',
  },
};

const BorderRotate: React.FC<BorderRotateProps> = ({
  children,
  className = '',
  animationSpeed = 12,
  tone = 'lime',
  surface = 'hsl(var(--card))',
  style = {},
  ...props
}) => {
  const { dim, bright } = TONES[tone];
  const base = 'hsl(var(--border))';

  const combinedStyle: CSSProperties = {
    border: '1px solid transparent',
    borderRadius: '16px',
    backgroundImage: `
      linear-gradient(${surface}, ${surface}),
      conic-gradient(
        from var(--gradient-angle, 0deg),
        ${base} 0%,
        ${dim} 24%,
        ${bright} 30%,
        ${dim} 36%,
        ${base} 60%,
        ${base} 100%
      )
    `,
    backgroundClip: 'padding-box, border-box',
    backgroundOrigin: 'padding-box, border-box',
    animation: `gradient-rotate ${animationSpeed}s linear infinite`,
    ...style,
  } as CSSProperties;

  return (
    <div className={className} style={combinedStyle} {...props}>
      {children}
    </div>
  );
};

export { BorderRotate };
