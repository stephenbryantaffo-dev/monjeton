import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, resetRateLimit } from "@/lib/security";
import logoImg from "@/assets/logo-monjeton.webp";
import { lovable } from "@/integrations/lovable";
import {
  AnimatedInput,
  AnimatedForm,
  BoxReveal,
  Ripple,
  OrbitingCircles,
} from "@/components/ui/animated-login";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

// Mobile money operator colors
const operators = [
  { name: "Wave", color: "#1BA8F0", emoji: "🌊" },
  { name: "Orange Money", color: "#FF6600", emoji: "🟠" },
  { name: "MTN", color: "#FFCC00", emoji: "🟡" },
  { name: "Moov Money", color: "#0066CC", emoji: "🔵" },
];

const Login = () => {
  useDocumentMeta({
    title: "Se connecter — Mon Jeton",
    description: "Connectez-vous à votre compte Mon Jeton pour suivre vos finances en Franc CFA.",
    path: "/login",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    const rl = checkRateLimit(`login:${normalizedEmail}`, 5, 5 * 60 * 1000);
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
    const { error } = await signIn(normalizedEmail, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Email ou mot de passe incorrect",
        description: "Si tu t'es déjà inscrit avec Google sur cet email, utilise “Continuer avec Google”. Sinon utilise “Mot de passe oublié ?”.",
        variant: "destructive",
      });
    } else {
      resetRateLimit(`login:${normalizedEmail}`);
      navigate(searchParams.get("returnTo") || "/dashboard", { replace: true });
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast({
        title: "Entre ton email",
        description: "Remplis le champ email avant de réinitialiser.",
        variant: "destructive",
      });
      return;
    }
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
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

  const handleGoogle = async () => {
    const returnTo = searchParams.get("returnTo") || "/dashboard";
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

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left: Orbital animation (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden"
           style={{ background: "linear-gradient(135deg, hsl(240 20% 8%), hsl(150 20% 6%))" }}>
        <Ripple />

        {/* Central logo */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <img
            src={logoImg}
            alt="Mon Jeton"
            className="w-20 h-20 rounded-2xl shadow-lg"
          />
          <span className="mt-3 text-lg font-bold text-foreground">Mon Jeton</span>
        </motion.div>

        {/* Orbiting operator circles */}
        {operators.map((op, i) => (
          <OrbitingCircles
            key={op.name}
            radius={140 + (i % 2) * 60}
            duration={18 + i * 4}
            delay={i * 1.5}
            reverse={i % 2 === 1}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-lg border border-white/10"
              style={{ background: op.color }}
              title={op.name}
            >
              {op.emoji}
            </div>
          </OrbitingCircles>
        ))}

        {/* Decorative glow */}
        <div className="absolute w-72 h-72 rounded-full bg-primary/5 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <motion.div
            className="flex items-center gap-2 mb-8 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/" className="flex items-center gap-2">
              <img src={logoImg} alt="Mon Jeton" className="h-9 w-auto rounded-lg" />
              <span className="text-xl font-bold text-primary">Mon Jeton</span>
            </Link>
          </motion.div>

          {/* Glass card */}
          <motion.div
            className="glass rounded-2xl p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <BoxReveal delay={0.1}>
                <h1 className="text-3xl font-bold text-foreground">
                  Bienvenue sur Mon Jeton
                </h1>
              </BoxReveal>
              <BoxReveal delay={0.25}>
                <p className="text-muted-foreground mt-2">
                  Gérez votre argent mobile money
                </p>
              </BoxReveal>
            </div>

            <AnimatedForm onSubmit={handleSubmit}>
              <AnimatedInput
                label="Email"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <AnimatedInput
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-foreground transition-colors"
                    aria-label="Afficher/Masquer le mot de passe"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                required
              />

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </motion.div>
            </AnimatedForm>

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
              onClick={handleGoogle}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.2 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              Continuer avec Google
            </Button>

            <motion.div
              className="mt-5 space-y-3 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  to="/signup"
                  className="text-primary hover:underline font-medium"
                >
                  S'inscrire
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
