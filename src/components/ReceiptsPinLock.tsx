import { useState, useCallback } from "react";
import { Lock, X } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ReceiptsPinLockProps {
  onUnlocked: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30;

const ReceiptsPinLock = ({ onUnlocked }: ReceiptsPinLockProps) => {
  const { unlock } = usePrivacy();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [blockedSeconds, setBlockedSeconds] = useState(0);

  const startLockout = useCallback(() => {
    setBlocked(true);
    setBlockedSeconds(LOCKOUT_MS);
    const interval = setInterval(() => {
      setBlockedSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setBlocked(false);
          setAttempts(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const handleDigit = (d: string) => {
    if (blocked || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      unlock(next).then((success) => {
        if (success) {
          onUnlocked();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError(true);

          if (newAttempts >= MAX_ATTEMPTS) {
            startLockout();
          }

          setTimeout(() => {
            setPin("");
            setError(false);
          }, 600);
        }
      });
    }
  };

  const handleDelete = () => {
    if (!blocked) setPin(pin.slice(0, -1));
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-5 relative">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-5 w-10 h-10 rounded-full glass flex items-center justify-center"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Lock icon */}
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-5 neon-glow">
        <Lock className="w-8 h-8 text-primary-foreground" />
      </div>

      <h1 className="text-xl font-bold text-foreground mb-1">Mes Reçus</h1>
      <p className="text-sm text-muted-foreground mb-8 text-center">
        {blocked
          ? `Trop de tentatives. Réessaie dans ${blockedSeconds}s`
          : "Entre ton code PIN pour accéder à tes reçus"}
      </p>

      {/* PIN dots */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < pin.length
                ? error
                  ? "bg-destructive"
                  : "bg-primary neon-glow"
                : "bg-secondary border border-border"
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Button
            key={d}
            variant="glass"
            size="lg"
            className="text-xl font-semibold h-14"
            onClick={() => handleDigit(String(d))}
            disabled={blocked}
          >
            {d}
          </Button>
        ))}
        <div />
        <Button
          variant="glass"
          size="lg"
          className="text-xl font-semibold h-14"
          onClick={() => handleDigit("0")}
          disabled={blocked}
        >
          0
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="text-sm h-14"
          onClick={handleDelete}
          disabled={blocked}
        >
          ←
        </Button>
      </div>

      {/* Error message */}
      {error && !blocked && (
        <p className="text-destructive text-sm mt-4">
          Code incorrect · {MAX_ATTEMPTS - attempts} essai
          {MAX_ATTEMPTS - attempts > 1 ? "s" : ""} restant
          {MAX_ATTEMPTS - attempts > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
};

export default ReceiptsPinLock;
