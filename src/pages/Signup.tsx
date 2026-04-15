import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, validatePasswordStrength, sanitizeText } from "@/lib/security";
import { lovable } from "@/integrations/lovable/index";
import logoImg from "@/assets/logo-monjeton.png";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
      toast({ title: "Compte créé ! ✅", description: "Bienvenue sur Mon Jeton 🎉" });
      navigate("/dashboard", { replace: true });
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

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const googleIcon = (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  return (
    <>
      {/* ═══════════ MOBILE ═══════════ */}
      <div className="flex md:hidden min-h-screen items-center justify-center bg-background px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="glass rounded-2xl p-7 border border-border/50">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg mb-3 ring-2 ring-primary/20">
                <img src={logoImg} alt="Mon Jeton" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Créer ton compte 🚀</h1>
              <p className="text-sm text-muted-foreground mt-1">Commence à suivre tes finances</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name-mobile" className="text-xs text-muted-foreground">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="name-mobile" placeholder="Kouadio Jean" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 bg-secondary border-border rounded-xl h-12" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-mobile" className="text-xs text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email-mobile" type="email" placeholder="ton@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-secondary border-border rounded-xl h-12" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-mobile" className="text-xs text-muted-foreground">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password-mobile" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-secondary border-border rounded-xl h-12" required />
                  {passwordToggle}
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full rounded-xl" disabled={loading}>
                {loading ? "Création..." : "Créer mon compte"}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button type="button" variant="outline" size="lg" className="w-full rounded-xl gap-2" onClick={handleGoogleSignIn} disabled={googleLoading}>
              {googleIcon}
              {googleLoading ? "Connexion..." : "Continuer avec Google"}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Déjà un compte ?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ DESKTOP ═══════════ */}
      <div className="hidden md:flex min-h-screen" style={{ background: "#05070A" }}>
        {/* Left column — visual */}
        <div className="relative w-1/2 overflow-hidden flex flex-col justify-end p-16">
          {/* Vertical lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0"
              style={{
                left: `${i * 60}px`,
                width: "60px",
                background: "linear-gradient(to top, rgba(126,200,69,0.15) 0%, rgba(126,200,69,0.05) 40%, transparent 70%)",
                backdropFilter: "blur(1px)",
                opacity: 0.6,
              }}
            />
          ))}

          {/* Green blob */}
          <div
            className="absolute"
            style={{
              bottom: "-80px",
              left: "-40px",
              width: "420px",
              height: "420px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(126,200,69,0.55) 0%, rgba(126,200,69,0.20) 40%, transparent 70%)",
              filter: "blur(30px)",
              zIndex: 1,
            }}
          />

          {/* Teal blob */}
          <div
            className="absolute"
            style={{
              bottom: "20px",
              left: "80px",
              width: "200px",
              height: "120px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,210,180,0.35) 0%, transparent 70%)",
              filter: "blur(25px)",
              zIndex: 1,
            }}
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #05070A 0%, transparent 40%)", zIndex: 2 }} />

          {/* Slogan */}
          <div className="relative z-10">
            <h2 className="text-4xl font-bold text-white leading-tight mb-3">
              Tu vas voir clair<br />dans ton jeton.
            </h2>
            <p className="text-muted-foreground text-base max-w-md">
              La première app de finances personnelles pensée pour l'Afrique de l'Ouest.
            </p>
          </div>
        </div>

        {/* Right column — form */}
        <div className="w-1/2 flex items-center justify-center" style={{ background: "#0A0D12" }}>
          <div className="w-full max-w-md px-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg mb-4 ring-2 ring-primary/20">
                <img src={logoImg} alt="Mon Jeton" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl font-bold text-white">Créer ton compte</h1>
              <p className="text-muted-foreground text-sm mt-2">Commence à suivre tes finances</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name-desktop" className="text-xs text-muted-foreground">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="name-desktop"
                    placeholder="Kouadio Jean"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#12151A", border: "1px solid #1E2330" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-desktop" className="text-xs text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="email-desktop"
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#12151A", border: "1px solid #1E2330" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password-desktop" className="text-xs text-muted-foreground">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="password-desktop"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 pl-11 pr-11 rounded-xl text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#12151A", border: "1px solid #1E2330" }}
                  />
                  {passwordToggle}
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full rounded-xl mt-2" disabled={loading}>
                {loading ? "Création..." : "Créer mon compte"}
              </Button>
            </form>

            {/* Separator */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: "#1E2330" }} />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px" style={{ background: "#1E2330" }} />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5 disabled:opacity-50"
              style={{ border: "1px solid #1E2330" }}
            >
              {googleIcon}
              {googleLoading ? "Connexion..." : "Continuer avec Google"}
            </button>

            {/* Link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Déjà un compte ?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
