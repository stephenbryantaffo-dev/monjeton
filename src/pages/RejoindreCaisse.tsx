import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Users, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logoImg from "@/assets/logo-monjeton.webp";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const ROLE_LABEL: Record<string, string> = {
  viewer: "Observateur",
  manager: "Co-gestionnaire",
  owner: "Propriétaire",
};

type Preview =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; caisseName: string; role: string };

const RejoindreCaisse = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<Preview>({ state: "loading" });
  const [joining, setJoining] = useState(false);

  useDocumentMeta({
    title: "Rejoindre une caisse — Mon Jeton",
    description: "Rejoins une caisse commune sur Mon Jeton via un lien d'invitation.",
    path: `/rejoindre-caisse/${token ?? ""}`,
  });

  useEffect(() => {
    if (!token) {
      setPreview({ state: "error", message: "Lien d'invitation invalide." });
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("preview_caisse_invite" as any, { _token: token });
      if (error) {
        setPreview({ state: "error", message: "Impossible de vérifier le lien. Réessaie plus tard." });
        return;
      }
      const res = data as any;
      if (!res?.ok) {
        const map: Record<string, string> = {
          invalid_token: "Ce lien d'invitation n'existe pas ou a été révoqué.",
          expired: "Ce lien d'invitation a expiré.",
          max_uses_reached: "Ce lien a atteint son nombre maximum d'utilisations.",
        };
        setPreview({ state: "error", message: map[res?.error] || "Lien invalide." });
        return;
      }
      setPreview({ state: "ready", caisseName: res.caisse_name, role: res.role });
    })();
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    const { data, error } = await supabase.rpc("join_caisse_via_token" as any, { _token: token });
    setJoining(false);

    if (error) {
      toast.error("Erreur réseau. Réessaie.");
      return;
    }
    const res = data as any;
    if (!res?.ok) {
      const map: Record<string, string> = {
        not_authenticated: "Tu dois être connecté pour rejoindre.",
        invalid_token: "Ce lien n'est plus valide.",
        expired: "Ce lien a expiré.",
        max_uses_reached: "Ce lien a atteint son nombre maximum d'utilisations.",
      };
      toast.error(map[res?.error] || "Impossible de rejoindre.");
      return;
    }
    toast.success(`Tu as rejoint « ${res.caisse_name } » 🎉`);
    navigate("/tontine", { replace: true });
  };

  const goAuth = (target: "signup" | "login") => {
    const returnTo = `/rejoindre-caisse/${token}`;
    navigate(`/${target}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 border border-primary/20"
      >
        <Link to="/" className="flex items-center justify-center mb-6">
          <img src={logoImg} alt="Mon Jeton" className="h-10" />
        </Link>

        {preview.state === "loading" || authLoading ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Vérification du lien...</p>
          </div>
        ) : preview.state === "error" ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Lien invalide</h1>
            <p className="text-sm text-muted-foreground mb-6">{preview.message}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Tu es invité à rejoindre
            </h1>
            <p className="text-2xl font-bold text-primary mb-1 break-words">
              « {preview.caisseName} »
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              en tant que <span className="font-semibold text-foreground">{ROLE_LABEL[preview.role] || preview.role}</span>
            </p>

            {user ? (
              <Button
                onClick={handleJoin}
                disabled={joining}
                className="w-full gradient-primary text-primary-foreground"
                size="lg"
              >
                {joining ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connexion à la caisse...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Rejoindre la caisse</>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Connecte-toi ou crée un compte pour accepter l'invitation.
                </p>
                <Button
                  onClick={() => goAuth("signup")}
                  className="w-full gradient-primary text-primary-foreground"
                  size="lg"
                >
                  Créer un compte
                </Button>
                <Button
                  onClick={() => goAuth("login")}
                  variant="outline"
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" /> J'ai déjà un compte
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default RejoindreCaisse;
