import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Sparkles, Crown, RefreshCw, ArrowUpRight, HelpCircle, Check } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { openJekoPro, openJekoMax } from "@/lib/jeko";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type Subscription = {
  status: string;
  plan_name: string | null;
  price_xof: number | null;
  updated_at: string;
  created_at: string;
};

type JekoPayment = {
  id: string;
  amount: number | null;
  plan_name: string | null;
  phone: string | null;
  created_at: string;
};

const fmtXof = (n: number | null | undefined) =>
  `${Math.round(Number(n ?? 0)).toLocaleString("fr-FR")} F`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const maskPhone = (p?: string | null) => {
  if (!p) return "—";
  const digits = String(p).replace(/[^0-9]/g, "");
  if (digits.length < 4) return "****";
  return `**** ${digits.slice(-4)}`;
};

const PLAN_FEATURES: Record<string, string[]> = {
  Pro: [
    "Transactions illimitées",
    "Scan IA (50 / mois)",
    "Assistant IA financier",
    "Rapports & exports PDF",
  ],
  "Ultra Pro": [
    "Tout ce qui est dans Pro",
    "Scan IA illimité",
    "Support prioritaire",
    "Nouvelles features en avant-première",
  ],
};

const SubscriptionManage = () => {
  useDocumentMeta({
    title: "Mon abonnement — Mon Jeton",
    description: "Gère ton abonnement Mon Jeton : plan actuel, renouvellement et historique des paiements Jèko.",
    path: "/settings/subscription",
  });

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<JekoPayment[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [subRes, payRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("status, plan_name, price_xof, updated_at, created_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("jeko_payments")
          .select("id, amount, plan_name, phone, created_at")
          .eq("matched_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      setSub((subRes.data as Subscription | null) ?? null);
      setPayments((payRes.data as JekoPayment[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isActive = sub?.status === "active";
  const plan = sub?.plan_name ?? "Gratuit";
  const isUltra = plan === "Ultra Pro";

  return (
    <DashboardLayout title="Mon abonnement">
      <div className="max-w-2xl mx-auto space-y-5">
        {loading ? (
          <>
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </>
        ) : !isActive ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 text-center space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Aucun abonnement actif</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tu es actuellement sur le plan gratuit. Passe à Pro ou Ultra Pro pour débloquer toutes les fonctionnalités.
              </p>
            </div>
            <Button asChild variant="hero" size="lg" className="w-full">
              <Link to="/subscribe">Voir les plans</Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card rounded-2xl p-6 space-y-5 ${isUltra ? "" : "neon-glow border border-primary/40"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isUltra
                        ? "bg-foreground text-background"
                        : "gradient-primary text-primary-foreground"
                    }`}
                  >
                    {isUltra ? <Crown className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {isUltra ? "ULTRA PRO" : "PRO"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                    Actif
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Activé le {fmtDate(sub!.updated_at)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-foreground">
                  {fmtXof(sub!.price_xof)}
                </div>
                <div className="text-xs text-muted-foreground">/ mois</div>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-foreground">
              {(PLAN_FEATURES[plan] ?? []).map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 pt-1">
              <Button
                onClick={() => (isUltra ? openJekoMax() : openJekoPro())}
                variant="hero"
                size="lg"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Renouveler ({fmtXof(sub!.price_xof)})
              </Button>

              {!isUltra && (
                <Button
                  onClick={() => openJekoMax()}
                  size="lg"
                  className="w-full gradient-primary text-primary-foreground"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Passer à Ultra Pro
                </Button>
              )}

              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/subscribe">Voir tous les plans</Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Historique paiements */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Historique des paiements</h3>
            <span className="text-xs text-muted-foreground">{payments.length}</span>
          </div>

          {loading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun paiement enregistré pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {payments.map((p) => (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {p.plan_name ?? "Paiement"}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                        Reçu
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(p.created_at)} · {maskPhone(p.phone)}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-foreground flex-shrink-0">
                    {fmtXof(p.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Support */}
        <a
          href="mailto:support@monjeton.app?subject=Probl%C3%A8me%20de%20paiement%20J%C3%A8ko"
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Un problème de paiement ? Contacter le support
        </a>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionManage;
