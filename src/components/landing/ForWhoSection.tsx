import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AccentToken = 'primary' | 'accent' | 'neon-yellow';

const profiles: {
  id: number;
  emoji: string;
  label: string;
  tag: string;
  title: string;
  subtitle: string;
  points: string[];
  image: string;
  accent: AccentToken;
}[] = [
  {
    id: 0,
    emoji: '👩‍👧',
    label: 'Nos mamans',
    tag: 'BUDGET FAMILLE',
    title: "Sachez toujours\noù va l'argent du foyer.",
    subtitle:
      "Entre les dépenses du marché, les frais scolaires et les cotisations de tontine, " +
      'il est facile de perdre le fil. Mon Jeton vous aide à tout suivre simplement, même à la voix.',
    points: [
      'Saisie vocale : dites vos dépenses sans taper',
      'Budget mensuel par catégorie avec alertes',
      'Gestion de tontine avec vos amies',
      'Mode discret pour préserver la confidentialité',
    ],
    image:
      'https://images.unsplash.com/photo-1531983412531-1f49a365ffed?w=900&auto=format&fit=crop&q=60',
    accent: 'primary',
  },
  {
    id: 1,
    emoji: '🎯',
    label: 'Les jeunes',
    tag: 'DISCIPLINE FINANCIÈRE',
    title: 'Construisez votre\navenir financier dès aujourd’hui.',
    subtitle:
      "Commencer à gérer son argent tôt, c’est la meilleure décision. Mon Jeton vous guide " +
      "avec un score financier hebdomadaire, des objectifs d'épargne et un coach IA en franc CFA.",
    points: [
      'Score financier IA chaque semaine',
      'Objectifs d’épargne avec calcul quotidien',
      'Assistant IA pour vos questions finances',
      'Budgets intelligents par catégorie',
    ],
    image:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&auto=format&fit=crop&q=60',
    accent: 'neon-yellow',
  },
  {
    id: 2,
    emoji: '💼',
    label: "Chefs d'entreprise",
    tag: 'GESTION PRO',
    title: 'Gardez le contrôle\nde chaque franc CFA.',
    subtitle:
      'Vous gérez plusieurs comptes mobile money pour votre activité ? Mon Jeton centralise ' +
      'Wave, Orange et MTN en une seule vue. Suivez vos entrées, vos sorties et vos caisses.',
    points: [
      'Multi-portefeuilles Wave, Orange, MTN, Moov',
      'Caisse commune pour vos équipes',
      'Scan des reçus fournisseurs en 5 secondes',
      'Rapports mensuels générés par l’IA',
    ],
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&auto=format&fit=crop&q=60',
    accent: 'primary',
  },
  {
    id: 3,
    emoji: '🛒',
    label: 'Les commerçants',
    tag: 'COMMERCE QUOTIDIEN',
    title: 'Vos ventes et vos stocks,\nsous contrôle.',
    subtitle:
      'Boutique, étal au marché ou commerce mobile : enregistrez chaque vente en un geste, ' +
      'suivez vos marges et identifiez vos meilleurs jours grâce aux rapports automatiques.',
    points: [
      'Enregistrement rapide des ventes du jour',
      'Suivi des dettes clients (crédits)',
      'Rapports journaliers et hebdomadaires',
      'Scan instantané des reçus fournisseurs',
    ],
    image:
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=900&auto=format&fit=crop&q=60',
    accent: 'accent',
  },
];

// Map accent token -> tailwind utility classes (semantic tokens only)
const accentClasses: Record<
  AccentToken,
  {
    bg: string;
    bgSoft: string;
    text: string;
    border: string;
    ring: string;
    glow: string;
    button: 'default' | 'accent';
    dot: string;
  }
> = {
  primary: {
    bg: 'bg-primary',
    bgSoft: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary',
    ring: 'ring-primary/40',
    glow: 'neon-glow',
    button: 'default',
    dot: 'bg-primary',
  },
  accent: {
    bg: 'bg-accent',
    bgSoft: 'bg-accent/10',
    text: 'text-accent',
    border: 'border-accent',
    ring: 'ring-accent/40',
    glow: 'neon-glow-purple',
    button: 'accent',
    dot: 'bg-accent',
  },
  'neon-yellow': {
    bg: 'bg-[hsl(var(--neon-yellow))]',
    bgSoft: 'bg-[hsl(var(--neon-yellow)/0.1)]',
    text: 'text-[hsl(var(--neon-yellow))]',
    border: 'border-[hsl(var(--neon-yellow))]',
    ring: 'ring-[hsl(var(--neon-yellow)/0.4)]',
    glow: 'shadow-[0_0_20px_hsl(var(--neon-yellow)/0.35),0_0_60px_hsl(var(--neon-yellow)/0.12)]',
    button: 'default',
    dot: 'bg-[hsl(var(--neon-yellow))]',
  },
};

const ForWhoSection = () => {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (index: number) => {
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };

  const next = useCallback(() => {
    setDirection(1);
    setActive((prev) => (prev + 1) % profiles.length);
  }, []);

  const prev = () => {
    setDirection(-1);
    setActive((p) => (p - 1 + profiles.length) % profiles.length);
  };

  useEffect(() => {
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [next]);

  const profile = profiles[active];
  const a = accentClasses[profile.accent];

  return (
    <section
      id="for-who"
      className="relative py-16 sm:py-24 px-4 sm:px-5 overflow-hidden"
      style={{ scrollMarginTop: 80 }}
    >
      {/* Glow d'ambiance basé sur l'accent actif */}
      <motion.div
        key={`glow-${profile.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
        aria-hidden
        className={cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none blur-3xl',
          a.bgSoft,
        )}
      />

      {/* Header */}
      <div className="relative max-w-6xl mx-auto text-center mb-10 sm:mb-14">
        <Badge
          variant="outline"
          className="mb-4 border-primary/30 bg-primary/10 text-primary tracking-widest"
        >
          POUR QUI ?
        </Badge>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
          Mon Jeton s’adapte
          <br />
          <span className="text-gradient-hero">à votre vie.</span>
        </h2>
      </div>

      {/* Tabs */}
      <div className="relative max-w-5xl mx-auto flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
        {profiles.map((p, i) => {
          const pa = accentClasses[p.accent];
          const isActive = active === i;
          return (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              className={cn(
                'flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 border',
                isActive
                  ? cn(pa.bg, 'text-primary-foreground border-transparent', pa.glow)
                  : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground hover:bg-secondary',
              )}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Carrousel d'images */}
      <div className="relative max-w-6xl mx-auto mb-8 sm:mb-10">
        <div className="relative h-[260px] sm:h-[340px] flex items-center justify-center">
          {profiles.map((p, index) => {
            const pa = accentClasses[p.accent];
            const offset = index - active;
            const total = profiles.length;
            let pos = (offset + total) % total;
            if (pos > Math.floor(total / 2)) pos = pos - total;

            const isCenter = pos === 0;
            const isAdjacent = Math.abs(pos) === 1;
            const isVisible = Math.abs(pos) <= 1;

            return (
              <motion.button
                type="button"
                key={p.id}
                onClick={() => goTo(index)}
                aria-label={p.label}
                animate={{
                  x:
                    pos *
                    (typeof window !== 'undefined' && window.innerWidth < 640
                      ? 180
                      : 300),
                  scale: isCenter ? 1 : isAdjacent ? 0.75 : 0.5,
                  opacity: isVisible ? (isCenter ? 1 : 0.5) : 0,
                  zIndex: isCenter ? 30 : isAdjacent ? 20 : 10,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={cn(
                  'absolute cursor-pointer rounded-2xl overflow-hidden border-2 shadow-xl',
                  isCenter ? cn(pa.border, pa.glow) : 'border-border',
                )}
                style={{
                  width: '320px',
                  height: '240px',
                  pointerEvents: isVisible ? 'auto' : 'none',
                }}
              >
                <img
                  src={p.image}
                  alt={p.label}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"
                />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{p.emoji}</span>
                    <span className="text-sm sm:text-base font-bold text-foreground">
                      {p.label}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Card descriptive */}
      <div className="relative max-w-5xl mx-auto">
        <Card className="glass-card overflow-hidden border-border">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={profile.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 30 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="p-6 sm:p-10 md:p-12 flex flex-col gap-5"
            >
              <Badge
                variant="outline"
                className={cn(
                  'self-start tracking-widest gap-2',
                  a.bgSoft,
                  a.text,
                  'border-current/40',
                )}
              >
                <span>{profile.emoji}</span>
                {profile.tag}
              </Badge>

              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight whitespace-pre-line">
                {profile.title}
              </h3>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                {profile.subtitle}
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {profile.points.map((point, i) => (
                  <motion.li
                    key={point}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 border',
                        a.bgSoft,
                        a.border,
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', a.dot)} />
                    </span>
                    <span className="text-sm text-foreground/85">{point}</span>
                  </motion.li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={a.button}
                className="self-start mt-4"
              >
                <a href="/signup">Commencer gratuitement →</a>
              </Button>
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="glass"
            size="icon"
            onClick={prev}
            aria-label="Précédent"
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            {profiles.map((p, i) => {
              const pa = accentClasses[p.accent];
              const isActive = active === i;
              return (
                <button
                  key={p.id}
                  onClick={() => goTo(i)}
                  aria-label={`Aller à ${p.label}`}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    isActive ? cn('w-6', pa.dot) : 'w-2 bg-muted',
                  )}
                />
              );
            })}
          </div>

          <Button
            variant="glass"
            size="icon"
            onClick={next}
            aria-label="Suivant"
            className="rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ForWhoSection;
