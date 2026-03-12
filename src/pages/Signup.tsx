import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, validatePasswordStrength, sanitizeText } from "@/lib/security";
import SmokeyBackground from "@/components/ui/smokey-background";
import logoImg from "@/assets/logo-monjeton.png";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rl = checkRateLimit("signup", 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      toast({ title: "Trop de tentatives", description: "Réessayez plus tard", variant: "destructive" });
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
    const { error } = await signUp(email, password, safeName);
    setLoading(false);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le compte", variant: "destructive" });
    } else {
      toast({ title: "Compte créé ! ✅", description: "Vérifie ton email pour confirmer ton compte." });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      <SmokeyBackground color="#16a34a" />

      <div className="relative z-10 w-[90%] max-w-sm p-6 sm:p-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img src={logoImg} alt="Mon Jeton" className="w-16 h-16 rounded-2xl shadow-lg" />
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-white text-center">
          Créer ton compte 🚀
        </h1>
        <p className="text-gray-300 text-sm text-center mt-2 mb-8">
          Commence à suivre tes finances
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full name */}
          <div className="relative">
            <input
              type="text"
              id="signup-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder=" "
              className="peer w-full bg-transparent border-b-2 border-white/30 text-white py-3 pl-8 pr-3 outline-none transition-colors focus:border-[#7EC845]"
            />
            <label
              htmlFor="signup-name"
              className="absolute left-8 top-3 text-gray-400 text-sm transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-[#7EC845] peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#7EC845] flex items-center gap-1"
            >
              <User className="w-4 h-4 inline" /> Nom complet
            </label>
          </div>

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              id="signup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=" "
              className="peer w-full bg-transparent border-b-2 border-white/30 text-white py-3 pl-8 pr-3 outline-none transition-colors focus:border-[#7EC845]"
            />
            <label
              htmlFor="signup-email"
              className="absolute left-8 top-3 text-gray-400 text-sm transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-[#7EC845] peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#7EC845] flex items-center gap-1"
            >
              <Mail className="w-4 h-4 inline" /> Email
            </label>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder=" "
                className="peer w-full bg-transparent border-b-2 border-white/30 text-white py-3 pl-8 pr-10 outline-none transition-colors focus:border-[#7EC845]"
              />
              <label
                htmlFor="signup-password"
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
            <PasswordStrengthIndicator password={password} />
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
                Création...
              </>
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-gray-300 mt-6">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-[#7EC845] hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
