import { useState } from "react";
import { Lock } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Button } from "@/components/ui/button";

const PinLockScreen = () => {
  const { unlock } = usePrivacy();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (!unlock(next)) {
        setError(true);
        setTimeout(() => { setPin(""); setError(false); }, 600);
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-5">
      <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-6 neon-glow">
        <Lock className="w-8 h-8 text-primary-foreground" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">Track E-Money</h1>
      <p className="text-sm text-muted-foreground mb-8">Entrez votre code PIN</p>

      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? (error ? "bg-destructive" : "bg-primary neon-glow") : "bg-secondary border border-border"}`} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-64">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Button key={d} variant="glass" size="lg" className="text-xl font-semibold h-14" onClick={() => handleDigit(String(d))}>
            {d}
          </Button>
        ))}
        <div />
        <Button variant="glass" size="lg" className="text-xl font-semibold h-14" onClick={() => handleDigit("0")}>0</Button>
        <Button variant="ghost" size="lg" className="text-sm h-14" onClick={handleDelete}>←</Button>
      </div>

      {error && <p className="text-destructive text-sm mt-4">Code incorrect</p>}
    </div>
  );
};

export default PinLockScreen;
