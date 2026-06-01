import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo-monjeton.webp";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const SUPPORT_EMAIL = "monjeton@brentgroup.io";

const PaymentPending = () => {
  useDocumentMeta({
    title: "Paiement en cours — Mon Jeton",
    description: "Vérification de votre paiement Jèko et activation de votre abonnement Mon Jeton.",
    path: "/payment-pending",
  });
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const verify = async () => {
    setChecking(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        toast.error("Tu dois être connecté pour vérifier ton accès.");
        navigate("/login");
        return;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await res.json();

      if (res.ok && data.hasAccess) {
        toast.success(`Bienvenue en ${data.plan || "Pro"} ! 🎉`);
        setTimeout(() => navigate("/dashboard"), 800);
      } else {
        toast.info("Pas encore reçu, réessaie dans 1 minute.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur de vérification. Réessaie dans un instant.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Mon Jeton" className="h-8 w-auto rounded-lg" />
          <span className="font-bold text-gradient">Mon Jeton</span>
        </div>
        <div className="w-5" />
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card rounded-2xl p-6 space-y-6 text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Paiement en vérification</h1>
            <p className="text-sm text-muted-foreground">
              Ton paiement Jèko est en cours de confirmation. Cela prend généralement moins de 2 minutes.
            </p>
          </div>

          <Button
            onClick={verify}
            disabled={checking}
            size="lg"
            className="w-full gradient-primary text-primary-foreground"
          >
            {checking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification…</>
            ) : (
              "J'ai payé — Vérifier mon accès"
            )}
          </Button>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Aide%20paiement%20Mon%20Jeton`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <Mail className="w-4 h-4" />
            Contacter le support
          </a>
        </motion.div>
      </main>
    </div>
  );
};

export default PaymentPending;
