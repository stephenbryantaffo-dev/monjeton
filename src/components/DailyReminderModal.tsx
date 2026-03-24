import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";

interface DailyReminderModalProps {
  open: boolean;
  onClose: () => void;
  txCount: number;
  firstName: string;
  profileType?: string;
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

const DailyReminderModal = ({ open, onClose, txCount, firstName, profileType }: DailyReminderModalProps) => {
  const navigate = useNavigate();
  const { title, message } = getMessage(txCount, firstName, profileType);

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
