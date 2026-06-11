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
    const { error } = await signUp(email, password, safeName);
    setLoading(false);

    if (error) {
      const m = (error?.message || '').toLowerCase();
      let desc = "Réessaie dans un instant.";

      if (m.includes('already') || m.includes('registered')
          || m.includes('user already') || m.includes('exists')) {
        const { error: loginError } = await signIn(email, password);
        if (!loginError) {
          toast({ title: "Connexion réussie ✅", description: "Ce compte existait déjà, tu es connecté." });
          navigate(returnTo, { replace: true });
          return;
        }

        desc = "Cet email existe déjà. Connecte-toi, ou réinitialise le mot de passe si tu ne l'as pas.";
        setExistingAccountEmail(email.trim());
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
