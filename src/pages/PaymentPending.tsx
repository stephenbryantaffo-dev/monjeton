import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo-monjeton.webp";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const SUPPORT_EMAIL = "monjeton@brentgroup.io";
const PRO_PLANS = ["Pro", "Ultra Pro", "Pro Max", "Max"];
const TIMEOUT_MS = 15_000;

type Phase = "loading-auth" | "waiting" | "slow" | "guest";

const PaymentPending = () => {
  useDocumentMeta({
    title: "Paiement reçu — Mon Jeton",
    description: "Activation de votre abonnement Mon Jeton après paiement Jèko.",
    path: "/payment-pending",
  });
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading-auth");
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const goDashboard = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  // Relecture ponctuelle de l'abonnement (bouton "Vérifier maintenant" ou contrôle initial)
  const checkSubscription = useCallback(
    async (uid: string): Promise<boolean> => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, plan_name")
        .eq("user_id", uid)
        .maybeSingle();
      return !!data && data.status === "active" && PRO_PLANS.includes(data.plan_name ?? "");
    },
    []
  );

  // 1. Session + écoute temps réel de l'activation par le webhook
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (cancelled) return;

      if (!uid) {
        setPhase("guest");
        return;
      }
      setUserId(uid);

      // L'activation a pu arriver avant l'affichage de cette page
      if (await checkSubscription(uid)) {
        if (!cancelled) goDashboard();
        return;
      }
      if (!cancelled) setPhase("waiting");

      channel = supabase
        .channel(`payment-pending-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as { status?: string; plan_name?: string } | null;
            if (row?.status === "active" && PRO_PLANS.includes(row.plan_name ?? "")) {
              goDashboard(); // ProCelebrationModal (monté dans l'app privée) se déclenchera
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [checkSubscription, goDashboard]);

  // 2. Filet de sécurité : après 15 s sans activation, on propose une action manuelle
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setTimeout(() => setPhase("slow"), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const verifyNow = async () => {
    if (!userId) return;
    setChecking(true);
    try {
      if (await checkSubscription(userId)) {
        goDashboard();
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <header className="flex items-center justify-center px-5 py-4">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Mon Jeton" className="h-8 w-auto rounded-lg" />
          <span className="font-bold text-gradient">Mon Jeton</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card rounded-2xl p-6 space-y-6 text-center"
        >
          {phase === "guest" ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Paiement reçu ✓</h1>
                <p className="text-sm text-muted-foreground">
                  Créez votre compte pour activer votre plan Pro.
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Utilisez l'email que vous avez saisi avant le paiement.
                </p>
              </div>
              <Button
                onClick={() => navigate("/signup")}
                size="lg"
                className="w-full gradient-primary text-primary-foreground"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Créer mon compte
              </Button>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Aide%20paiement%20Mon%20Jeton`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail className="w-4 h-4" />
                Besoin d'aide ? Contactez-nous
              </a>
            </>
          ) : phase === "slow" ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Paiement reçu ✓</h1>
                <p className="text-sm text-muted-foreground">
                  Votre paiement a bien été reçu. L'activation peut prendre un moment.
                </p>
              </div>
              <Button
                onClick={verifyNow}
                disabled={checking}
                size="lg"
                className="w-full gradient-primary text-primary-foreground"
              >
                {checking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification…
                  </>
                ) : (
                  "Vérifier maintenant"
                )}
              </Button>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Paiement%20non%20activ%C3%A9%20Mon%20Jeton`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail className="w-4 h-4" />
                Toujours pas activé ? Contactez-nous
              </a>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative">
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping [animation-duration:2s]" />
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Paiement reçu ✓</h1>
                <p className="text-sm text-muted-foreground">
                  Activation de votre plan Pro en cours…
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Cela prend quelques secondes
                </p>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PaymentPending;
