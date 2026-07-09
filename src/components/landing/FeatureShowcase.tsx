import { motion } from "framer-motion";
import {
  Mic,
  Check,
  FileText,
  Download,
  Target,
  Wallet,
  ArrowUp,
  Bell,
  ScanLine,
} from "lucide-react";
import MarkerText from "./MarkerText";

const LIME = "#7CFF3A";
const TEXT = "#EAFBEA";
const BG = "#04060A";

/* ---------- Shared phone frame ---------- */
const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    className="relative mx-auto"
    style={{
      width: "min(280px, 72vw)",
      aspectRatio: "9 / 19",
      borderRadius: 46,
      padding: 8,
      background:
        "linear-gradient(160deg, #3a3d42 0%, #17191c 40%, #2a2d31 70%, #101215 100%)",
      boxShadow:
        "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.05)",
    }}
  >
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ borderRadius: 38, background: BG, color: TEXT }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: 10, width: 90, height: 26, borderRadius: 20, background: "#000" }}
      />
      <div className="w-full h-full pt-10 px-3 pb-3 flex flex-col gap-2 overflow-hidden">
        {children}
      </div>
    </div>
  </motion.div>
);

/* ---------- Floating card ---------- */
interface FloatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress?: number;
  rotate: number;
  delay: number;
  className: string;
  valueColor?: string;
}
const FloatCard = ({
  icon,
  label,
  value,
  progress,
  rotate,
  delay,
  className,
  valueColor,
}: FloatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: [20, -8, 0, -8, 0] }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{
      duration: 5 + delay,
      repeat: Infinity,
      repeatType: "loop",
      ease: "easeInOut",
      delay,
    }}
    className={`absolute ${className}`}
    style={{
      transform: `rotate(${rotate}deg)`,
      background: "rgba(13,21,18,0.92)",
      border: "1px solid rgba(124,255,58,0.16)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: 16,
      padding: "10px 12px",
      minWidth: 140,
      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.6)",
      color: TEXT,
      zIndex: 5,
    }}
  >
    <div className="flex items-center gap-2 mb-1">
      <div className="shrink-0">{icon}</div>
      <div className="text-[10px] text-white/55 leading-tight">{label}</div>
    </div>
    <div className="text-xs font-bold leading-tight" style={{ color: valueColor || TEXT }}>
      {value}
    </div>
    {typeof progress === "number" && (
      <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: LIME }} />
      </div>
    )}
  </motion.div>
);

/* ---------- Screen chip helper ---------- */
const Chip = ({ children, tone = "lime" }: { children: React.ReactNode; tone?: "lime" | "amber" }) => (
  <span
    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
    style={{
      background: tone === "lime" ? "rgba(124,255,58,0.14)" : "rgba(245,179,1,0.15)",
      color: tone === "lime" ? LIME : "#F5B301",
      border: `1px solid ${tone === "lime" ? "rgba(124,255,58,0.25)" : "rgba(245,179,1,0.3)"}`,
    }}
  >
    {children}
  </span>
);

const ScreenHeader = ({ title, chip, chipTone }: { title: string; chip: string; chipTone?: "lime" | "amber" }) => (
  <div className="flex items-center justify-between">
    <div className="text-xs font-bold">{title}</div>
    <Chip tone={chipTone}>{chip}</Chip>
  </div>
);

/* ---------- Screens ---------- */
const VoiceScreen = () => (
  <>
    <ScreenHeader title="Saisie vocale" chip="IA" />
    <div className="flex flex-col items-center justify-center gap-3 py-3">
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-full flex items-center justify-center"
        style={{
          width: 68,
          height: 68,
          background: LIME,
          boxShadow: "0 0 40px rgba(124,255,58,0.6), 0 0 80px rgba(124,255,58,0.3)",
        }}
      >
        <Mic size={28} color="#04060A" />
      </motion.div>
      <div className="flex items-end gap-1 h-6">
        {[30, 60, 90, 50, 80, 40, 70, 55, 85, 35].map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] }}
            transition={{ duration: 0.8 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
            className="w-1 rounded-full"
            style={{ background: LIME }}
          />
        ))}
      </div>
    </div>
    <div className="text-[9px] italic text-white/50 text-center px-1 leading-snug">
      « J'ai dépensé 3 000 au marché et payé 15 000 de taxi »
    </div>
    <div
      className="rounded-xl p-2 flex flex-col gap-1.5"
      style={{ background: "rgba(124,255,58,0.06)", border: "1px solid rgba(124,255,58,0.2)" }}
    >
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/70">Marché · Alimentation</span>
        <span className="font-bold text-red-400">-3 000 F</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/70">Taxi · Transport</span>
        <span className="font-bold text-red-400">-15 000 F</span>
      </div>
    </div>
    <button
      className="mt-auto py-2 rounded-xl text-[11px] font-bold"
      style={{ background: LIME, color: "#04060A" }}
    >
      Confirmer les 2
    </button>
  </>
);

const ScanScreen = () => (
  <>
    <ScreenHeader title="Scan de facture" chip="Prêt" />
    <div
      className="relative rounded-xl overflow-hidden flex-1 min-h-[130px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Corner viewfinder */}
      {[
        { top: 6, left: 6, br: "0", bl: "0", tr: "0" },
        { top: 6, right: 6, bl: "0", br: "0", tl: "0" },
        { bottom: 6, left: 6, tr: "0", tl: "0", br: "0" },
        { bottom: 6, right: 6, tl: "0", tr: "0", bl: "0" },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: 18,
            height: 18,
            borderTop: i < 2 ? `2px solid ${LIME}` : undefined,
            borderBottom: i >= 2 ? `2px solid ${LIME}` : undefined,
            borderLeft: i % 2 === 0 ? `2px solid ${LIME}` : undefined,
            borderRight: i % 2 === 1 ? `2px solid ${LIME}` : undefined,
            ...(s as React.CSSProperties),
          }}
        />
      ))}
      {/* Scan line */}
      <motion.div
        animate={{ top: ["8%", "88%", "8%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-2 right-2 h-[2px]"
        style={{
          background: LIME,
          boxShadow: `0 0 12px ${LIME}, 0 0 24px rgba(124,255,58,0.6)`,
        }}
      />
      <ScanLine size={40} color="rgba(124,255,58,0.25)" className="absolute inset-0 m-auto" />
    </div>
    <div
      className="rounded-xl p-2 flex flex-col gap-1"
      style={{ background: "rgba(124,255,58,0.06)", border: "1px solid rgba(124,255,58,0.2)" }}
    >
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/60">Commerçant</span>
        <span className="font-bold">Burger King</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/60">Montant</span>
        <span className="font-bold text-red-400">-14 500 F</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/60">Catégorie</span>
        <span className="font-bold" style={{ color: LIME }}>Alimentation</span>
      </div>
    </div>
    <button className="py-2 rounded-xl text-[11px] font-bold" style={{ background: LIME, color: "#04060A" }}>
      Enregistrer
    </button>
  </>
);

const SavingsScreen = () => {
  const goals = [
    { name: "Voyage Dakar", cur: "320 000", tot: "500 000", pct: 64 },
    { name: "Fonds d'urgence", cur: "150 000", tot: "300 000", pct: 50 },
    { name: "Nouveau tel", cur: "80 000", tot: "250 000", pct: 32 },
  ];
  return (
    <>
      <ScreenHeader title="Mes objectifs" chip="3 actifs" />
      <div
        className="rounded-xl p-3"
        style={{
          background: "linear-gradient(160deg, rgba(124,255,58,0.18) 0%, rgba(124,255,58,0.04) 100%)",
          border: "1px solid rgba(124,255,58,0.28)",
        }}
      >
        <div className="text-[10px] text-white/60">Épargne totale</div>
        <div className="text-lg font-extrabold">
          550 000 <span className="text-[10px] text-white/50">FCFA</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {goals.map((g) => (
          <div
            key={g.name}
            className="rounded-xl p-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold">{g.name}</span>
              <span className="font-bold" style={{ color: LIME }}>{g.pct}%</span>
            </div>
            <div className="text-[9px] text-white/50">
              {g.cur} / {g.tot} FCFA
            </div>
            <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: LIME }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const DebtsScreen = () => {
  const items = [
    { init: "K", name: "Koffi", date: "12/06", amount: "+45 000" },
    { init: "A", name: "Aya", date: "28/06", amount: "+25 000" },
    { init: "M", name: "Moussa", date: "02/07", amount: "+15 000" },
  ];
  return (
    <>
      <ScreenHeader title="Dettes" chip="Net +55 000" />
      <div className="flex gap-1.5 mt-1">
        <div
          className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold"
          style={{ background: "rgba(124,255,58,0.15)", color: LIME, border: `1px solid ${LIME}` }}
        >
          On me doit
        </div>
        <div
          className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-semibold text-white/60"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          Je dois
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mt-1">
        {items.map((it) => (
          <div
            key={it.name}
            className="flex items-center gap-2 rounded-xl p-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: "rgba(124,255,58,0.15)", color: LIME }}
            >
              {it.init}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold truncate">{it.name}</div>
              <div className="text-[9px] text-white/50">Prêté le {it.date}</div>
            </div>
            <div className="text-[11px] font-bold" style={{ color: LIME }}>{it.amount}</div>
          </div>
        ))}
      </div>
      <button className="mt-auto py-2 rounded-xl text-[11px] font-bold" style={{ background: LIME, color: "#04060A" }}>
        Relancer Koffi
      </button>
    </>
  );
};

/* ---------- Section shell ---------- */
interface FeatureSectionProps {
  badge: string;
  titleBefore: string;
  markerWord: string;
  markerVariant: "lime" | "dark";
  titleAfter?: string;
  paragraph: string;
  points: string[];
  reverse: boolean;
  phone: React.ReactNode;
  cards: [React.ReactNode, React.ReactNode];
}
const FeatureSection = ({
  badge,
  titleBefore,
  markerWord,
  markerVariant,
  titleAfter,
  paragraph,
  points,
  reverse,
  phone,
  cards,
}: FeatureSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 items-center py-16 md:py-24">
    {/* Text */}
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={reverse ? "md:order-2" : "md:order-1"}
    >
      <span
        className="inline-block text-[11px] font-semibold px-3 py-1 rounded-full mb-4"
        style={{
          background: "rgba(124,255,58,0.12)",
          color: LIME,
          border: "1px solid rgba(124,255,58,0.25)",
        }}
      >
        {badge}
      </span>
      <h2
        className="font-display uppercase font-extrabold"
        style={{
          fontSize: "clamp(30px, 5.5vw, 52px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: TEXT,
        }}
      >
        {titleBefore}{" "}
        <MarkerText variant={markerVariant}>{markerWord}</MarkerText>
        {titleAfter}
      </h2>
      <p className="mt-5 text-base md:text-lg max-w-lg" style={{ color: "rgba(234,251,234,0.7)" }}>
        {paragraph}
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(124,255,58,0.15)", border: `1px solid ${LIME}` }}
            >
              <Check size={13} color={LIME} strokeWidth={3} />
            </span>
            <span className="text-sm" style={{ color: TEXT }}>{p}</span>
          </li>
        ))}
      </ul>
    </motion.div>

    {/* Phone */}
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      className={`relative mx-auto w-full ${reverse ? "md:order-1" : "md:order-2"}`}
      style={{ minHeight: 520 }}
    >
      <PhoneFrame>{phone}</PhoneFrame>
      {cards[0]}
      {cards[1]}
    </motion.div>
  </div>
);

/* ---------- FeatureShowcase ---------- */
const FeatureShowcase = () => {
  return (
    <section id="demo" className="relative" style={{ background: BG, color: TEXT }}>
      <div className="container mx-auto px-4">
        {/* 1 — Voice */}
        <FeatureSection
          badge="Fonctionnalité"
          titleBefore="Parlez, on"
          markerWord="note tout"
          markerVariant="lime"
          paragraph={`Dites "J'ai dépensé 3 000 au marché et payé 15 000 de taxi" — l'IA détecte chaque transaction, le montant et la catégorie.`}
          points={[
            "Plusieurs transactions en une phrase",
            "Devises détectées (FCFA, €, $)",
            "Catégorie assignée automatiquement",
          ]}
          reverse={false}
          phone={<VoiceScreen />}
          cards={[
            <FloatCard
              key="v1"
              icon={<Mic size={14} color={LIME} />}
              label="Multi-transactions"
              value="2 détectées"
              rotate={-5}
              delay={0.1}
              className="top-4 -left-2 md:-left-8"
            />,
            <FloatCard
              key="v2"
              icon={<Check size={14} color={LIME} />}
              label="Catégorie auto"
              value="Alimentation"
              rotate={5}
              delay={0.4}
              className="bottom-8 -right-2 md:-right-6"
            />,
          ]}
        />

        {/* 2 — Scan */}
        <FeatureSection
          badge="Fonctionnalité"
          titleBefore="Photographiez, c'est"
          markerWord="enregistré"
          markerVariant="lime"
          paragraph="Le scan IA lit le montant, la date et le commerçant sur le reçu, puis crée la transaction toute seule."
          points={[
            "Montant & date lus automatiquement",
            "Commerçant reconnu",
            "Reçu archivé et retrouvable",
          ]}
          reverse={true}
          phone={<ScanScreen />}
          cards={[
            <FloatCard
              key="s1"
              icon={<FileText size={14} color={LIME} />}
              label="Montant lu"
              value="-14 500 F"
              valueColor="#FF6B6B"
              rotate={-6}
              delay={0.15}
              className="top-6 -left-2 md:-left-8"
            />,
            <FloatCard
              key="s2"
              icon={<Download size={14} color={LIME} />}
              label="Reçu archivé"
              value="Mes reçus"
              rotate={5}
              delay={0.45}
              className="bottom-6 -right-2 md:-right-6"
            />,
          ]}
        />

        {/* 3 — Savings */}
        <FeatureSection
          badge="Fonctionnalité"
          titleBefore="Fixez un objectif,"
          markerWord="atteignez-le"
          markerVariant="dark"
          paragraph="Créez un objectif d'épargne, versez à votre rythme et suivez votre progression jusqu'au but."
          points={[
            "Objectifs illimités",
            "Progression en temps réel",
            "Versements à votre rythme",
          ]}
          reverse={false}
          phone={<SavingsScreen />}
          cards={[
            <FloatCard
              key="e1"
              icon={<Target size={14} color={LIME} />}
              label="Objectif Dakar"
              value="64%"
              progress={64}
              rotate={-5}
              delay={0.1}
              className="top-4 -left-2 md:-left-8"
            />,
            <FloatCard
              key="e2"
              icon={<Wallet size={14} color={LIME} />}
              label="Reste"
              value="180 000 F"
              rotate={6}
              delay={0.4}
              className="bottom-8 -right-2 md:-right-6"
            />,
          ]}
        />

        {/* 4 — Debts */}
        <FeatureSection
          badge="Fonctionnalité"
          titleBefore="Qui vous doit quoi,"
          markerWord="enfin clair"
          markerVariant="lime"
          paragraph="Suivez ce qu'on vous doit et ce que vous devez, avec rappels automatiques. Fini les dettes oubliées."
          points={[
            "Vues « On me doit » / « Je dois »",
            "Rappels automatiques",
            "Solde net calculé",
          ]}
          reverse={true}
          phone={<DebtsScreen />}
          cards={[
            <FloatCard
              key="d1"
              icon={<ArrowUp size={14} color={LIME} />}
              label="On me doit"
              value="+85 000 F"
              valueColor={LIME}
              rotate={-6}
              delay={0.1}
              className="top-6 -left-2 md:-left-8"
            />,
            <FloatCard
              key="d2"
              icon={<Bell size={14} color="#F5B301" />}
              label="Rappel auto"
              value="dans 3 jours"
              rotate={5}
              delay={0.4}
              className="bottom-6 -right-2 md:-right-6"
            />,
          ]}
        />
      </div>
    </section>
  );
};

export default FeatureShowcase;
