import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, resetRateLimit } from "@/lib/security";
import { lovable } from "@/integrations/lovable/index";
import logoImg from "@/assets/logo-monjeton.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rl = checkRateLimit(`login:${email}`, 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      const seconds = Math.ceil(rl.retryAfterMs / 1000);
      toast({
        title: "Trop de tentatives",
        description: `Réessayez dans ${seconds}s`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ title: "Email ou mot de passe incorrect", variant: "destructive" });
    } else {
      resetRateLimit(`login:${email}`);
      navigate("/dashboard", { replace: true });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Entre ton email",
        description: "Remplis le champ email avant de réinitialiser.",
        variant: "destructive",
      });
      return;
    }
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Email envoyé ✅",
        description: "Vérifie ta boîte mail pour réinitialiser ton mot de passe.",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Erreur Google", description: "Connexion échouée", variant: "destructive" });
        return;
      }
      if (result.redirected) return;
      navigate("/dashboard", { replace: true });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        {/* Glass card */}
        <div className="glass rounded-2xl p-7 border border-border/50">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg mb-3 ring-2 ring-primary/20">
              <img src={logoImg} alt="Mon Jeton" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Mon Jeton</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary border-border rounded-xl h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-secondary border-border rounded-xl h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full rounded-xl" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          {/* Separator */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full rounded-xl gap-2"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? "Connexion..." : "Continuer avec Google"}
          </Button>

          {/* Links */}
          <div className="mt-5 space-y-3 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-primary hover:underline"
            >
              Mot de passe oublié ?
            </button>
            <p className="text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
