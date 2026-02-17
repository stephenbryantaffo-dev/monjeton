import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

/* ── Floating banknote ── */
const FloatingBill = ({ delay, x, size, duration }: { delay: number; x: string; size: number; duration: number }) => (
  <motion.div
    initial={{ y: "110vh", rotate: 0, opacity: 0 }}
    animate={{ y: "-20vh", rotate: [0, 15, -10, 20, -5, 0], opacity: [0, 0.7, 0.7, 0.5, 0] }}
    transition={{ delay, duration, repeat: Infinity, ease: "linear" }}
    className="absolute pointer-events-none"
    style={{ left: x, width: size, height: size * 0.5 }}
  >
    <div className="w-full h-full rounded-md bg-[#8DD621]/10 border border-[#8DD621]/20 backdrop-blur-sm flex items-center justify-center">
      <span className="text-[#8DD621]/40 font-bold" style={{ fontSize: size * 0.22 }}>FCFA</span>
    </div>
  </motion.div>
);

/* ── Glass card ── */
const FloatingCard = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: "easeOut" }}
    className={`absolute rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] backdrop-blur-xl p-4 ${className}`}
  >
    {children}
  </motion.div>
);

/* ── Bills data (stable across renders) ── */
const billsData = [
  { delay: 0, x: "8%", size: 54, duration: 14 },
  { delay: 3, x: "22%", size: 40, duration: 18 },
  { delay: 6, x: "45%", size: 48, duration: 16 },
  { delay: 2, x: "65%", size: 36, duration: 20 },
  { delay: 8, x: "80%", size: 52, duration: 15 },
  { delay: 5, x: "35%", size: 30, duration: 22 },
  { delay: 10, x: "90%", size: 44, duration: 17 },
  { delay: 7, x: "12%", size: 38, duration: 19 },
];

const Hero = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">

      {/* ── Moon glow ── */}
      <div className="absolute top-[8%] right-[12%] w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-[#8DD621]/5 shadow-[0_0_120px_60px_rgba(141,214,33,0.12),0_0_300px_120px_rgba(141,214,33,0.06)]" />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.75, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[8%] right-[12%] w-28 h-28 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-[#8DD621]/20 to-transparent border border-[#8DD621]/10"
      />

      {/* ── Floating bills ── */}
      {billsData.map((b, i) => (
        <FloatingBill key={i} {...b} />
      ))}

      {/* Gradient blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#8DD621]/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-[#516640]/20 blur-[100px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-[#79847E]">
            <span className="w-2 h-2 rounded-full bg-[#8DD621] animate-pulse" />
            Disponible sur Android & iOS
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6">
            <span className="text-[#D5D7D6]">Tu vas voir clair</span>
            <br />
            <span className="bg-gradient-to-r from-[#8DD621] to-[#516640] bg-clip-text text-transparent">
              dans ton jeton.
            </span>
          </h1>

          <p className="text-lg text-[#79847E] max-w-xl mb-8 leading-relaxed">
            Mon Jeton t'aide à suivre tes dépenses et revenus automatiquement, avec une IA qui scanne tes factures et tes captures Mobile Money.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a href="https://play.google.com/store/apps/details?id=monjeton" target="_blank" rel="noopener noreferrer">
              <Button className="w-full sm:w-auto bg-[#8DD621] text-[#151C18] font-bold text-base px-8 h-12 hover:bg-[#8DD621]/90 shadow-[0_0_30px_rgba(141,214,33,0.25)]">
                Télécharger l'app
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 text-base border-[rgba(255,255,255,0.08)] text-[#D5D7D6] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
              onClick={() => document.querySelector("#ai-scan")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="w-4 h-4 mr-1" />
              Voir comment ça marche
            </Button>
          </div>
        </motion.div>

        {/* Right — floating glass mockups */}
        <div className="relative hidden lg:block h-[500px]">
          <FloatingCard className="top-4 left-8 w-56" delay={0.3}>
            <div className="text-xs text-[#79847E] mb-1">Dépenses du mois</div>
            <div className="text-2xl font-bold text-[#D5D7D6]">245 000 <span className="text-sm text-[#79847E]">FCFA</span></div>
            <div className="mt-3 h-2 rounded-full bg-[#202722]">
              <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-[#8DD621] to-[#516640]" />
            </div>
          </FloatingCard>

          <FloatingCard className="top-32 right-4 w-52" delay={0.5}>
            <div className="text-xs text-[#79847E] mb-2">Scan IA</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#8DD621]/20 flex items-center justify-center text-[#8DD621] text-xs font-bold">✓</div>
              <div>
                <div className="text-sm text-[#D5D7D6] font-medium">Facture détectée</div>
                <div className="text-xs text-[#79847E]">15 000 FCFA</div>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="bottom-20 left-16 w-60" delay={0.7}>
            <div className="text-xs text-[#79847E] mb-2">Répartition</div>
            <div className="flex gap-2">
              {[
                { label: "Transport", w: "w-1/3", color: "bg-[#8DD621]" },
                { label: "Nourriture", w: "w-1/4", color: "bg-[#516640]" },
                { label: "Autre", w: "w-1/5", color: "bg-[#79847E]" },
              ].map((c) => (
                <div key={c.label} className={`${c.w} h-16 ${c.color} rounded-lg opacity-60`} />
              ))}
            </div>
          </FloatingCard>

          <FloatingCard className="bottom-4 right-12 w-48" delay={0.9}>
            <div className="text-xs text-[#79847E] mb-1">Solde total</div>
            <div className="text-xl font-bold text-[#8DD621]">1 250 000</div>
            <div className="text-xs text-[#79847E]">FCFA</div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
};

export default Hero;
