import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logoImg from "@/assets/logo-monjeton.png";

const features = [
  "Transactions illimitées",
  "Multi-portefeuilles (Orange, MTN, Wave...)",
  "Rapports mensuels et annuels",
  "Export PDF",
  "Catégories personnalisées",
  "Objectifs d'épargne",
  "Suivi des dettes",
  "Assistant IA financier",
  "Budgets & alertes",
];

const Pricing = () => {
  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="Mon Jeton" className="h-9 w-auto rounded-lg" />
          <span className="text-xl font-bold text-gradient">Mon Jeton</span>
        </Link>
        <Link to="/login">
          <Button variant="ghost" size="sm">Connexion</Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Un seul plan. Tout inclus.</h1>
            <p className="text-muted-foreground">Pas de surprise, pas de frais cachés.</p>
          </div>

          <div className="glass-card rounded-2xl p-6 neon-glow">
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-bold mb-4">PRO</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-foreground">2 000</span>
                <span className="text-lg text-muted-foreground">FCFA</span>
              </div>
              <p className="text-muted-foreground text-sm">/ mois</p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link to="/signup">
              <Button variant="hero" size="lg" className="w-full">
                Commencer maintenant
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Pricing;
