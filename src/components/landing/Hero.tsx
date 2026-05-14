import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { ArrowRight, Play, Zap, ScanLine, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroPlanet from "@/assets/hero-planet.webp";

// Tiny blurred placeholder (20px webp) — instantly visible while real image loads
const HERO_PLACEHOLDER =
  "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAABwBACdASoUAA4APxFysVAsJqSisAgBgCIJZACdMoLT9AuEZh8KxVuA4wm0AAD+ePcTTK9+gosaN/WHSR4nBhjODvceMglljSwfHlu4MKIZ3JHgcMqz+uqgZYXTAAAA";

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

/* ── Particle canvas — count adapts to device ── */
const ParticleCanvas = ({ isMobile }: { isMobile: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const count = isMobile ? 20 : 60;

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

const Scanline = () => (
  <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
    <motion.div
      className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[rgba(124,255,58,0.25)] to-transparent"
      animate={{ y: ["0vh", "100vh"] }}
      transition={{ duration: 7, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
    />
  </div>
);

const FilmGrain = () => (
  <div
    className="absolute inset-0 z-[4] pointer-events-none opacity-[0.03]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }}
  />
);

const badges = [
  { icon: Zap, text: "Conversion automatique des devises" },
  { icon: ScanLine, text: "Scan AI des factures" },
  { icon: Building2, text: "Mode Entreprise (équipe + chat)" },
];

const Hero = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax: image moves slower than scroll — disabled on mobile for smoother scrolling
  const bgYRaw = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const bgScaleRaw = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const contentYRaw = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentOpacityRaw = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const bgY: MotionValue<string> | string = isMobile ? "0%" : bgYRaw;
  const bgScale: MotionValue<number> | number = isMobile ? 1 : bgScaleRaw;
  const contentY: MotionValue<string> | string = isMobile ? "0%" : contentYRaw;
  const contentOpacity: MotionValue<number> | number = isMobile ? 1 : contentOpacityRaw;

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* BG image with parallax (desktop only). Blur-up: tiny base64 placeholder shown instantly, real image fades in. */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY, scale: bgScale, willChange: isMobile ? "auto" : "transform" }}>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HERO_PLACEHOLDER})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
        {/* Explicit dimensions prevent CLS */}
        <img
          src={heroPlanet}
          alt=""
          width={1536}
          height={1024}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setHeroLoaded(true)}
          className="relative w-full h-full object-cover"
          style={{ opacity: heroLoaded ? 1 : 0, transition: "opacity 0.6s ease-out" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05070A]/80 via-[#05070A]/60 to-[#05070A]" />
      </motion.div>

      {/* Halo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] z-[1] pointer-events-none">
        <motion.div
          className="w-full h-full rounded-full bg-[radial-gradient(circle,rgba(124,255,58,0.12)_0%,transparent_70%)]"
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <ParticleCanvas isMobile={isMobile} />
      {/* Scanline + FilmGrain disabled on mobile — extra repaint cost, low visual value */}
      {!isMobile && <Scanline />}
      {!isMobile && <FilmGrain />}

      {/* Content with parallax (desktop only) */}
      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-5 pt-24 sm:pt-28 pb-16 sm:pb-20 text-center"
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

          <div className="relative z-20 flex flex-col sm:flex-row gap-4 justify-center mb-12 pointer-events-auto">
            <Button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto bg-[#7CFF3A] text-[#05070A] font-bold text-base px-8 h-12 hover:bg-[#7CFF3A]/90 shadow-[0_0_30px_rgba(124,255,58,0.3)] transition-shadow hover:shadow-[0_0_40px_rgba(124,255,58,0.5)]"
            >
              S'inscrire
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 text-base border-[rgba(124,255,58,0.18)] text-[#EAFBEA] bg-[rgba(124,255,58,0.04)] hover:bg-[rgba(124,255,58,0.1)] backdrop-blur-[18px]"
              onClick={() => {
                const el = document.getElementById("demo") || document.getElementById("features");
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - 80;
                  window.scrollTo({ top, behavior: "smooth" });
                } else {
                  navigate("/signup");
                }
              }}
            >
              <Play className="w-4 h-4 mr-1" />
              Voir la démo
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {badges.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.15 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(124,255,58,0.06)] border border-[rgba(124,255,58,0.18)] backdrop-blur-[18px] text-xs text-[rgba(234,251,234,0.72)]"
              >
                <b.icon className="w-3.5 h-3.5 text-[#7CFF3A]" />
                {b.text}
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="text-sm text-[rgba(234,251,234,0.5)] text-center"
          >
            ⭐ Rejoins <span className="font-semibold text-[rgba(234,251,234,0.72)]">2 500+</span> utilisateurs qui gèrent leurs finances avec Mon Jeton
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
