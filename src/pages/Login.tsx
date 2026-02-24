import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkRateLimit, resetRateLimit } from "@/lib/security";

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

    // Rate limiting
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
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    } else {
      resetRateLimit(`login:${email}`);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <header className="px-5 py-4">
        <Link to="/" className="text-xl font-bold text-gradient">Mon Jeton</Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Bon retour 👋</h1>
            <p className="text-muted-foreground">Connecte-toi à ton compte</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
            </div>

            <Button variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <button
            type="button"
            onClick={async () => {
              if (!email) {
                toast({ title: "Entre ton email", description: "Remplis le champ email avant de réinitialiser.", variant: "destructive" });
                return;
              }
              const { error } = await (await import("@/integrations/supabase/client")).supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/reset-password",
              });
              if (error) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
              } else {
                toast({ title: "Email envoyé ✅", description: "Vérifie ta boîte mail pour réinitialiser ton mot de passe." });
              }
            }}
            className="w-full text-center text-sm text-primary hover:underline mt-2"
          >
            Mot de passe oublié ?
          </button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">S'inscrire</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
