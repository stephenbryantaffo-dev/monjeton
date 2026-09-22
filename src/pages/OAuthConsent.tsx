import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Demande d'autorisation invalide (identifiant manquant).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?returnTo=" + encodeURIComponent(next);
        return;
      }
      const { data, error: err } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune redirection renvoyée par le serveur d'autorisation.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "cette application";

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10 gradient-bg">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-5">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-foreground">Connexion impossible</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Chargement de la demande…
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-foreground">Connecter {clientName} à ton compte</h1>
            <p className="text-sm text-muted-foreground">
              {clientName} pourra lire tes transactions, budgets, portefeuilles et catégories, et enregistrer de
              nouvelles dépenses ou revenus à ta place dans Mon Jeton.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 rounded-2xl bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-60"
              >
                Autoriser
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 rounded-2xl bg-secondary text-foreground font-semibold py-3 disabled:opacity-60"
              >
                Refuser
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default OAuthConsent;
