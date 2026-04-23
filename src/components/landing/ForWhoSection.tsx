import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const profiles = [
  {
    id: 0,
    emoji: "💼",
    label: "Chefs d'entreprise",
    tag: "GESTION PRO",
    title: "Gardez le contrôle\nde chaque franc CFA.",
    subtitle:
      "Vous gérez plusieurs comptes mobile money pour votre activité ? " +
      "Mon Jeton centralise Wave, Orange et MTN en une seule vue. " +
      "Suivez vos entrées, vos sorties et vos caisses communes " +
      "depuis votre téléphone.",
    points: [
      "Multi-portefeuilles Wave, Orange, MTN, Moov",
      "Caisse commune pour vos équipes",
      "Scan des reçus fournisseurs en 5 secondes",
      "Rapports mensuels générés par l'IA",
    ],
    accent: "#7EC845",
  },
  {
    id: 1,
    emoji: "👩‍👧",
    label: "Les mamans",
    tag: "BUDGET FAMILLE",
    title: "Sachez toujours\noù va l'argent du foyer.",
    subtitle:
      "Entre les dépenses du marché, les frais scolaires et les " +
      "cotisations de tontine, il est facile de perdre le fil. " +
      "Mon Jeton vous aide à tout suivre simplement, même à la voix.",
    points: [
      "Saisie vocale : dites vos dépenses sans taper",
      "Budget mensuel par catégorie avec alertes",
      "Gestion de tontine avec vos amies",
      "Mode discret pour préserver la confidentialité",
    ],
    accent: "#00D2B4",
  },
  {
    id: 2,
    emoji: "🎯",
    label: "Les jeunes ambitieux",
    tag: "DISCIPLINE FINANCIÈRE",
    title: "Construisez votre\navenir financier dès aujourd'hui.",
    subtitle:
      "Commencer à gérer son argent tôt, c'est la meilleure décision. " +
      "Mon Jeton vous guide avec un score financier hebdomadaire, " +
      "des objectifs d'épargne et un assistant IA qui vous coache " +
      "en franc CFA.",
    points: [
      "Score financier IA chaque semaine",
      "Objectifs d'épargne avec calcul quotidien",
      "Assistant Claude pour vos questions finances",
      "Budgets intelligents par catégorie",
    ],
    accent: "#FFB347",
  },
];

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
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const profile = profiles[active];

  return (
    <section
      id="for-who"
      className="relative py-16 sm:py-24 px-4 sm:px-5 overflow-hidden"
      style={{ scrollMarginTop: 80 }}
    >
      {/* Glow dynamique */}
      <motion.div
        key={`glow-${profile.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1 }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${profile.accent}30 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Header */}
      <div className="relative max-w-6xl mx-auto text-center mb-10 sm:mb-14">
        <span
          className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4"
          style={{
            background: 'rgba(124,255,58,0.08)',
            color: '#7CFF3A',
            border: '1px solid rgba(124,255,58,0.25)',
          }}
        >
          POUR QUI ?
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#EAFBEA] leading-tight">
          Mon Jeton s'adapte
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(135deg, #7CFF3A 0%, #00D2B4 100%)',
            }}
          >
            à votre vie.
          </span>
        </h2>
      </div>

      {/* Tabs */}
      <div className="relative max-w-4xl mx-auto flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
        {profiles.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goTo(i)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300"
            style={{
              background:
                active === i ? p.accent : 'rgba(255,255,255,0.05)',
              color: active === i ? '#05070A' : '#8892A4',
              border: `1px solid ${
                active === i ? p.accent : 'rgba(255,255,255,0.08)'
              }`,
              boxShadow:
                active === i ? `0 0 20px ${p.accent}50` : 'none',
            }}
          >
            <span>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="relative max-w-6xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(124,255,58,0.02)] backdrop-blur-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={profile.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 p-6 sm:p-10 md:p-14"
            >
              {/* Texte */}
              <div className="flex flex-col gap-5">
                <span
                  className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest"
                  style={{
                    background: `${profile.accent}15`,
                    color: profile.accent,
                    border: `1px solid ${profile.accent}40`,
                  }}
                >
                  <span>{profile.emoji}</span>
                  {profile.tag}
                </span>

                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#EAFBEA] leading-tight whitespace-pre-line">
                  {profile.title}
                </h3>

                <p className="text-sm sm:text-base text-[rgba(234,251,234,0.7)] leading-relaxed">
                  {profile.subtitle}
                </p>

                <ul className="flex flex-col gap-3 mt-2">
                  {profile.points.map((point, i) => (
                    <motion.li
                      key={point}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{
                          background: `${profile.accent}25`,
                          border: `1px solid ${profile.accent}60`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: profile.accent }}
                        />
                      </span>
                      <span className="text-sm text-[rgba(234,251,234,0.85)]">
                        {point}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <a
                  href="/signup"
                  className="inline-flex items-center justify-center self-start mt-4 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                  style={{
                    background: profile.accent,
                    color: '#05070A',
                    boxShadow: `0 0 24px ${profile.accent}60`,
                  }}
                >
                  Commencer gratuitement →
                </a>
              </div>

              {/* Illustration */}
              <div className="relative min-h-[280px] sm:min-h-[360px] flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${profile.accent}30 0%, transparent 65%)`,
                    filter: 'blur(40px)',
                  }}
                />

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative text-[120px] sm:text-[180px] leading-none select-none"
                  style={{
                    filter: `drop-shadow(0 10px 30px ${profile.accent}60)`,
                  }}
                >
                  {profile.emoji}
                </motion.div>

                {profile.points.slice(0, 2).map((point, i) => (
                  <motion.div
                    key={point}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: [0, i === 0 ? -8 : 8, 0],
                    }}
                    transition={{
                      opacity: { delay: 0.3 + i * 0.2 },
                      y: {
                        duration: 4 + i,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      },
                    }}
                    className="absolute px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold backdrop-blur-md"
                    style={{
                      background: 'rgba(5,7,10,0.7)',
                      border: `1px solid ${profile.accent}40`,
                      color: profile.accent,
                      top: i === 0 ? '15%' : 'auto',
                      bottom: i === 1 ? '15%' : 'auto',
                      left: i === 0 ? '5%' : 'auto',
                      right: i === 1 ? '5%' : 'auto',
                    }}
                  >
                    ✓ {point.split(':')[0]}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={prev}
            aria-label="Précédent"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.1)] hover:border-[rgba(124,255,58,0.3)] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {profiles.map((p, i) => (
              <button
                key={p.id}
                onClick={() => goTo(i)}
                aria-label={`Aller à ${p.label}`}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: active === i ? 24 : 8,
                  height: 8,
                  background:
                    active === i ? p.accent : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Suivant"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#EAFBEA] hover:bg-[rgba(124,255,58,0.1)] hover:border-[rgba(124,255,58,0.3)] transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ForWhoSection;
