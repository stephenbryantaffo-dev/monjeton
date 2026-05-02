import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Check, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TontineReminder {
  name: string;
  daysLeft: number;
}

interface DailyReminderModalProps {
  open: boolean;
  onClose: () => void;
  txCount: number;
  firstName: string;
  profileType?: string;
  userId?: string;
}

function getMessage(txCount: number, firstName: string, profileType?: string) {
  if (txCount === 0) {
    const title = `Eh ${firstName} ! 👀`;
    const messages: Record<string, string> = {
      salarié: "T'as passé toute la journée sans noter une seule dépense. Le garba du midi ? Le taxi ? Quelque chose !",
      étudiant: "Journée sans dépense ? Impossible ! Même 100F pour l'eau tu dois noter hein 😄",
      entrepreneur: "Patron ! Tes charges du jour, tu les as notées quelque part ?",
      parent: "Les courses, les enfants, le marché... Qu'est-ce qui s'est passé aujourd'hui ?",
    };
    return {
      title,
      message: messages[profileType || ""] || "Tu n'as noté aucune dépense aujourd'hui. Prends 30 secondes pour le faire !",
      emoji: "👀",
    };
  }

  if (txCount <= 2) {
    return {
      title: `Bien ${firstName} ! 🟡`,
      message: `T'as noté ${txCount} dépense${txCount > 1 ? "s" : ""} aujourd'hui. Tu es sûr c'est tout ? Le transport ? Le déjeuner ? 🤔`,
      emoji: "🟡",
    };
  }

  return {
    title: "Champion ! 🔥",
    message: `Wow ${txCount} transactions aujourd'hui ! Tu gères bien ton Jeton. Continue comme ça !`,
    emoji: "🔥",
  };
}

const DailyReminderModal = ({ open, onClose, txCount, firstName, profileType, userId }: DailyReminderModalProps) => {
  const navigate = useNavigate();
  const { title, message } = getMessage(txCount, firstName, profileType);
  const [tontineReminder, setTontineReminder] = useState<TontineReminder | null>(null);

  useEffect(() => {
    if (open && userId) checkTontineReminders();
  }, [open, userId]);

  const checkTontineReminders = async () => {
    if (!userId) return;
    try {
      const { data: tontines } = await supabase
        .from("tontines")
        .select("id, name")
        .eq("user_id", userId)
        .eq("status", "active");

      if (!tontines || tontines.length === 0) return;

      const ids = tontines.map((t) => t.id);
      const { data: cycles } = await supabase
        .from("tontine_cycles")
        .select("tontine_id, end_date")
        .in("tontine_id", ids)
        .eq("status", "open");

      if (!cycles || cycles.length === 0) return;

      const now = new Date();
      for (const cycle of cycles) {
        const daysLeft = Math.ceil(
          (new Date(cycle.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 5 && daysLeft >= 0) {
          const tontine = tontines.find((t) => t.id === cycle.tontine_id);
          if (tontine) {
            setTontineReminder({ name: tontine.name, daysLeft });
            return;
          }
        }
      }
    } catch {
      console.warn("tontine reminder check failed");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl p-6 border border-primary/25 shadow-2xl"
            style={{
              background:
                "linear-gradient(160deg, rgba(13, 26, 8, 0.98) 0%, rgba(5, 16, 10, 0.98) 100%)",
              boxShadow:
                "0 0 60px rgba(126, 200, 69, 0.15), 0 25px 60px rgba(0, 0, 0, 0.5)",
            }}
          >
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition-all active:scale-90 z-10"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>

            <h3 className="text-2xl font-black text-foreground text-center mb-3 tracking-tight pr-10">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-5">
              {message}
            </p>

            {tontineReminder && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center space-y-2 mb-4">
                <p className="text-sm text-foreground font-medium">
                  ⚠️ Ta tontine <span className="font-bold">{tontineReminder.name}</span> se termine dans{" "}
                  <span className="text-amber-400 font-bold">
                    {tontineReminder.daysLeft} jour{tontineReminder.daysLeft > 1 ? "s" : ""}
                  </span> !
                </p>
                <p className="text-xs text-muted-foreground">Tu as cotisé ?</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    onClose();
                    navigate("/tontine");
                  }}
                >
                  <Users className="w-3.5 h-3.5" /> Aller à la tontine
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {txCount < 3 ? (
                <>
                  <Button
                    variant="hero"
                    className="w-full gap-2"
                    onClick={() => {
                      onClose();
                      navigate("/transactions/new");
                    }}
                  >
                    <Plus className="w-4 h-4" /> Ajouter une dépense
                  </Button>
                  <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={onClose}>
                    <Check className="w-4 h-4" /> C'est bon pour aujourd'hui
                  </Button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  style={{ boxShadow: "0 0 20px rgba(126, 200, 69, 0.3)" }}
                >
                  Super, continuer →
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DailyReminderModal;
