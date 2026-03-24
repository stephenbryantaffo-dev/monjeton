import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, resetRateLimit } from "@/lib/security";
import logoImg from "@/assets/logo-monjeton.png";
import {
  AnimatedInput,
  AnimatedForm,
  BoxReveal,
  Ripple,
  OrbitingCircles,
} from "@/components/ui/animated-login";

// Mobile money operator colors
const operators = [
  { name: "Wave", color: "#1BA8F0", emoji: "🌊" },
  { name: "Orange Money", color: "#FF6600", emoji: "🟠" },
  { name: "MTN", color: "#FFCC00", emoji: "🟡" },
  { name: "Moov Money", color: "#0066CC", emoji: "🔵" },
];

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      toast({
        title: "Email ou mot de passe incorrect",
        variant: "destructive",
      });
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
