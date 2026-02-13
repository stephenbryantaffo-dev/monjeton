import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, PieChart, Wallet, TrendingUp, Shield, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Wallet,
    title: "Multi-portefeuilles",
    desc: "Orange Money, MTN, Moov, Wave, Cash — tout au même endroit.",
  },
  {
    icon: PieChart,
    title: "Rapports visuels",
    desc: "Graphiques clairs pour comprendre où part ton argent.",
  },
  {
    icon: TrendingUp,
    title: "Objectifs d'épargne",
    desc: "Fixe tes objectifs et suis ta progression facilement.",
  },
  {
    icon: Sparkles,
    title: "Assistant IA",
    desc: "Un coach financier qui te connaît et te conseille.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="text-xl font-bold text-gradient">Track E-Money</Link>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Connexion</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">S'inscrire</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-12 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-lg mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass text-sm text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Application sécurisée 🇨🇮</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            <span className="text-gradient-hero">Tu vas voir clair</span>
            <br />
            <span className="text-foreground">dans ton jeton</span>
            <br />
            <span className="text-foreground">maintenant !</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">
            Suis chaque dépense, chaque revenu. Sais exactement où part ton argent.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button variant="hero" size="lg" className="w-full sm:w-auto">
                Commencer maintenant
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="glass" size="lg" className="w-full sm:w-auto">
                Voir les tarifs
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-5 py-12">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-foreground">
            Tout ce qu'il te faut
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-12">
        <div className="max-w-lg mx-auto glass-card rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Prêt à gérer ton argent ?</h2>
          <p className="text-muted-foreground mb-6">À partir de 2 000 FCFA / mois seulement.</p>
          <Link to="/signup">
            <Button variant="hero" size="lg">
              Créer mon compte
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-8 border-t border-border">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-gradient font-bold text-lg mb-1">Track E-Money</p>
          <p className="text-sm text-muted-foreground italic mb-4">
            "Tu vas voir clair dans ton jeton maintenant !"
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Contact : contact@track-emoney.com</p>
            <p>Support : +225 00 00 00 00</p>
            <p>🌍 Afrique — Côte d'Ivoire</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
