import { ReactNode } from "react";
import { motion } from "framer-motion";
import TrendLinesSVG from "./TrendLinesSVG";

interface Props {
  children: ReactNode;
  variant?: number;
  /** Show a top glow halo */
  glow?: boolean;
  /** Show a bottom glow halo */
  glowBottom?: boolean;
}

const AnimatedSectionBackground = ({ children, variant = 0, glow = true, glowBottom = false }: Props) => {
  return (
    // contain: content prevents glow animations from triggering layout recalc in sibling sections
    <div className="relative overflow-hidden" style={{ contain: "content" }}>
      {/* Floating radial halos */}
      {glow && (
        <motion.div
          className="absolute pointer-events-none z-[0]"
          style={{
            top: "10%",
            left: variant % 2 === 0 ? "-10%" : "60%",
            width: "500px",
            height: "500px",
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-full h-full rounded-full bg-[radial-gradient(circle,rgba(124,255,58,0.06)_0%,transparent_70%)]" />
        </motion.div>
      )}

      {glowBottom && (
        <motion.div
          className="absolute pointer-events-none z-[0]"
          style={{
            bottom: "5%",
            right: variant % 2 === 0 ? "60%" : "-5%",
            width: "400px",
            height: "400px",
          }}
          animate={{
            x: [0, -20, 0],
            y: [0, 15, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-full h-full rounded-full bg-[radial-gradient(circle,rgba(61,255,154,0.04)_0%,transparent_70%)]" />
        </motion.div>
      )}

      {/* Trend lines */}
      <TrendLinesSVG variant={variant} />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AnimatedSectionBackground;
