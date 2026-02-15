import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PrivacyContextType {
  isLocked: boolean;
  isDiscreetMode: boolean;
  pinEnabled: boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
  setPin: (pin: string) => void;
  removePin: () => void;
  toggleDiscreetMode: () => void;
  formatAmount: (amount: number) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider = ({ children }: { children: ReactNode }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isDiscreetMode, setIsDiscreetMode] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  useEffect(() => {
    const storedPin = localStorage.getItem("track_emoney_pin");
    const discreet = localStorage.getItem("track_emoney_discreet") === "true";
    setPinEnabled(!!storedPin);
    setIsLocked(!!storedPin);
    setIsDiscreetMode(discreet);
  }, []);

  const unlock = (pin: string): boolean => {
    const storedPin = localStorage.getItem("track_emoney_pin");
    if (pin === storedPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lock = () => {
    if (pinEnabled) setIsLocked(true);
  };

  const setPin = (newPin: string) => {
    localStorage.setItem("track_emoney_pin", newPin);
    setPinEnabled(true);
    setIsLocked(false);
  };

  const removePin = () => {
    localStorage.removeItem("track_emoney_pin");
    setPinEnabled(false);
    setIsLocked(false);
  };

  const toggleDiscreetMode = () => {
    const next = !isDiscreetMode;
    setIsDiscreetMode(next);
    localStorage.setItem("track_emoney_discreet", String(next));
  };

  const formatAmount = (amount: number): string => {
    if (isDiscreetMode) return "•••••";
    return amount.toLocaleString("fr-FR");
  };

  return (
    <PrivacyContext.Provider value={{ isLocked, isDiscreetMode, pinEnabled, unlock, lock, setPin, removePin, toggleDiscreetMode, formatAmount }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error("usePrivacy must be used within PrivacyProvider");
  return context;
};
