import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { ArrowRight, Play, Wallet, ArrowUp, Users, Target, BarChart3, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
};

const scrollToId = (id: string, fallbackId?: string) => {
  const el = document.getElementById(id) || (fallbackId ? document.getElementById(fallbackId) : null);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
};

/* ── Particle canvas — light, 36 particles on desktop ── */
const ParticleCanvas = ({ isMobile }: { isMobile: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const count = isMobile ? 16 : 36;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        a: Math.random() * 0.6 + 0.2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,255,58,${p.a})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(124,255,58,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isMobile]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-[2] pointer-events-none" />;
};

/* ── Floating glass cards around the top of the phone ── */
const floatingCards = [
  {
    id: "c-wallet",
    icon: Wallet,
    label: "Portefeuille du mois",
    value: "210 000 FCFA",
    bar: 68,
    position: { top: 20, left: -6, rotate: -7 },
    hiddenOnMobile: true,
    delay: 0,
    duration: 5.5,
  },
  {
    id: "c-income",
    icon: ArrowUp,
    label: "Revenu — Jose M.",
    value: "+50 000 FCFA",
    valueColor: "#7CFF3A",
    position: { top: 210, left: -16, rotate: 5 },
    positionMobile: { top: 170, left: -8, rotate: 5 },
    delay: 0.4,
    duration: 6.2,
  },
  {
    id: "c-tontine",
    icon: Users,
    label: "Tontine Bureau",
    value: "7/10 à jour",
    bar: 70,
    position: { top: 14, right: -8, rotate: 6 },
    hiddenOnMobile: true,
    delay: 0.8,
    duration: 6.0,
  },
  {
    id: "c-budget",
    icon: Target,
    label: "Budget Transport",
    value: "Reste 12 000 FCFA",
    valueColor: "#FFB020",
    position: { top: 150, right: -20, rotate: -5 },
    positionMobile: { top: 90, right: -8, rotate: -5 },
    delay: 1.2,
    duration: 5.8,
  },
  {
    id: "c-brvm",
    icon: BarChart3,
    label: "Simulateur BRVM",
    value: "Sonatel +2,4%",
    position: { top: 300, right: 10, rotate: 4 },
    hiddenOnMobile: true,
    delay: 1.6,
    duration: 6.5,
  },
];

const FloatingCard = ({
  card,
  isMobile,
}: {
  card: (typeof floatingCards)[number];
  isMobile: boolean;
}) => {
  const hiddenOnMobile = isMobile && card.hiddenOnMobile;
  const pos = isMobile && card.positionMobile ? card.positionMobile : card.position;

  return (
    <motion.div
      className={`absolute z-20 ${hiddenOnMobile ? "hidden" : "block"}`}
      style={{
        top: pos.top,
        ...(pos.left !== undefined ? { left: pos.left } : { right: pos.right }),
        rotate: pos.rotate,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -10, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay: 0.6 + card.delay },
        y: {
          duration: card.duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: card.delay,
        },
      }}
    >
      <div className="px-3 py-2.5 rounded-2xl bg-[rgba(13,21,18,0.9)] border border-[rgba(124,255,58,0.15)] backdrop-blur-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] max-w-[180px] md:max-w-[200px]">
        <div className="flex items-center gap-2 mb-1">
          <card.icon
            className="w-4 h-4 md:w-5 md:h-5 shrink-0"
            style={{ color: card.valueColor ?? "#7CFF3A" }}
          />
          <span className="text-[10px] md:text-xs text-[rgba(234,251,234,0.6)] truncate">{card.label}</span>
        </div>
        <p
          className="text-sm md:text-base font-bold leading-tight"
          style={{ color: card.valueColor ?? "#EAFBEA" }}
        >
          {card.value}
        </p>
        {typeof card.bar === "number" && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-[rgba(124,255,58,0.12)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#7CFF3A]"
              style={{ width: `${card.bar}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Hero = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const contentYRaw = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentOpacityRaw = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const contentY: MotionValue<string> | string = isMobile ? "0%" : contentYRaw;
  const contentOpacity: MotionValue<number> | number = isMobile ? 1 : contentOpacityRaw;

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Clean gradient background — planet image removed */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 50% 38%, rgba(124,255,58,0.10) 0%, transparent 62%), linear-gradient(180deg, #05070A 0%, #070B0A 55%, #05070A 100%)",
        }}
      />

      {/* Pulsing lime halo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] z-[1] pointer-events-none">
        <motion.div
          className="w-full h-full rounded-full bg-[radial-gradient(circle,rgba(124,255,58,0.12)_0%,transparent_70%)]"
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <ParticleCanvas isMobile={isMobile} />

      {/* Content with parallax (desktop only) */}
      <motion.div
        className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-5 pt-24 sm:pt-28 pb-10 sm:pb-14 text-center"
        style={{ y: contentY, opacity: contentOpacity, willChange: isMobile ? "auto" : "transform, opacity" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] mb-4 sm:mb-6">
            <span className="text-[#EAFBEA]">Gérez vos dépenses.</span>
            <br />
            <span className="text-[#EAFBEA]">Comprenez votre argent.</span>
            <br />
            <span className="bg-gradient-to-r from-[#7CFF3A] to-[#3DFF9A] bg-clip-text text-transparent">
              Scannez vos factures.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[rgba(234,251,234,0.72)] max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Mon Jeton vous aide à suivre vos dépenses en Franc CFA, analyser vos transactions, et convertir automatiquement les devises.
          </p>

          <div className="relative z-20 flex flex-col sm:flex-row gap-3 justify-center mb-10 sm:mb-12 pointer-events-auto">
            <Button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto bg-[#7CFF3A] text-[#05070A] font-bold text-base px-8 h-12 hover:bg-[#7CFF3A]/90 shadow-[0_0_30px_rgba(124,255,58,0.3)] transition-shadow hover:shadow-[0_0_40px_rgba(124,255,58,0.5)]"
            >
              S'inscrire
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-6 text-base border-[rgba(124,255,58,0.25)] text-[#EAFBEA] bg-[rgba(124,255,58,0.06)] hover:bg-[rgba(124,255,58,0.12)] backdrop-blur-[18px]"
              onClick={() => scrollToId("pricing")}
            >
              <Crown className="w-4 h-4 mr-1.5 text-[#7CFF3A]" />
              Prendre le plan Pro
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto h-12 px-6 text-base text-[rgba(234,251,234,0.65)] hover:text-[#EAFBEA] hover:bg-[rgba(234,251,234,0.05)]"
              onClick={() => scrollToId("demo", "features")}
            >
              <Play className="w-4 h-4 mr-1.5" />
              Voir la démo
            </Button>
          </div>

          {/* Hand + phone stage */}
          <div className="relative mx-auto max-w-[820px] h-[320px] sm:h-[380px] md:h-[440px] overflow-hidden z-10 pointer-events-none">
            {/* Floating glass cards */}
            {floatingCards.map((card) => (
              <FloatingCard key={card.id} card={card} isMobile={isMobile} />
            ))}

            {/* Hand + phone image — pushed down so only the top half shows */}
            <motion.div
              className="absolute left-1/2 z-10"
              style={{ bottom: -150, x: "-50%" }}
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src="/hand-phone.webp"
                alt="Mon Jeton sur mobile"
                width={640}
                height={950}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-[260px] md:w-[300px] h-auto object-contain"
              />
            </motion.div>

            {/* Bottom fade to blend the cut-off into the background */}
            <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-[#05070A] via-[#05070A]/80 to-transparent z-20 pointer-events-none" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
