import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Wallet, Tag, Target, CreditCard, LogOut, ChevronRight, MessageCircle, Shield, Lock, EyeOff } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { icon: Wallet, label: "Portefeuilles", path: "/wallets" },
  { icon: Tag, label: "Catégories", path: "/categories" },
  { icon: Target, label: "Épargne", path: "/savings" },
  { icon: Shield, label: "Dettes", path: "/debts" },
  { icon: MessageCircle, label: "Assistant IA", path: "/assistant" },
  { icon: CreditCard, label: "Abonnement", path: "/subscribe" },
];

const Settings = () => {
  const { user, profile, signOut } = useAuth();
  const { pinEnabled, isDiscreetMode, setPin, removePin, toggleDiscreetMode } = usePrivacy();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSetPin = () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({ title: "Le PIN doit contenir 4 chiffres", variant: "destructive" });
      return;
    }
    setPin(newPin);
    setNewPin("");
    setShowPinSetup(false);
    toast({ title: "Code PIN activé 🔒" });
  };

  const handleRemovePin = () => {
    removePin();
    toast({ title: "Code PIN désactivé" });
  };

  return (
    <DashboardLayout title="Paramètres">
      <div className="glass-card rounded-2xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
          <User className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{profile?.full_name || "Utilisateur"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Privacy section */}
      <div className="glass-card rounded-2xl p-4 mb-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4" /> Confidentialité
        </h3>

        {/* Discreet mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Mode discret</span>
          </div>
          <Switch checked={isDiscreetMode} onCheckedChange={toggleDiscreetMode} />
        </div>

        {/* PIN lock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Verrouillage PIN</span>
          </div>
          {pinEnabled ? (
            <Button variant="ghost" size="sm" onClick={handleRemovePin} className="text-destructive text-xs">Désactiver</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowPinSetup(true)} className="text-primary text-xs">Activer</Button>
          )}
        </div>

        {showPinSetup && (
          <div className="flex gap-2">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="4 chiffres"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              className="bg-secondary border-border flex-1"
            />
            <Button variant="hero" size="sm" onClick={handleSetPin}>OK</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowPinSetup(false); setNewPin(""); }}>✕</Button>
          </div>
        )}
      </div>

      <div className="space-y-1 mb-6">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path} className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className="w-full glass-card rounded-xl p-3.5 flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-colors">
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Se déconnecter</span>
      </button>
    </DashboardLayout>
  );
};

export default Settings;
