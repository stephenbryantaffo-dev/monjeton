import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, validatePasswordStrength, sanitizeText } from "@/lib/security";
import { lovable } from "@/integrations/lovable/index";
import { SmokeyBackground } from "@/components/ui/smokey-background";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rl = checkRateLimit("signup", 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      setError("Trop de tentatives. Réessaye plus tard.");
      return;
    }

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.strong) {
      setError(pwCheck.errors.join(", "));
      return;
    }

    const safeName = sanitizeText(fullName).slice(0, 100);
    if (!safeName) {
      setError("Nom invalide.");
      return;
    }

    setLoading(true);
    setError("");
    const { error: err } = await signUp(email, password, safeName);
    if (err) {
      setError("Impossible de créer le compte.");
    } else {
      toast({ title: "Compte créé ! ✅", description: "Bienvenue sur Mon Jeton 🎉" });
      navigate("/dashboard", { replace: true });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Connexion Google échouée.");
        return;
      }
      if (result.redirected) return;
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      <SmokeyBackground
        color1="#030504"
        color2="#7EC845"
        color3="#1a3a0a"
        intensity={1.0}
      />

      <div className="relative z-10 w-full max-w-md px-6 py-10">
        <div
          className="rounded-2xl p-8 backdrop-blur-xl border"
          style={{
            background: "rgba(10, 13, 18, 0.75)",
            borderColor: "rgba(126, 200, 69, 0.15)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(126, 200, 69, 0.12)" }}>
              <span className="text-3xl">🪙</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Créer mon compte</h1>
            <p className="text-sm mt-1" style={{ color: "#8892A4" }}>
              Gratuit, sans carte bancaire
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="relative">
              <UserPlus className="absolute left-0 top-3 w-4 h-4" style={{ color: "#8892A4" }} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder=" "
                required
                className="smokey-input peer"
              />
              <label className="smokey-label">Nom complet</label>
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-0 top-3 w-4 h-4" style={{ color: "#8892A4" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                className="smokey-input peer"
              />
              <label className="smokey-label">Adresse email</label>
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-0 top-3 w-4 h-4" style={{ color: "#8892A4" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                className="smokey-input pr-8 peer"
              />
              <label className="smokey-label">Mot de passe</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-2.5 p-0 bg-transparent border-none cursor-pointer"
                style={{ color: "#8892A4" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />

            {/* Error */}
            {error && (
              <p className="text-sm text-center" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7EC845, #5ba832)",
                color: "#0a0d12",
              }}
            >
              {loading ? "Création..." : "Créer mon compte"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="text-xs" style={{ color: "#8892A4" }}>ou continuer avec</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.92)",
                color: "#1a1a1a",
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? "Connexion..." : "Continuer avec Google"}
            </button>
          </form>

          {/* Link */}
          <p className="text-center text-sm mt-6" style={{ color: "#8892A4" }}>
            Déjà un compte ?{" "}
            <Link to="/login" className="font-medium hover:underline" style={{ color: "#7EC845" }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
