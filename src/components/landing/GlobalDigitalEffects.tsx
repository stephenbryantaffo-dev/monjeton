import { useState, useEffect } from "react";

/** Full-page film grain + periodic scanline (desktop only). */
const GlobalDigitalEffects = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Skip entirely on mobile — pure decorative layer
  if (isMobile) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[5]" style={{ mixBlendMode: "screen", willChange: "transform" }}>
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[rgba(124,255,58,0.18)] to-transparent"
        style={{
          animation: "mj-scan 11s linear infinite",
        }}
      />
      <style>{`@keyframes mj-scan { 0% { transform: translateY(0) } 60% { transform: translateY(100vh) } 100% { transform: translateY(100vh) } }`}</style>
    </div>
  );
};

export default GlobalDigitalEffects;
