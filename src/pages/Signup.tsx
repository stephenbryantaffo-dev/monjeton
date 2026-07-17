import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, ScanLine, Users, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkRateLimit, validatePasswordStrength, sanitizeText } from "@/lib/security";
import logoImg from "@/assets/logo-monjeton.webp";
import { lovable } from "@/integrations/lovable";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { checkAuthMethod, methodMismatchMessage } from "@/lib/auth-helpers";

const Signup = () => {
  useDocumentMeta({
    title: "Créer un compte — Mon Jeton",
    description: "Inscrivez-vous gratuitement à Mon Jeton et commencez à gérer vos finances en FCFA en moins de 2 minutes.",
    path: "/signup",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingAccountEmail, setExistingAccountEmail] = useState("");
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const { toast } = useToast();

  const sendPasswordReset = async (targetEmail: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: window.location.origin + "/reset-password",
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Email envoyé",
      description: "Vérifie ta boîte mail pour définir un nouveau mot de passe.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rl = checkRateLimit("signup", 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      toast({ title: "Trop de tentatives", description: `Réessayez plus tard`, variant: "destructive" });
      return;
    }

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.strong) {
      toast({ title: "Mot de passe faible", description: pwCheck.errors.join(", "), variant: "destructive" });
      return;
    }

    const safeName = sanitizeText(fullName).slice(0, 100);
    if (!safeName) {
      toast({ title: "Nom invalide", variant: "destructive" });
      return;
    }

    setLoading(true);
    setExistingAccountEmail("");
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await checkAuthMethod(normalizedEmail);
    const mismatch = methodMismatchMessage(existing.method, "email");
    if (existing.exists && mismatch) {
      setLoading(false);
      toast({
        title: "Utilise Google pour ce compte",
        description: mismatch,
        variant: "destructive",
        duration: 7000,
      });
      setExistingAccountEmail(normalizedEmail);
      return;
    }

    const { error } = await signUp(normalizedEmail, password, safeName);
    setLoading(false);

    if (error) {
      const m = (error?.message || '').toLowerCase();
      let desc = "Réessaie dans un instant.";

      if (m.includes('already') || m.includes('registered')
          || m.includes('user already') || m.includes('exists')) {
        const { error: loginError } = await signIn(normalizedEmail, password);
        if (!loginError) {
          toast({ title: "Connexion réussie", description: "Ce compte existait déjà, tu es connecté." });
          navigate(returnTo, { replace: true });
          return;
        }

        desc = "Un compte existe déjà avec cet email. Connecte-toi (email/mot de passe ou Google), ou utilise « Mot de passe oublié » si tu ne t'en souviens plus.";
        setExistingAccountEmail(normalizedEmail);
      } else if (m.includes('rate') || m.includes('limit')
                 || m.includes('too many')) {
        desc = "Trop de tentatives. Patiente 5 minutes et réessaie.";
      } else if (m.includes('invalid email')
                 || m.includes('valid email')) {
        desc = "Adresse email invalide. Vérifie l'orthographe.";
      } else if (m.includes('pwned') || m.includes('compromised')
                 || m.includes('hibp') || m.includes('breach')
                 || m.includes('weak password')
                 || m.includes('common password')) {
        desc = "Ce mot de passe a déjà fuité dans une base de données publique. Choisis-en un plus original (évite les mots courants comme Password, 123456, etc.).";
      } else if (m.includes('password should')
                 || m.includes('password must')
                 || m.includes('password length')
                 || m.includes('characters')) {
        desc = "Mot de passe refusé : " + (error?.message || "format invalide");
      } else if (m.includes('network')
                 || m.includes('failed to fetch')
                 || m.includes('timeout')) {
        desc = "Problème de connexion. Vérifie ton réseau et réessaie.";
      } else if (m.includes('disabled') || m.includes('signup')) {
        desc = "Inscription temporairement désactivée.";
      } else if (error?.message) {
        desc = error.message;
      }

      toast({
        title: "Inscription échouée",
        description: desc,
        variant: "destructive",
        duration: 6000,
      });

      console.error('[Signup error]', error);
      return;
    }
    {
      toast({ title: "Compte créé !", description: "Bienvenue sur Mon Jeton." });
      if (returnTo.startsWith('/rejoindre-caisse/')) {
        localStorage.setItem('post_onboarding_redirect', returnTo);
        localStorage.setItem('invite_context', 'caisse');
      }
      navigate(returnTo, { replace: true });
    }
  };

  const handleGoogle = async () => {
    const typed = email.trim().toLowerCase();
    if (typed) {
      const info = await checkAuthMethod(typed);
      const mismatch = methodMismatchMessage(info.method, "google");
      if (info.exists && mismatch) {
        toast({
          title: "Utilise ton mot de passe pour ce compte",
          description: mismatch,
          variant: "destructive",
          duration: 7000,
        });
        return;
      }
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + returnTo,
    });
    if (result.error) {
      toast({ title: "Connexion Google échouée", description: (result.error as any)?.message || "Réessaie.", variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate(returnTo, { replace: true });
  };

  const handleApple = async () => {
    const typed = email.trim().toLowerCase();
    if (typed) {
      const info = await checkAuthMethod(typed);
      const mismatch = methodMismatchMessage(info.method, "apple");
      if (info.exists && mismatch) {
        toast({
          title: "Méthode différente pour ce compte",
          description: mismatch,
          variant: "destructive",
          duration: 7000,
        });
        return;
      }
    }
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin + returnTo,
    });
    if (result.error) {
      toast({ title: "Connexion Apple échouée", description: (result.error as any)?.message || "Réessaie.", variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-[#14171C] text-[#EAFBEA]">
      {/* ── Gauche : panneau marketing (masqué sur mobile) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-center px-14 py-12 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(124,255,58,0.10), transparent 60%), linear-gradient(160deg, #14171C 0%, #101318 100%)",
        }}
      >
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <img src={logoImg} alt="Mon Jeton" className="w-11 h-11 rounded-xl" />
            <span className="text-lg font-extrabold font-display">Mon Jeton</span>
          </div>

          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#7CFF3A] bg-[#7CFF3A]/10 border border-[#7CFF3A]/25 px-3 py-1.5 rounded-full mb-6">
            FCFA · Mobile money · Reçus IA
          </span>

          <h1 className="font-display font-extrabold text-4xl xl:text-5xl leading-[1.05] tracking-tight mb-4">
            Crée ton espace FCFA.
          </h1>
          <p className="text-sm text-[#EAFBEA]/60 leading-relaxed mb-8">
            Suivre ses dépenses, revenus, tontines et objectifs sans confusion —
            en moins de 2 minutes, sans stocker un centime chez nous.
          </p>

          <div className="rounded-2xl border border-white/10 bg-[#0d1512]/70 backdrop-blur p-4 shadow-2xl">
            <div className="flex items-center justify-between text-[11px] text-[#EAFBEA]/45 mb-3">
              <span>Tableau de bord</span>
              <span>Juillet 2026</span>
            </div>

            <div className="rounded-xl border border-[#7CFF3A]/25 bg-[#7CFF3A]/[0.06] p-3 mb-3">
              <div className="text-[11px] text-[#EAFBEA]/55">Dépenses de juillet</div>
              <div className="font-display text-2xl font-extrabold">
                128 500 <span className="text-xs font-semibold text-[#EAFBEA]/50">FCFA</span>
              </div>
              <div className="text-[11px] font-semibold text-[#7CFF3A] mt-0.5">↓ 12% vs juin</div>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
                <div className="text-[10px] text-[#EAFBEA]/50">Revenus</div>
                <div className="text-sm font-extrabold text-[#7CFF3A]">410 000</div>
              </div>
              <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
                <div className="text-[10px] text-[#EAFBEA]/50">Dépenses</div>
                <div className="text-sm font-extrabold">128 500</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] p-2">
                <div className="w-7 h-7 rounded-lg bg-[#7CFF3A]/14 flex items-center justify-center shrink-0">
                  <ScanLine className="w-3.5 h-3.5 text-[#7CFF3A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold">Orange Money</div>
                  <div className="text-[9px] text-[#EAFBEA]/45">Reçu détecté par IA</div>
                </div>
                <div className="text-[11px] font-bold text-[#ff6b6b]">-14 500</div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] p-2">
                <div className="w-7 h-7 rounded-lg bg-[#7CFF3A]/14 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#7CFF3A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold">Tontine Bureau</div>
                  <div className="text-[9px] text-[#EAFBEA]/45">7 membres à jour</div>
                </div>
                <div className="text-[11px] font-bold text-[#7CFF3A]">+50 000</div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] p-2">
                <div className="w-7 h-7 rounded-lg bg-[#7CFF3A]/14 flex items-center justify-center shrink-0">
                  <Target className="w-3.5 h-3.5 text-[#7CFF3A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold">Budget Transport</div>
                  <div className="text-[9px] text-[#EAFBEA]/45">Reste disponible</div>
                </div>
                <div className="text-[11px] font-bold">12 000</div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex gap-1">
                {["OM", "WA", "DJ"].map((o) => (
                  <span key={o} className="w-6 h-6 rounded-md bg-[#7CFF3A]/12 text-[#7CFF3A] text-[9px] font-bold flex items-center justify-center">
                    {o}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-[#EAFBEA]/45">Orange Money, Wave, Djamo et FCFA au même endroit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Droite : formulaire ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
            <img src={logoImg} alt="Mon Jeton" className="h-9 w-auto rounded-lg" />
            <span className="text-xl font-extrabold font-display text-[#7CFF3A]">Mon Jeton</span>
          </Link>

          {/* Onglets Connexion / Inscription */}
          <div className="flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
            <Link
              to={`/login${returnTo !== "/dashboard" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="flex-1 text-center text-sm font-bold py-2.5 rounded-full text-[#EAFBEA]/60 hover:text-[#EAFBEA] transition-colors"
            >
              Connexion
            </Link>
            <span className="flex-1 text-center text-sm font-bold py-2.5 rounded-full bg-[#7CFF3A] text-[#14171C]">
              Inscription
            </span>
          </div>

          <h2 className="font-display text-3xl font-extrabold mb-2">Crée ton compte.</h2>
          <p className="text-sm text-[#EAFBEA]/60 mb-7">
            Commence à suivre tes finances en moins de 2 minutes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom complet */}
            <div>
              <label className="block text-xs font-semibold text-[#EAFBEA]/70 mb-1.5">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EAFBEA]/40" />
                <input
                  type="text"
                  placeholder="Kouadio Jean"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-10 pr-3 py-3 text-sm text-[#EAFBEA] placeholder-[#EAFBEA]/35 outline-none focus:border-[#7CFF3A]/50 focus:bg-white/[0.06] transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#EAFBEA]/70 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EAFBEA]/40" />
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-10 pr-3 py-3 text-sm text-[#EAFBEA] placeholder-[#EAFBEA]/35 outline-none focus:border-[#7CFF3A]/50 focus:bg-white/[0.06] transition-colors"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-semibold text-[#EAFBEA]/70 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EAFBEA]/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-10 pr-10 py-3 text-sm text-[#EAFBEA] placeholder-[#EAFBEA]/35 outline-none focus:border-[#7CFF3A]/50 focus:bg-white/[0.06] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#EAFBEA]/40 hover:text-[#EAFBEA] transition-colors"
                  aria-label="Afficher/Masquer le mot de passe"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#EAFBEA]/50">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7CFF3A]" /> Tes données sont chiffrées et privées
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Création..." : "Créer mon compte"}
            </Button>
          </form>

          {/* Séparateur */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-[#EAFBEA]/40">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Google */}
          <Button type="button" variant="outline" size="lg" className="w-full gap-2" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.2 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            S'inscrire avec Google
          </Button>

          {/* Apple */}
          <Button type="button" variant="outline" size="lg" className="w-full gap-2 mt-3" onClick={handleApple}>
            <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            S'inscrire avec Apple
          </Button>

          {existingAccountEmail && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm space-y-3">
              <p className="text-[#EAFBEA] font-medium">Ce compte existe déjà.</p>
              <p className="text-[#EAFBEA]/60">Essaie de te connecter avec cet email, ou change le mot de passe si tu ne t'en souviens plus.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="hero" onClick={() => navigate(`/login?email=${encodeURIComponent(existingAccountEmail)}`)}>
                  Se connecter
                </Button>
                <Button type="button" variant="outline" onClick={() => sendPasswordReset(existingAccountEmail)}>
                  Mot de passe oublié
                </Button>
              </div>
            </div>
          )}

          <p className="text-sm text-[#EAFBEA]/60 text-center mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-[#7CFF3A] hover:underline font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
