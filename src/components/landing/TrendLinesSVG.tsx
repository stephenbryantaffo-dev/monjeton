import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const paths = [
  "M0 120 Q150 40, 300 100 T600 60 T900 90 T1200 50",
  "M0 80 Q200 140, 400 70 T800 110 T1200 80",
  "M0 150 Q100 60, 250 130 T500 50 T750 100 T1000 40 T1200 90",
];

interface TrendLinesSVGProps {
  variant?: number;
  className?: string;
}

const TrendLinesSVG = ({ variant = 0, className = "" }: TrendLinesSVGProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const dashOffset = useTransform(scrollYProgress, [0, 1], [1200, 0]);

  const path = paths[variant % paths.length];

  return (
    // will-change promotes SVG stroke animation to GPU layer
    <div ref={ref} className={`absolute inset-0 overflow-hidden pointer-events-none z-[0] ${className}`} style={{ willChange: "transform" }}>
      <svg
        viewBox="0 0 1200 180"
        fill="none"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id={`tl-grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(124,255,58,0.25)" />
            <stop offset="50%" stopColor="rgba(61,255,154,0.15)" />
            <stop offset="100%" stopColor="rgba(124,255,58,0)" />
          </linearGradient>
        </defs>
        <motion.path
          d={path}
          stroke={`url(#tl-grad-${variant})`}
          strokeWidth="1.5"
          fill="none"
          strokeDasharray={1200}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
    </div>
  );
};

export default TrendLinesSVG;
