import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Coins,
  Check,
  Clock,
  FileText,
  Calendar,
  Download,
  Target,
  Plus,
  TrendingUp,
  Wallet,
  ArrowUp,
  ArrowDown,
  Bell,
  LineChart,
  type LucideIcon,
} from "lucide-react";

const LIME = "#7CFF3A";
const TEXT = "#EAFBEA";

/* --------------------------------- Hooks --------------------------------- */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return isMobile;
}

/* ------------------------------ Sub components --------------------------- */

type CardData = {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClass?: string;
  extra?: ReactNode;
};

const positions = [
  { top: "8%", left: "-6%", rotate: -4 },
  { top: "58%", left: "-10%", rotate: 3 },
  { top: "8%", right: "-6%", rotate: 4 },
  { top: "58%", right: "-10%", rotate: -3 },
] as const;

function FloatingCard({
  data,
  index,
  isMobile,
}: {
  data: CardData;
  index: number;
  isMobile: boolean;
}) {
  const Icon = data.icon;
  const pos = positions[index];
  const duration = 5 + (index % 3);
  const delay = index * 0.4;

  const style: React.CSSProperties = isMobile
    ? { position: "relative", transform: "none" }
    : {
        position: "absolute",
        top: pos.top,
        left: (pos as any).left,
        right: (pos as any).right,
        transform: `rotate(${pos.rotate}deg)`,
      };

  return (
    <motion.div
      style={style}
      animate={isMobile ? undefined : { y: [0, -10, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
      className="w-[200px] rounded-2xl border backdrop-blur-md p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "rgba(13,21,18,0.9)",
          border: `1px solid ${LIME}26`,
          borderRadius: "1rem",
        }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${LIME}1A`, border: `1px solid ${LIME}33` }}
        >
          <Icon size={16} color={LIME} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-white/50">
            {data.label}
          </div>
          <div className={`text-sm font-bold mt-0.5 ${data.valueClass ?? ""}`} style={data.valueClass ? undefined : { color: TEXT }}>
            {data.value}
          </div>
          {data.extra}
        </div>
      </div>
    </motion.div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="relative shrink-0"
      style={{ width: 280, height: 570 }}
    >
      {/* Titanium frame */}
      <div
        className="absolute inset-0 rounded-[48px] p-[3px]"
        style={{
          background:
            "linear-gradient(145deg, #c8ccd1 0%, #6b7076 25%, #2a2d31 55%, #8a8f95 80%, #d8dce0 100%)",
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="relative w-full h-full rounded-[45px] overflow-hidden"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, #0d1512 0%, #05070A 60%, #05070A 100%)",
          }}
        >
          {/* Dynamic Island */}
          <div
            className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[95px] h-[28px] rounded-full z-20"
            style={{ background: "#000" }}
          />
          {/* Screen content */}
          <div className="absolute inset-0 pt-14 px-5 pb-6 flex flex-col">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stage({
  cards,
  isMobile,
  children,
}: {
  cards: CardData[];
  isMobile: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full flex justify-center items-center py-10">
      {/* Radar rings */}
      {!isMobile && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[560, 720, 900].map((s) => (
            <div
              key={s}
              className="absolute rounded-full"
              style={{
                width: s,
                height: s,
                border: `1px solid ${LIME}12`,
              }}
            />
          ))}
        </div>
      )}

      {isMobile ? (
        <div className="flex flex-col items-center gap-6 w-full">
          {children}
          <div className="flex flex-col items-center gap-3">
            {cards.map((c, i) => (
              <FloatingCard key={i} data={c} index={i} isMobile />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative" style={{ width: 720 }}>
          <div className="flex justify-center">{children}</div>
          {cards.map((c, i) => (
            <FloatingCard key={i} data={c} index={i} isMobile={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  gradientPart,
  subtitle,
}: {
  title: string;
  gradientPart: string;
  subtitle: string;
}) {
  const [before, after] = title.split(gradientPart);
  return (
    <div className="text-center max-w-2xl mx-auto mb-4 px-4">
      <div
        className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
        style={{
          background: `${LIME}1A`,
          border: `1px solid ${LIME}40`,
          color: LIME,
        }}
      >
        Fonctionnalité
      </div>
      <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: TEXT }}>
        {before}
        <span
          style={{
            background: `linear-gradient(90deg, ${LIME} 0%, #37B24D 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {gradientPart}
        </span>
        {after}
      </h2>
      <p className="mt-4 text-white/60 text-base md:text-lg">{subtitle}</p>
    </div>
  );
}

function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-white/90 text-sm font-semibold mb-3 text-center">
      {children}
    </div>
  );
}

function DetectedRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5">
      <span className="text-white/70">{label}</span>
      <span className={`font-semibold ${valueClass ?? "text-white"}`}>{value}</span>
    </div>
  );
}

/* ------------------------------- Screens -------------------------------- */

function VoiceScreen() {
  return (
    <>
      <ScreenTitle>Saisie vocale</ScreenTitle>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ scale: [1, 1.08, 1], boxShadow: [`0 0 0 0 ${LIME}66`, `0 0 0 20px ${LIME}00`, `0 0 0 0 ${LIME}00`] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: LIME, boxShadow: `0 0 40px ${LIME}80` }}
        >
          <Mic size={32} color="#05070A" />
        </motion.div>
        <div className="flex items-end gap-1 h-10">
          {[0.4, 0.8, 0.5, 1, 0.6, 0.9, 0.3, 0.7, 0.5, 0.9, 0.4].map((h, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{ background: LIME, height: `${h * 100}%` }}
              animate={{ scaleY: [h, 1, h] }}
              transition={{ duration: 0.8 + i * 0.05, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>
        <p className="text-[11px] italic text-white/50 text-center px-2">
          « J'ai dépensé 3 000 au marché et payé 15 000 de taxi »
        </p>
      </div>
      <div
        className="rounded-xl p-3 mt-2"
        style={{ background: "rgba(124,255,58,0.05)", border: `1px solid ${LIME}26` }}
      >
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Détecté</div>
        <DetectedRow label="Marché · Alimentation" value="-3 000 F" valueClass="text-red-400" />
        <DetectedRow label="Taxi · Transport" value="-15 000 F" valueClass="text-red-400" />
      </div>
    </>
  );
}

function ScanScreen() {
  return (
    <>
      <ScreenTitle>Scan de facture</ScreenTitle>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-full aspect-[3/4] max-h-[240px] rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
          {/* Corners */}
          {[
            { top: 0, left: 0, borderTop: `2px solid ${LIME}`, borderLeft: `2px solid ${LIME}` },
            { top: 0, right: 0, borderTop: `2px solid ${LIME}`, borderRight: `2px solid ${LIME}` },
            { bottom: 0, left: 0, borderBottom: `2px solid ${LIME}`, borderLeft: `2px solid ${LIME}` },
            { bottom: 0, right: 0, borderBottom: `2px solid ${LIME}`, borderRight: `2px solid ${LIME}` },
          ].map((s, i) => (
            <div key={i} className="absolute w-5 h-5" style={s as React.CSSProperties} />
          ))}
          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-[2px]"
            style={{ background: LIME, boxShadow: `0 0 12px ${LIME}` }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <p className="text-[11px] italic text-white/50 text-center mt-2">
          Cadrez le reçu, l'IA fait le reste
        </p>
      </div>
      <div
        className="rounded-xl p-3 mt-2"
        style={{ background: "rgba(124,255,58,0.05)", border: `1px solid ${LIME}26` }}
      >
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Détecté</div>
        <DetectedRow label="Commerçant" value="Burger King" />
        <DetectedRow label="Montant" value="-14 500 F" valueClass="text-red-400" />
        <DetectedRow label="Catégorie" value="Alimentation" valueClass="text-emerald-400" />
      </div>
    </>
  );
}

function GoalRow({ name, current, target, pct }: { name: string; current: string; target: string; pct: number }) {
  return (
    <div
      className="rounded-xl p-3 mb-2"
      style={{ background: "rgba(124,255,58,0.05)", border: `1px solid ${LIME}1F` }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-white/90">{name}</span>
        <span className="text-xs font-bold" style={{ color: LIME }}>{pct}%</span>
      </div>
      <div className="text-[10px] text-white/50 mb-1.5">{current} / {target} FCFA</div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${LIME}, #37B24D)` }} />
      </div>
    </div>
  );
}

function SavingsScreen() {
  return (
    <>
      <ScreenTitle>Mes objectifs</ScreenTitle>
      <div className="flex-1 flex flex-col justify-center">
        <GoalRow name="Voyage Dakar" current="320 000" target="500 000" pct={64} />
        <GoalRow name="Fonds d'urgence" current="150 000" target="300 000" pct={50} />
        <GoalRow name="Nouveau téléphone" current="80 000" target="250 000" pct={32} />
      </div>
    </>
  );
}

function DebtRow({ initial, name, date, amount }: { initial: string; name: string; date: string; amount: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${LIME}1A`, color: LIME, border: `1px solid ${LIME}33` }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white/90 truncate">{name}</div>
        <div className="text-[10px] text-white/40">{date}</div>
      </div>
      <div className="text-xs font-bold text-emerald-400">{amount}</div>
    </div>
  );
}

function DebtScreen() {
  return (
    <>
      <ScreenTitle>Dettes</ScreenTitle>
      <div className="flex gap-2 mb-3">
        <div
          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center"
          style={{ background: `${LIME}1A`, color: LIME, border: `1px solid ${LIME}40` }}
        >
          On me doit
        </div>
        <div className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center text-white/50" style={{ background: "rgba(255,255,255,0.03)" }}>
          Je dois
        </div>
      </div>
      <div className="flex-1">
        <DebtRow initial="K" name="Koffi" date="Prêt du 12/06" amount="+45 000 F" />
        <DebtRow initial="A" name="Aya" date="Prêt du 28/06" amount="+25 000 F" />
        <DebtRow initial="M" name="Moussa" date="Prêt du 02/07" amount="+15 000 F" />
      </div>
    </>
  );
}

/* -------------------------------- Cards --------------------------------- */

const voiceCards: CardData[] = [
  { icon: Mic, label: "Multi-transactions", value: "2 détectées" },
  { icon: Coins, label: "Devises auto", value: "FCFA · € · $" },
  { icon: Check, label: "Catégorie auto", value: "Détectée" },
  { icon: Clock, label: "Gain de temps", value: "2 s" },
];

const scanCards: CardData[] = [
  { icon: FileText, label: "Montant lu", value: "-14 500 F", valueClass: "text-red-400" },
  { icon: Calendar, label: "Date détectée", value: "30/06/2026" },
  { icon: Check, label: "Catégorie auto", value: "Alimentation" },
  { icon: Download, label: "Reçu archivé", value: "Mes reçus" },
];

const savingsCards: CardData[] = [
  {
    icon: Target,
    label: "Objectif",
    value: "Voyage Dakar",
    extra: (
      <div className="h-1 rounded-full overflow-hidden mt-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full" style={{ width: "64%", background: LIME }} />
      </div>
    ),
  },
  { icon: Plus, label: "Versement", value: "+25 000 F", valueClass: "text-emerald-400" },
  { icon: TrendingUp, label: "Progression", value: "64%" },
  { icon: Wallet, label: "Reste à épargner", value: "180 000 F" },
];

const debtCards: CardData[] = [
  { icon: ArrowUp, label: "On me doit", value: "+85 000 F", valueClass: "text-emerald-400" },
  { icon: ArrowDown, label: "Je dois", value: "-30 000 F", valueClass: "text-red-400" },
  { icon: Bell, label: "Rappels auto", value: "Actifs" },
  { icon: LineChart, label: "Solde net", value: "+55 000 F", valueClass: "text-emerald-400" },
];

/* -------------------------------- Root ---------------------------------- */

export default function FeatureShowcase() {
  const isMobile = useIsMobile();

  const blocks = [
    {
      title: "Parlez, Mon Jeton note tout.",
      gradient: "note tout",
      subtitle:
        "Dites « J'ai dépensé 3 000 au marché et payé 15 000 de taxi » — l'IA détecte chaque transaction, le montant et la catégorie.",
      screen: <VoiceScreen />,
      cards: voiceCards,
    },
    {
      title: "Photographiez un reçu, c'est enregistré.",
      gradient: "c'est enregistré",
      subtitle: "Le scan IA lit le montant, la date et le commerçant, puis crée la transaction toute seule.",
      screen: <ScanScreen />,
      cards: scanCards,
    },
    {
      title: "Fixez un objectif, atteignez-le.",
      gradient: "atteignez-le",
      subtitle: "Créez un objectif d'épargne, versez à votre rythme et suivez votre progression jusqu'au but.",
      screen: <SavingsScreen />,
      cards: savingsCards,
    },
    {
      title: "Qui vous doit quoi, enfin clair.",
      gradient: "enfin clair",
      subtitle:
        "Suivez ce qu'on vous doit et ce que vous devez, avec rappels automatiques. Fini les dettes oubliées.",
      screen: <DebtScreen />,
      cards: debtCards,
    },
  ];

  return (
    <section id="demo" className="relative" style={{ background: "#05070A", color: TEXT }}>
      {blocks.map((b, i) => (
        <div key={i} className="py-20 md:py-28">
          <SectionHeader title={b.title} gradientPart={b.gradient} subtitle={b.subtitle} />
          <Stage cards={b.cards} isMobile={isMobile}>
            <Phone>{b.screen}</Phone>
          </Stage>
        </div>
      ))}
    </section>
  );
}
