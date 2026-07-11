import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      title: "Email envoyé ✅",
      description: "Vérifie ta boîte mail pour définir un nouveau mot de passe.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting
    const rl = checkRateLimit("signup", 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      toast({ title: "Trop de tentatives", description: `Réessayez plus tard`, variant: "destructive" });
      return;
    }

    // Password strength
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.strong) {
      toast({ title: "Mot de passe faible", description: pwCheck.errors.join(", "), variant: "destructive" });
      return;
    }

    // Sanitize name
    const safeName = sanitizeText(fullName).slice(0, 100);
    if (!safeName) {
      toast({ title: "Nom invalide", variant: "destructive" });
      return;
    }

    setLoading(true);
    setExistingAccountEmail("");
    const normalizedEmail = email.trim().toLowerCase();

    // Pre-check: if an account already uses Google for this email,
    // don't try to create a second email/password account.
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
          toast({ title: "Connexion réussie ✅", description: "Ce compte existait déjà, tu es connecté." });
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
      toast({ title: "Compte créé ! ✅", description: "Bienvenue sur Mon Jeton 🎉" });
      if (returnTo.startsWith('/rejoindre-caisse/')) {
        localStorage.setItem('post_onboarding_redirect', returnTo);
        localStorage.setItem('invite_context', 'caisse');
      }
      navigate(returnTo, { replace: true });
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <header className="px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="Mon Jeton" className="h-9 w-auto rounded-lg" />
          <span className="text-xl font-bold text-gradient">Mon Jeton</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Créer ton compte 🚀</h1>
            <p className="text-muted-foreground">Commence à suivre tes finances</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" placeholder="Kouadio Jean" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 bg-secondary border-border" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="ton@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-secondary border-border" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-secondary border-border" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Afficher/Masquer le mot de passe" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <Button variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Création..." : "Créer mon compte"}
            </Button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full mt-4 gap-2"
            onClick={async () => {
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
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.2 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            S'inscrire avec Google
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full mt-3 gap-2"
            onClick={async () => {
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
            }}
          >
            <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            S'inscrire avec Apple
          </Button>

          {existingAccountEmail && (
            <div className="mt-4 rounded-lg border border-border bg-secondary/60 p-4 text-sm space-y-3">
              <p className="text-foreground font-medium">Ce compte existe déjà.</p>
              <p className="text-muted-foreground">Essaie de te connecter avec cet email, ou change le mot de passe si tu ne t'en souviens plus.</p>
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

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Signup;
