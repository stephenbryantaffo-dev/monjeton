import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@/assets/logo-monjeton.png";

const Subscribe = () => {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <header className="px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="Mon Jeton" className="h-9 w-auto rounded-lg" />
          <span className="text-xl font-bold text-gradient">Mon Jeton</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Abonnement requis</h1>
          <p className="text-muted-foreground mb-6">
            Abonne-toi au plan Pro pour débloquer toutes les fonctionnalités à seulement 2 000 FCFA / mois.
          </p>
          <Link to="/pricing">
            <Button variant="hero" size="lg" className="w-full">Voir les tarifs</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;