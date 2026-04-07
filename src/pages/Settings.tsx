import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Wallet, Tag, Target, CreditCard, LogOut, ChevronRight, MessageCircle, Shield, Lock, EyeOff, Camera, PieChart, Users, Download, Trash2, FileText, ShieldCheck, Award, Globe, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountry } from "@/contexts/CountryContext";
import { COUNTRIES } from "@/lib/i18n";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BADGES_CI } from "@/lib/badgeCalculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const menuItems = [
  { icon: Camera, label: "Scanner (OCR)", path: "/scan" },
  { icon: FileText, label: "Mes Reçus", sublabel: "Historique et audit", path: "/receipts" },
  { icon: Wallet, label: "Portefeuilles", path: "/wallets" },
  { icon: Tag, label: "Catégories", path: "/categories" },
  { icon: Target, label: "Épargne", path: "/savings" },
  { icon: Shield, label: "Dettes", path: "/debts" },
  { icon: PieChart, label: "Budgets", path: "/budgets" },
  { icon: Users, label: "Tontine", path: "/tontine" },
  { icon: MessageCircle, label: "Assistant IA", path: "/assistant" },
  { icon: BarChart3, label: "Bourse BRVM", path: "/brvm" },
  { icon: CreditCard, label: "Abonnement", path: "/subscribe" },
  { icon: Download, label: "Installer l'app", path: "/install" },
];

const Settings = () => {
  const { user, profile, signOut } = useAuth();
  const { pinEnabled, isDiscreetMode, setPin, removePin, toggleDiscreetMode } = usePrivacy();
  const { country, setCountry } = useCountry();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [earnedBadges, setEarnedBadges] = useState<{ badge_id: string; month: number; year: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("monthly_badges")
      .select("badge_id, month, year")
      .eq("user_id", user.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .then(({ data }) => {
        if (data) setEarnedBadges(data);
      });
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSetPin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({ title: "Le PIN doit contenir 4 chiffres", variant: "destructive" });
      return;
    }
    await setPin(newPin);
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

      {/* Country & Language */}
      <div className="glass-card rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4" /> Pays & Langue
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{country.flag} {country.name}</p>
            <p className="text-xs text-muted-foreground">{country.currency} · {country.lang === "fr" ? "Français" : "English"}</p>
          </div>
          <Select
            value={country.code}
            onValueChange={(code) => {
              const found = COUNTRIES.find(c => c.code === code);
              if (found) setCountry(found);
            }}
          >
            <SelectTrigger className="w-auto gap-2 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <span className="flex-1 text-sm font-medium text-foreground flex items-center gap-1">
              {item.label}
              {item.path === "/receipts" && pinEnabled && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Mes badges */}
      <div className="glass-card rounded-2xl p-4 mb-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Award className="w-4 h-4" /> Mes badges
        </h3>
        {earnedBadges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun badge obtenu pour le moment. Continue à noter tes dépenses !</p>
        ) : (
          <div className="space-y-2">
            {earnedBadges.map((b, i) => {
              const badge = BADGES_CI[b.badge_id];
              if (!badge) return null;
              const monthName = new Date(b.year, b.month - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/50">
                  <span className="text-2xl">{badge.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{badge.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{monthName}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legal links */}
      <div className="space-y-1 mb-4">
        <Link to="/privacy" className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground">Politique de confidentialité</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/terms" className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground">Conditions d'utilisation</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      <button onClick={handleLogout} className="w-full glass-card rounded-xl p-3.5 flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-colors mb-3">
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Se déconnecter</span>
      </button>

      {/* Delete account */}
      <AlertDialog onOpenChange={(open) => { if (!open) setConfirmPassword(""); }}>
        <AlertDialogTrigger asChild>
          <button className="w-full glass-card rounded-xl p-3.5 flex items-center gap-3 text-destructive/70 hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-5 h-5" />
            <span className="text-sm font-medium">Supprimer mon compte</span>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
          <AlertDialogDescription>
              Cette action est <strong>irréversible</strong>. Toutes vos données (transactions, portefeuilles, budgets, épargnes, etc.) seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Confirmez votre mot de passe :</p>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Votre mot de passe actuel"
              className="bg-secondary border-border"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !confirmPassword}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setDeleting(true);
                try {
                  // Re-authenticate before deletion
                  const { error: authError } = await supabase.auth.signInWithPassword({
                    email: user!.email!,
                    password: confirmPassword,
                  });
                  if (authError) {
                    toast({ title: "Mot de passe incorrect", variant: "destructive" });
                    setDeleting(false);
                    return;
                  }
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await supabase.functions.invoke("delete-account", {
                    headers: { Authorization: `Bearer ${session?.access_token}` },
                  });
                  if (res.error) throw res.error;
                  toast({ title: "Compte supprimé. Au revoir 👋" });
                  await signOut();
                  navigate("/");
                } catch {
                  toast({ title: "Erreur lors de la suppression", variant: "destructive" });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Suppression…" : "Oui, supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default Settings;
