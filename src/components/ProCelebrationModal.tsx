import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { PartyPopper, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const PRO_PLANS = ["Pro", "Ultra Pro"];

const flagKey = (userId: string) => `pro_celebration_shown_${userId}`;

const PERKS = [
  "Scans de reçus illimités",
  "Assistant IA sans limite",
  "Budgets & prévisions avancés",
  "Rapports PDF détaillés",
];

const fireConfetti = () => {
  const end = Date.now() + 1200;
  const colors = ["#7EC845", "#B8F27A", "#FFFFFF"];
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
};

const ProCelebrationModal = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const firstName = (profile?.full_name || "").trim().split(" ")[0] || "";

  const celebrate = useCallback(() => {
    if (!user) return;
    if (localStorage.getItem(flagKey(user.id))) return;
    localStorage.setItem(flagKey(user.id), "1");
    setOpen(true);
  }, [user]);

  // Realtime : on écoute l'abonnement de l'utilisateur connecté
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // Cas "retour de paiement" : l'activation a pu arriver avant le montage
    supabase
      .from("subscriptions")
      .select("status, plan_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        if (data.status === "active" && PRO_PLANS.includes(data.plan_name ?? "")) {
          celebrate();
        }
      });

    const channel = supabase
      .channel(`pro-celebration-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { status?: string; plan_name?: string } | null;
          const prev = payload.old as { status?: string; plan_name?: string } | null;
          if (!row) return;
          const isProNow = row.status === "active" && PRO_PLANS.includes(row.plan_name ?? "");
          const wasProBefore = prev?.status === "active" && PRO_PLANS.includes(prev?.plan_name ?? "");
          if (isProNow && !wasProBefore) celebrate();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, celebrate]);

  useEffect(() => {
    if (!open) return;
    fireConfetti();
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleDiscover = () => {
    setOpen(false);
    navigate("/dashboard");
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center px-5 bg-background/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-celebration-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[28px] border border-primary/30 bg-card p-6 text-center shadow-2xl"
            style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.25)" }}
          >
            <motion.div
              animate={{ rotate: [-8, 8, -8], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
            >
              <PartyPopper className="h-10 w-10 text-primary" />
            </motion.div>

            <h2 id="pro-celebration-title" className="text-2xl font-bold text-foreground">
              {firstName ? `Bienvenue dans le Pro, ${firstName} !` : "Bienvenue dans le Pro !"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ton paiement est confirmé. Toutes les fonctionnalités Pro sont débloquées.
            </p>

            <ul className="mt-5 space-y-2.5 text-left">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-sm text-foreground">{perk}</span>
                </li>
              ))}
            </ul>

            <Button ref={buttonRef} onClick={handleDiscover} size="lg" className="mt-6 w-full">
              Découvrir mes nouvelles fonctionnalités
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ProCelebrationModal;
