import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Subscribe = () => (
  <div className="min-h-screen gradient-bg flex flex-col">
    <header className="px-5 py-4">
      <Link to="/" className="text-xl font-bold text-gradient">Track E-Money</Link>
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

export default Subscribe;
