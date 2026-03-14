import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ArrowRight, Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoMonjeton from "@/assets/logo-monjeton.png";

const WALLET_OPTIONS = [
  { name: "Wave", emoji: "🌊" },
  { name: "Orange Money", emoji: "🟠" },
  { name: "MTN Mobile Money", emoji: "🟡" },
  { name: "Moov Money", emoji: "🔵" },
  { name: "Cash", emoji: "💵" },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 2 state
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState("");
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [createdWalletId, setCreatedWalletId] = useState<string | null>(null);

  // Step 3 state
  const [demoAmount, setDemoAmount] = useState("1000");
  const [demoNote, setDemoNote] = useState("Transport");
  const [creatingTx, setCreatingTx] = useState(false);

  const firstName = profile?.full_name?.split(" ")[0] || "ami";

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleCreateWallet = async () => {
    if (!selectedWallet || !user) return;
    setCreatingWallet(true);
    try {
      const { data, error } = await supabase.from("wallets").insert({
        user_id: user.id,
        wallet_name: selectedWallet,
        initial_balance: Number(walletBalance) || 0,
      }).select("id").single();

      if (error) throw error;
      setCreatedWalletId(data.id);
      toast({ title: `${selectedWallet} créé ✅` });
      goNext();
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer le portefeuille", variant: "destructive" });
    } finally {
      setCreatingWallet(false);
    }
  };

  const handleCreateDemoTx = async () => {
    if (!user) return;
    setCreatingTx(true);
    try {
      // Find expense category "Transport"
      const { data: cats } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .eq("name", "Transport")
        .maybeSingle();

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "expense",
        amount: Number(demoAmount) || 1000,
        note: demoNote,
        date: new Date().toISOString().split("T")[0],
        category_id: cats?.id || null,
        wallet_id: createdWalletId,
      });

      toast({ title: "Transaction enregistrée ✅" });
      onComplete();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setCreatingTx(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex flex-col items-center text-center"
            >
              <motion.img
                src={logoMonjeton}
                alt="Mon Jeton"
                className="w-20 h-20 rounded-2xl mb-6"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              />
              <motion.h1
                className="text-3xl font-bold text-foreground mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Bienvenue {firstName} !
              </motion.h1>
              <motion.p
                className="text-muted-foreground mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Configurons ton espace en 2 minutes
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button variant="hero" size="lg" onClick={goNext} className="gap-2 px-8">
                  Commencer <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-6"
            >
              <div className="text-center">
                <Wallet className="w-10 h-10 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-bold text-foreground">
                  Quel est ton moyen de paiement principal ?
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {WALLET_OPTIONS.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => setSelectedWallet(w.name)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all border ${
                      selectedWallet === w.name
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg mr-2">{w.emoji}</span>
                    {w.name}
                  </button>
                ))}
              </div>

              {selectedWallet && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-foreground">
                    Solde actuel (FCFA)
                  </label>
                  <Input
                    type="number"
                    placeholder="Ex: 25000"
                    value={walletBalance}
                    onChange={(e) => setWalletBalance(e.target.value)}
                    className="bg-secondary border-border text-lg font-bold h-12"
                  />
                </motion.div>
              )}

              <Button
                variant="hero"
                size="lg"
                className="w-full gap-2"
                disabled={!selectedWallet || creatingWallet}
                onClick={handleCreateWallet}
              >
                {creatingWallet ? "Création..." : "Continuer"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">🧾</span>
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Enregistre ta première dépense
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Note</label>
                  <Input
                    value={demoNote}
                    onChange={(e) => setDemoNote(e.target.value)}
                    className="bg-secondary border-border"
                    placeholder="Ex: Transport"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Montant (FCFA)</label>
                  <Input
                    type="number"
                    value={demoAmount}
                    onChange={(e) => setDemoAmount(e.target.value)}
                    className="bg-secondary border-border text-lg font-bold h-12"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full gap-2"
                  disabled={creatingTx}
                  onClick={handleCreateDemoTx}
                >
                  {creatingTx ? "Enregistrement..." : "Enregistrer et accéder au dashboard"}
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={onComplete}
                >
                  <SkipForward className="w-4 h-4" /> Passer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
