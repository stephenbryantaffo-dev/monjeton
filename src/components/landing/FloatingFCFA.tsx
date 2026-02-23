import { motion } from "framer-motion";
import { useMemo } from "react";

const FloatingFCFA = () => {
  const items = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: `${5 + Math.random() * 85}%`,
      y: `${Math.random() * 100}%`,
      size: 14 + Math.random() * 32,
      opacity: 0.04 + Math.random() * 0.07,
      blur: 1 + Math.random() * 2.5,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * 8,
      drift: 20 + Math.random() * 40,
      text: i % 3 === 0 ? "XOF" : "FCFA",
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]" style={{ willChange: "transform" }}>
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
