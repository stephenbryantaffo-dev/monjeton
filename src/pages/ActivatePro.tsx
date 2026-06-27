import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Lock } from "lucide-react";

type Status =
  | "loading"
  | "need_auth"
  | "no_token"
  | "activating"
  | "success"
  | "already_used"
  | "expired"
  | "invalid"
  | "error";

export default function ActivatePro() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() || "";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [plan, setPlan] = useState<string>("pro");

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setStatus("no_token"); return; }
    if (!user) { setStatus("need_auth"); return; }

    let cancelled = false;
    (async () => {
      setStatus("activating");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) { setStatus("need_auth"); return; }

        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/activate-pro-token`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data?.ok) {
          setPlan(String(data.plan || "pro"));
          setStatus("success");
        } else {
          const r = String(data?.reason || "invalid");
          if (r === "already_used" || r === "expired" || r === "invalid") setStatus(r as Status);
          else setStatus("error");
        }
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, token]);

  const returnTo = `/activer?token=${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          {(status === "loading" || status === "activating") && (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <h1 className="text-xl font-semibold mb-2">Activation en cours…</h1>
              <p className="text-sm text-muted-foreground">Un instant, on prépare ton Pro.</p>
            </>
          )}

          {status === "need_auth" && (
            <>
              <Lock className="h-10 w-10 text-primary mb-4" />
              <h1 className="text-xl font-semibold mb-2">Connecte-toi pour activer ton Pro</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Connecte-toi ou crée ton compte pour activer ton abonnement Pro avec ce lien.
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Button asChild className="w-full">
                  <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Me connecter</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/signup?returnTo=${encodeURIComponent(returnTo)}`}>Créer un compte</Link>
                </Button>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
              <h1 className="text-2xl font-bold mb-2">🎉 Pro activé !</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Ton abonnement {plan === "ultra" ? "Ultra Pro" : "Pro"} est désormais actif. Profite de toutes les fonctionnalités.
              </p>
              <Button className="w-full" onClick={() => navigate("/dashboard")}>
                Aller au Dashboard
              </Button>
            </>
          )}

          {status === "already_used" && (
            <>
              <XCircle className="h-10 w-10 text-destructive mb-4" />
              <h1 className="text-xl font-semibold mb-2">Lien déjà utilisé</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Ce lien d'activation a déjà été utilisé. Si tu penses que c'est une erreur, contacte le support.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/dashboard">Retour</Link>
              </Button>
            </>
          )}

          {status === "expired" && (
            <>
              <Clock className="h-10 w-10 text-destructive mb-4" />
              <h1 className="text-xl font-semibold mb-2">Lien expiré</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Ce lien a expiré. Contacte le support pour qu'on te renvoie un nouveau lien.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/dashboard">Retour</Link>
              </Button>
            </>
          )}

          {(status === "invalid" || status === "no_token" || status === "error") && (
            <>
              <XCircle className="h-10 w-10 text-destructive mb-4" />
              <h1 className="text-xl font-semibold mb-2">Lien invalide</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {status === "no_token"
                  ? "Aucun token fourni dans l'URL."
                  : "Ce lien d'activation n'est pas valide."}
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/">Retour à l'accueil</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
