import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Share2 } from "lucide-react";
import type { Badge } from "@/lib/badgeCalculator";

interface MonthlyBadgeProps {
  open: boolean;
  onClose: () => void;
  badge: Badge | null;
  month: string; // e.g. "mars 2026"
  savingsRate: number;
}

// Simple confetti particles
const Confetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{
          backgroundColor: [`hsl(45,100%,55%)`, `hsl(84,81%,44%)`, `hsl(200,70%,60%)`, `hsl(320,70%,55%)`, `hsl(25,95%,53%)`][i % 5],
          left: `${10 + Math.random() * 80}%`,
          top: "-10px",
        }}
        initial={{ y: 0, opacity: 1, rotate: 0 }}
        animate={{
          y: [0, 400 + Math.random() * 200],
          opacity: [1, 1, 0],
          rotate: [0, 360 + Math.random() * 360],
          x: [0, (Math.random() - 0.5) * 100],
        }}
        transition={{
          duration: 2 + Math.random(),
          delay: Math.random() * 0.5,
          ease: "easeOut",
        }}
      />
    ))}
  </div>
);

const MonthlyBadge = ({ open, onClose, badge, month, savingsRate }: MonthlyBadgeProps) => {
  const navigate = useNavigate();

  if (!badge) return null;

  const handleShare = async () => {
    const text = `${badge.emoji} J'ai obtenu le badge "${badge.title}" sur Mon Jeton ce mois de ${month} !\n${badge.subtitle}\n\nTélécharge Mon Jeton pour gérer tes finances : https://monjeton.lovable.app`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Badge: ${badge.title}`, text });
      } catch {
        // User cancelled
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <Confetti />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="w-full max-w-sm glass-card rounded-3xl p-6 space-y-5 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow background */}
            <div
              className="absolute inset-0 opacity-10 blur-[80px] pointer-events-none"
              style={{ background: `radial-gradient(circle at center, ${badge.color}, transparent)` }}
            />

            <div className="relative text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                className="text-6xl"
              >
                {badge.emoji}
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Badge de {month}
                </p>
                <h2 className="text-xl font-bold text-foreground">{badge.title}</h2>
                <p className="text-sm font-medium mt-1" style={{ color: badge.color }}>
                  {badge.subtitle}
                </p>
              </motion.div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-muted-foreground"
              >
                {badge.description}
              </motion.p>

              {/* Savings progress */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="pt-2"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Taux d'épargne</span>
                  <span className="font-semibold text-foreground">{Math.round(savingsRate)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: badge.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="relative flex flex-col gap-2 pt-1"
            >
              <Button variant="hero" className="w-full gap-2" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Partager sur WhatsApp
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => {
                  onClose();
                  navigate("/reports");
                }}
              >
                <BarChart3 className="w-4 h-4" /> Voir mes stats
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MonthlyBadge;
