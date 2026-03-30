import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { COUNTRIES } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logoImg from "@/assets/logo-monjeton.png";

const Subscribe = () => {
  const { isAdmin } = useAuth();
  const { country, setCountry, t } = useCountry();

  if (isAdmin) return <Navigate to="/dashboard" replace />;

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
            <SelectValue>
              {country.flag} {country.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl">🪙</div>
            <h1 className="text-2xl font-bold text-foreground">{t.pricing_title}</h1>
            <p className="text-sm text-muted-foreground">
              {country.flag} {country.name} · {country.currencySymbol}
            </p>
          </div>

          {/* Plan Gratuit */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">{t.free_plan}</h2>
              <span className="text-2xl font-black text-foreground">0</span>
            </div>
            <ul className="space-y-2">
              {t.features_free.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Plan Pro */}
          <div className="glass-card rounded-2xl p-5 space-y-4 neon-glow">
            <span className="inline-block px-3 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-bold">
              ⭐ PRO
            </span>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-foreground">{t.pro_plan}</h2>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-black text-foreground">
                  {country.subscriptionPrice}
                </span>
                <span className="text-sm text-muted-foreground">
                  {country.currencySymbol}{t.per_month}
                </span>
              </div>
            </div>
            <ul className="space-y-2">
              {t.features_pro.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link to="/signup">
              <Button variant="hero" size="lg" className="w-full">
                {country.lang === "fr" ? "S'abonner maintenant" : "Subscribe now"}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;
