import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { COUNTRIES } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { openJekoPro, openJekoMax } from "@/lib/jeko";
import logoImg from "@/assets/logo-monjeton.webp";

const Subscribe = () => {
  const { isAdmin, user } = useAuth();
  const { country, setCountry } = useCountry();

  if (isAdmin) return <Navigate to="/dashboard" replace />;

  const handleSubscribe = (plan: "pro" | "max") => {
    if (!user) {
      // Forcer signup d'abord pour que l'email Jèko corresponde au compte
      window.location.href = "/signup";
      return;
    }
    plan === "pro" ? openJekoPro() : openJekoMax();
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="Mon Jeton" className="h-9 w-auto rounded-lg" />
          <span className="text-xl font-bold text-gradient">Mon Jeton</span>
        </Link>
        <Select
          value={country.code}
          onValueChange={(code) => {
            const found = COUNTRIES.find(c => c.code === code);
            if (found) setCountry(found);
          }}
        >
          <SelectTrigger className="w-auto gap-2 bg-secondary border-border">
            <SelectValue>{country.flag} {country.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <div className="text-5xl">🪙</div>
            <h1 className="text-2xl font-bold text-foreground">Choisis ton plan</h1>
            <p className="text-sm text-muted-foreground">Paiement sécurisé via Jèko (Mobile Money & Carte)</p>
          </div>

          {/* Plan Gratuit */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-foreground">Gratuit</h2>
              <span className="text-2xl font-black text-foreground">0 F</span>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>✓ Suivi des transactions de base</li>
              <li>✓ 5 scans de reçus / mois</li>
              <li>✓ 1 portefeuille</li>
            </ul>
          </div>

          {/* Plan Pro */}
          <div className="glass-card rounded-2xl p-5 space-y-4 neon-glow border border-primary/40">
            <div className="flex items-center justify-between">
              <span className="inline-block px-3 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-bold">
                ⭐ PRO
              </span>
              <div className="text-right">
                <div className="text-2xl font-black text-foreground">2 000 F</div>
                <div className="text-xs text-muted-foreground">/ mois</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li>✓ Transactions illimitées</li>
              <li>✓ Scan IA des reçus (50 / mois)</li>
              <li>✓ Assistant IA financier</li>
              <li>✓ Rapports & exports PDF</li>
              <li>✓ Tontines & dettes</li>
            </ul>
            <Button onClick={() => handleSubscribe("pro")} variant="hero" size="lg" className="w-full">
              Payer 2 000 F via Jèko
            </Button>
          </div>

          {/* Plan Ultra Pro / Max */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-block px-3 py-1 rounded-full bg-foreground text-background text-xs font-bold">
                💎 ULTRA PRO
              </span>
              <div className="text-right">
                <div className="text-2xl font-black text-foreground">5 000 F</div>
                <div className="text-xs text-muted-foreground">/ mois</div>
              </div>
            </div>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li>✓ Tout ce qui est dans Pro</li>
              <li>✓ Scan IA illimité</li>
              <li>✓ Support prioritaire</li>
              <li>✓ Accès en avant-première aux nouvelles features</li>
            </ul>
            <Button onClick={() => handleSubscribe("max")} size="lg" className="w-full gradient-primary text-primary-foreground">
              Payer 5 000 F via Jèko
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Après paiement, ton accès est activé sous 2 minutes.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;
