import { motion } from "framer-motion";

/** Full-page film grain + periodic scanline */
// z-[5] instead of z-[50] — high z-index was blocking scroll events on some browsers
// will-change: transform ensures this layer is GPU-composited without triggering repaints
const GlobalDigitalEffects = () => (
  <div className="fixed inset-0 pointer-events-none z-[5]" style={{ mixBlendMode: "screen", willChange: "transform" }}>
    {/* Film grain */}
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />

    {/* Scanline */}
    <motion.div
      className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(124,255,58,0.18)] to-transparent"
      animate={{ y: ["0vh", "100vh"] }}
      transition={{ duration: 7, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
    />
  </div>
);

export default GlobalDigitalEffects;
