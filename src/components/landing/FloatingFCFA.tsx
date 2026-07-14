import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";

const FloatingFCFA = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const items = useMemo(() => {
    const count = isMobile ? 6 : 14;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: `${5 + Math.random() * 85}%`,
      y: `${Math.random() * 100}%`,
      size: 14 + Math.random() * 32,
      opacity: 0.025 + Math.random() * 0.04,
      blur: 1 + Math.random() * 2.5,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * 8,
      drift: 20 + Math.random() * 40,
      text: i % 3 === 0 ? "XOF" : "FCFA",
    }));
  }, [isMobile]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]" style={{ willChange: "transform" }}>
      {items.map((item) => (
        <motion.span
          key={item.id}
          className="absolute font-black text-[#7CFF3A] select-none"
          style={{
            left: item.x,
            top: item.y,
            fontSize: item.size,
            opacity: item.opacity,
            filter: `blur(${item.blur}px)`,
          }}
          animate={{
            y: [-item.drift, item.drift, -item.drift],
            x: [-item.drift * 0.3, item.drift * 0.3, -item.drift * 0.3],
            rotate: [-3, 3, -3],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay,
          }}
        >
          {item.text}
        </motion.span>
      ))}
    </div>
  );
};

export default FloatingFCFA;
