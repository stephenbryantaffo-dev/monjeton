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
import { useLandingT } from "@/hooks/useLandingT";
import type { LandingStrings } from "@/lib/landingI18n";

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
const VoiceScreen = ({ lt }: { lt: LandingStrings }) => (
  <>
    <ScreenHeader title={lt.voice_header} chip={lt.voice_ai} />
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
      {lt.voice_quote}
    </div>
    <div
      className="rounded-xl p-2 flex flex-col gap-1.5"
      style={{ background: "rgba(124,255,58,0.06)", border: "1px solid rgba(124,255,58,0.2)" }}
    >
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/70">{lt.voice_market}</span>
        <span className="font-bold text-red-400">-3 000 F</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/70">{lt.voice_taxi}</span>
        <span className="font-bold text-red-400">-15 000 F</span>
      </div>
    </div>
    <button
      className="mt-auto py-2 rounded-xl text-[11px] font-bold"
      style={{ background: LIME, color: "#04060A" }}
    >
      {lt.voice_confirm}
    </button>
  </>
);

const ScanScreen = ({ lt }: { lt: LandingStrings }) => (
  <>
    <ScreenHeader title={lt.scan_header} chip={lt.scan_ready} />
    <div
      className="relative rounded-xl overflow-hidden flex-1 min-h-[130px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {[
        { top: 6, left: 6 },
        { top: 6, right: 6 },
        { bottom: 6, left: 6 },
        { bottom: 6, right: 6 },
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
        <span className="text-white/60">{lt.scan_merchant}</span>
        <span className="font-bold">Burger King</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/60">{lt.scan_amount}</span>
        <span className="font-bold text-red-400">-14 500 F</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/60">{lt.scan_category}</span>
        <span className="font-bold" style={{ color: LIME }}>{lt.scan_food}</span>
      </div>
    </div>
    <button className="py-2 rounded-xl text-[11px] font-bold" style={{ background: LIME, color: "#04060A" }}>
      {lt.scan_save}
    </button>
  </>
);

const SavingsScreen = ({ lt }: { lt: LandingStrings }) => {
  const goals = [
    { name: lt.savings_goal_dakar, cur: "320 000", tot: "500 000", pct: 64 },
    { name: lt.savings_goal_emergency, cur: "150 000", tot: "300 000", pct: 50 },
    { name: lt.savings_goal_phone, cur: "80 000", tot: "250 000", pct: 32 },
  ];
  return (
    <>
      <ScreenHeader title={lt.savings_header} chip={lt.savings_active} />
      <div
        className="rounded-xl p-3"
        style={{
          background: "linear-gradient(160deg, rgba(124,255,58,0.18) 0%, rgba(124,255,58,0.04) 100%)",
          border: "1px solid rgba(124,255,58,0.28)",
        }}
      >
        <div className="text-[10px] text-white/60">{lt.savings_total}</div>
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

const DebtsScreen = ({ lt }: { lt: LandingStrings }) => {
  const items = [
    { init: "K", name: "Koffi", date: "12/06", amount: "+45 000" },
    { init: "A", name: "Aya", date: "28/06", amount: "+25 000" },
    { init: "M", name: "Moussa", date: "02/07", amount: "+15 000" },
  ];
  return (
    <>
      <ScreenHeader title={lt.debts_header} chip={lt.debts_net} />
      <div className="flex gap-1.5 mt-1">
        <div
          className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold"
          style={{ background: "rgba(124,255,58,0.15)", color: LIME, border: `1px solid ${LIME}` }}
        >
          {lt.debts_owed_to_me}
        </div>
        <div
          className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-semibold text-white/60"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          {lt.debts_i_owe}
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
              <div className="text-[9px] text-white/50">{lt.debts_lent_on} {it.date}</div>
            </div>
            <div className="text-[11px] font-bold" style={{ color: LIME }}>{it.amount}</div>
          </div>
        ))}
      </div>
      <button className="mt-auto py-2 rounded-xl text-[11px] font-bold" style={{ background: LIME, color: "#04060A" }}>
        {lt.debts_remind}
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
  points: readonly string[];
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

const FeatureShowcase = () => {
  const { lt } = useLandingT();
  return (
    <section id="demo" className="relative" style={{ background: "#14171C", color: TEXT }}>
      <div className="container mx-auto px-4">
        {/* 1 — Voice */}
        <FeatureSection
          badge={lt.feat_badge}
          titleBefore={lt.feat_voice_before}
          markerWord={lt.feat_voice_word}
          markerVariant="lime"
          paragraph={lt.feat_voice_p}
          points={lt.feat_voice_pts}
          reverse={false}
          phone={<VoiceScreen lt={lt} />}
          cards={[
            <FloatCard
              key="v1"
              icon={<Mic size={14} color={LIME} />}
              label={lt.fc_voice_multi}
              value={lt.fc_voice_multi_val}
              rotate={-5}
              delay={0.1}
              className="top-4 -left-2 md:-left-8"
            />,
            <FloatCard
              key="v2"
              icon={<Check size={14} color={LIME} />}
              label={lt.fc_voice_cat}
              value={lt.fc_voice_cat_val}
              rotate={5}
              delay={0.4}
              className="bottom-8 -right-2 md:-right-6"
            />,
          ]}
        />

        {/* 2 — Scan */}
        <FeatureSection
          badge={lt.feat_badge}
          titleBefore={lt.feat_scan_before}
          markerWord={lt.feat_scan_word}
          markerVariant="lime"
          paragraph={lt.feat_scan_p}
          points={lt.feat_scan_pts}
          reverse={true}
          phone={<ScanScreen lt={lt} />}
          cards={[
            <FloatCard
              key="s1"
              icon={<FileText size={14} color={LIME} />}
              label={lt.fc_scan_amount}
              value="-14 500 F"
              valueColor="#FF6B6B"
              rotate={-6}
              delay={0.15}
              className="top-6 -left-2 md:-left-8"
            />,
            <FloatCard
              key="s2"
              icon={<Download size={14} color={LIME} />}
              label={lt.fc_scan_archived}
              value={lt.fc_scan_archived_val}
              rotate={5}
              delay={0.45}
              className="bottom-6 -right-2 md:-right-6"
            />,
          ]}
        />

        {/* 3 — Savings */}
        <FeatureSection
          badge={lt.feat_badge}
          titleBefore={lt.feat_savings_before}
          markerWord={lt.feat_savings_word}
          markerVariant="dark"
          paragraph={lt.feat_savings_p}
          points={lt.feat_savings_pts}
          reverse={false}
          phone={<SavingsScreen lt={lt} />}
          cards={[
            <FloatCard
              key="e1"
              icon={<Target size={14} color={LIME} />}
              label={lt.fc_savings_goal}
              value="64%"
              progress={64}
              rotate={-5}
              delay={0.1}
              className="top-4 -left-2 md:-left-8"
            />,
            <FloatCard
              key="e2"
              icon={<Wallet size={14} color={LIME} />}
              label={lt.fc_savings_remain}
              value={lt.fc_savings_remain_val}
              rotate={6}
              delay={0.4}
              className="bottom-8 -right-2 md:-right-6"
            />,
          ]}
        />

        {/* 4 — Debts */}
        <FeatureSection
          badge={lt.feat_badge}
          titleBefore={lt.feat_debts_before}
          markerWord={lt.feat_debts_word}
          markerVariant="lime"
          paragraph={lt.feat_debts_p}
          points={lt.feat_debts_pts}
          reverse={true}
          phone={<DebtsScreen lt={lt} />}
          cards={[
            <FloatCard
              key="d1"
              icon={<ArrowUp size={14} color={LIME} />}
              label={lt.fc_debts_owed}
              value={lt.fc_debts_owed_val}
              valueColor={LIME}
              rotate={-6}
              delay={0.1}
              className="top-6 -left-2 md:-left-8"
            />,
            <FloatCard
              key="d2"
              icon={<Bell size={14} color="#F5B301" />}
              label={lt.fc_debts_reminder}
              value={lt.fc_debts_reminder_val}
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
