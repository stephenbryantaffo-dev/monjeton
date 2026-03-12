import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, resetRateLimit } from "@/lib/security";
import SmokeyBackground from "@/components/ui/smokey-background";
import logoImg from "@/assets/logo-monjeton.png";

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
        title: "Connexion impossible",
        description: "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    } else {
      resetRateLimit(`login:${email}`);
      navigate("/dashboard");
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      <SmokeyBackground color="#16a34a" />

      {/* Form card */}
      <div className="relative z-10 w-[90%] max-w-sm p-6 sm:p-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img
              src={logoImg}
              alt="Mon Jeton"
              className="w-16 h-16 rounded-2xl shadow-lg"
            />
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white text-center">
          Bienvenue sur Mon Jeton
        </h1>
        <p className="text-gray-300 text-sm text-center mt-2 mb-8">
          Gérez votre argent mobile money
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="relative group">
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=" "
              className="peer w-full bg-transparent border-b-2 border-white/30 text-white py-3 pl-8 pr-3 outline-none transition-colors focus:border-[#7EC845]"
            />
            <label
              htmlFor="login-email"
              className="absolute left-8 top-3 text-gray-400 text-sm transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-[#7EC845] peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#7EC845] flex items-center gap-1"
            >
              <User className="w-4 h-4 inline" /> Email
            </label>
          </div>

          {/* Password */}
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=" "
              className="peer w-full bg-transparent border-b-2 border-white/30 text-white py-3 pl-8 pr-10 outline-none transition-colors focus:border-[#7EC845]"
            />
            <label
              htmlFor="login-password"
              className="absolute left-8 top-3 text-gray-400 text-sm transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-[#7EC845] peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#7EC845] flex items-center gap-1"
            >
              <Lock className="w-4 h-4 inline" /> Mot de passe
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-3 text-gray-400 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Forgot password */}
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="group/btn w-full bg-[#7EC845] hover:bg-[#6ab335] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connexion...
              </>
            ) : (
              <>
                Se connecter
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">ou continuer avec</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Signup link */}
        <p className="text-center text-sm text-gray-300">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="text-[#7EC845] hover:underline font-medium">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
