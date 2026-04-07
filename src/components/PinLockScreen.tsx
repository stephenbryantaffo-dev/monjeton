import { useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo-monjeton.png";

const MAX_ATTEMPTS_SOFT = 5;
const MAX_ATTEMPTS_HARD = 10;
const LOCKOUT_MS = 30_000;

const PinLockScreen = () => {
  const { unlock } = usePrivacy();
  const { signOut } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const startLockout = useCallback(() => {
    setBlocked(true);
    setLockoutSeconds(30);
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setBlocked(false);
          setAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleDigit = (d: string) => {
    if (blocked || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (unlock(next)) {
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(true);

        if (newAttempts >= MAX_ATTEMPTS_HARD) {
          signOut();
          return;
        }

        if (newAttempts >= MAX_ATTEMPTS_SOFT) {
          startLockout();
        }

        setTimeout(() => { setPin(""); setError(false); }, 600);
      }
    }
  };

  const handleDelete = () => {
    if (!blocked) setPin(pin.slice(0, -1));
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-5">
      <img src={logoImg} alt="Mon Jeton" className="h-16 w-auto rounded-xl mb-4" fetchPriority="high" />
      <h1 className="text-xl font-bold text-foreground mb-2">Mon Jeton</h1>
      <p className="text-sm text-muted-foreground mb-8">Entrez votre code PIN</p>

      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? (error ? "bg-destructive" : "bg-primary neon-glow") : "bg-secondary border border-border"}`} />
        ))}
      </div>

      {blocked ? (
        <div className="text-center mb-6">
          <p className="text-destructive font-semibold text-sm">Trop de tentatives échouées</p>
          <p className="text-muted-foreground text-xs mt-1">Réessayez dans {lockoutSeconds}s</p>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3 w-64">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Button key={d} variant="glass" size="lg" className="text-xl font-semibold h-14" onClick={() => handleDigit(String(d))} disabled={blocked}>
            {d}
          </Button>
        ))}
        <div />
        <Button variant="glass" size="lg" className="text-xl font-semibold h-14" onClick={() => handleDigit("0")} disabled={blocked}>0</Button>
        <Button variant="ghost" size="lg" className="text-sm h-14" onClick={handleDelete} disabled={blocked}>←</Button>
      </div>

      {error && !blocked && <p className="text-destructive text-sm mt-4">Code incorrect ({MAX_ATTEMPTS_SOFT - attempts > 0 ? `${MAX_ATTEMPTS_SOFT - attempts} essais restants` : "blocage..."})</p>}
    </div>
  );
};

export default PinLockScreen;
