import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Check, Users } from "lucide-react";
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm glass-card rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground text-center">{title}</h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">{message}</p>

            {tontineReminder && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center space-y-2">
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

            <div className="flex flex-col gap-2 pt-2">
              {txCount < 3 && (
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
              )}
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={onClose}>
                <Check className="w-4 h-4" /> C'est bon pour aujourd'hui
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DailyReminderModal;
