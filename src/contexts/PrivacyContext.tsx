import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { formatMoneySmart } from "@/lib/formatMoney";

const PIN_STORAGE_KEY = "track_emoney_pin";
const SALT = "monjeton_2025_salt_";

const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(SALT + pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

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
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    const discreet = localStorage.getItem("track_emoney_discreet") === "true";
    setPinEnabled(!!storedHash);
    setIsLocked(!!storedHash);
    setIsDiscreetMode(discreet);
  }, []);

  const unlock = (pin: string): boolean => {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (hashPin(pin) === storedHash) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lock = () => {
    if (pinEnabled) setIsLocked(true);
  };

  const setPin = (newPin: string) => {
    localStorage.setItem(PIN_STORAGE_KEY, hashPin(newPin));
    setPinEnabled(true);
    setIsLocked(false);
  };

  const removePin = () => {
    localStorage.removeItem(PIN_STORAGE_KEY);
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
    return formatMoneySmart(amount);
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
