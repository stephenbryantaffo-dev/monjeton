import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface MarkerTextProps {
  children: string;
  variant?: "lime" | "dark";
}

const MarkerText = ({ children, variant = "lime" }: MarkerTextProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3, margin: "0px 0px -5% 0px" });

  const fillStyle =
    variant === "lime"
      ? { background: "#7CFF3A", color: "#04060A" }
      : {
          background: "#0d1512",
          color: "#7CFF3A",
          border: "1px solid rgba(124,255,58,0.3)",
        };

  return (
    <span
      ref={ref}
      className="relative inline-block"
      style={{ padding: "0 0.25em", whiteSpace: "nowrap" }}
    >
      <span style={{ position: "relative", zIndex: 1, color: "#EAFBEA" }}>
        {children}
      </span>
      <motion.span
        aria-hidden="true"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: inView ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
        transition={{ duration: 0.75, ease: [0.65, 0, 0.35, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 0.25em",
          borderRadius: 14,
          overflow: "hidden",
          whiteSpace: "nowrap",
          zIndex: 2,
          ...fillStyle,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
};

export default MarkerText;
