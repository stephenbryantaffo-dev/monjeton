import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, validatePasswordStrength, sanitizeText } from "@/lib/security";
import logoImg from "@/assets/logo-monjeton.webp";
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
    const { error } = await signUp(email, password, safeName);
    setLoading(false);

    if (error) {
      const m = (error?.message || '').toLowerCase();
      let desc = "Réessaie dans un instant.";

      if (m.includes('already') || m.includes('registered')
          || m.includes('user already') || m.includes('exists')) {
        desc = "Cet email a déjà un compte. Connecte-toi à la place.";
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
      navigate("/dashboard", { replace: true });
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <Button variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Création..." : "Créer mon compte"}
            </Button>
          </form>

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
