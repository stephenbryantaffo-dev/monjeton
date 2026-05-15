import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Wallet, Tag, Target, CreditCard, LogOut, ChevronRight, MessageCircle, Shield, Lock, EyeOff, Camera, PieChart, Users, Download, Trash2, FileText, ShieldCheck, Award, Globe, BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
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
import { parsePhone, DIAL_CODES } from "@/lib/phoneValidation";
import { CURRENCY_OPTIONS, type CurrencyCode } from "@/lib/currency";
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
  const [confirmText, setConfirmText] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<{ badge_id: string; month: number; year: number }[]>([]);
  const [whatsappAlerts, setWhatsappAlerts] = useState<boolean>(true);
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSavedDisplay, setPhoneSavedDisplay] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<string>(country.code);
  const [currencyPref, setCurrencyPref] = useState<CurrencyCode>("XOF");

  const handleCurrencyChange = async (code: CurrencyCode) => {
    if (!user) return;
    setCurrencyPref(code);
    const { error } = await supabase
      .from("profiles")
      .update({ currency_preference: code } as any)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la devise", variant: "destructive" });
    } else {
      toast({ title: "Devise mise à jour ✅" });
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("whatsapp_alerts, phone, currency_preference")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof (data as any).whatsapp_alerts === "boolean") {
          setWhatsappAlerts((data as any).whatsapp_alerts);
        }
        if (data && (data as any).currency_preference) {
          setCurrencyPref((data as any).currency_preference as CurrencyCode);
        }
        if (data && (data as any).phone) {
          const savedPhone = (data as any).phone as string;
          setPhoneInput(savedPhone);
          setPhoneSavedDisplay(savedPhone);
          // Détecter pays à partir de l'indicatif sauvegardé
          if (savedPhone.startsWith("+")) {
            const digits = savedPhone.slice(1);
            const matched = Object.entries(DIAL_CODES).find(([, d]) => digits.startsWith(d));
            if (matched) setPhoneCountry(matched[0]);
          }
        }
      });
  }, [user]);

  const savePhone = async () => {
    if (!user) return;
    
    const result = parsePhone(phoneInput, phoneCountry);
    if (!result.valid) {
      setPhoneError(result.error || "Numéro invalide");
      return;
    }
    setPhoneError(null);
    setPhoneSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ phone: result.e164 } as any)
      .eq("user_id", user.id);
    setPhoneSaving(false);
    if (error) {
      toast({ title: "Erreur", description: "Numéro non sauvegardé", variant: "destructive" });
      return;
    }
    setPhoneInput(result.display || result.e164!);
    setPhoneSavedDisplay(result.e164);
    toast({ title: "Numéro WhatsApp enregistré ✅", description: result.display || "" });
  };

  const toggleWhatsappAlerts = async (checked: boolean) => {
    if (!user) return;
    setWhatsappAlerts(checked);
    const { error } = await supabase
      .from("profiles")
      .update({ whatsapp_alerts: checked } as any)
      .eq("user_id", user.id);
    if (error) {
      setWhatsappAlerts(!checked);
      toast({ title: "Erreur", description: "Préférence non sauvegardée", variant: "destructive" });
      return;
    }
    toast({ title: checked ? "Alertes activées ✅" : "Alertes désactivées" });
  };

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
        <div
          className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center flex-shrink-0"
          style={{
            overflow: "visible",
            isolation: "isolate",
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
          }}
        >
          <span style={{ display: "block", lineHeight: 0 }}>
            <User className="w-7 h-7 text-primary-foreground" />
          </span>
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

        {/* Numéro WhatsApp */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">Numéro WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Sélectionne le pays puis saisis ton numéro local. Le format international est calculé automatiquement.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={phoneCountry}
              onValueChange={(code) => {
                setPhoneCountry(code);
                setPhoneError(null);
                if (phoneInput) {
                  const r = parsePhone(phoneInput, code);
                  if (r.valid) setPhoneInput(r.display!);
                }
              }}
            >
              <SelectTrigger className="w-[110px] bg-secondary border-border flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.filter(c => DIAL_CODES[c.code]).map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} +{DIAL_CODES[c.code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Ex: 07 12 34 56 78"
              value={phoneInput}
              onChange={(e) => {
                setPhoneError(null);
                const v = e.target.value.replace(/[^\d+\s]/g, "").slice(0, 20);
                setPhoneInput(v);
              }}
              onBlur={() => {
                if (!phoneInput) return;
                const r = parsePhone(phoneInput, phoneCountry);
                if (r.valid) setPhoneInput(r.display!);
                else setPhoneError(r.error || "Numéro invalide");
              }}
              className={`bg-secondary flex-1 min-w-0 ${phoneError ? "border-destructive" : "border-border"}`}
            />
            <Button
              variant="hero"
              size="sm"
              onClick={savePhone}
              disabled={phoneSaving || !phoneInput}
            >
              {phoneSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
            </Button>
          </div>
          {phoneError && <p className="text-xs text-destructive pl-6">{phoneError}</p>}
          {!phoneError && phoneSavedDisplay && (
            <p className="text-xs text-muted-foreground pl-6">Enregistré : {phoneSavedDisplay}</p>
          )}
        </div>

        {/* WhatsApp budget alerts */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">Alertes WhatsApp budget</p>
              <p className="text-xs text-muted-foreground">
                Recevoir un message quand un budget catégorie atteint 80% ou 100%
              </p>
            </div>
          </div>
          <Switch checked={whatsappAlerts} onCheckedChange={toggleWhatsappAlerts} />
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
      <AlertDialog onOpenChange={(open) => { if (!open) { setConfirmPassword(""); setConfirmText(""); setPwdError(false); } }}>
        <AlertDialogTrigger asChild>
          <button className="w-full glass-card rounded-xl p-3.5 flex items-center gap-3 text-destructive/70 hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-5 h-5" />
            <span className="text-sm font-medium">Supprimer mon compte</span>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Supprimer définitivement mon compte ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Cette action est <strong>irréversible</strong>. Toutes tes données seront supprimées :</p>
                <ul className="text-xs space-y-1 pl-4 list-disc">
                  <li>Toutes tes transactions</li>
                  <li>Tes budgets et objectifs</li>
                  <li>Tes reçus scannés</li>
                  <li>Tes tontines et caisses</li>
                  <li>Ton historique complet</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Confirme avec ton mot de passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwdError(false); }}
                placeholder="Mot de passe actuel"
                className={`bg-secondary ${pwdError ? "border-destructive" : "border-border"}`}
              />
              {pwdError && <p className="text-xs text-destructive">Mot de passe incorrect</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Tape <span className="font-bold text-destructive">SUPPRIMER</span> pour confirmer
              </Label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !confirmPassword || confirmText !== "SUPPRIMER"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!user?.email) {
                  toast({ title: "Erreur compte", variant: "destructive" });
                  return;
                }
                setDeleting(true);
                const { error: authError } = await supabase.auth.signInWithPassword({
                  email: user.email,
                  password: confirmPassword,
                });
                if (authError) {
                  setPwdError(true);
                  setDeleting(false);
                  toast({ title: "Mot de passe incorrect", variant: "destructive" });
                  return;
                }
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await supabase.functions.invoke("delete-account", {
                    headers: { Authorization: `Bearer ${session?.access_token}` },
                    body: { confirmation: "SUPPRIMER MON COMPTE" },
                  });
                  if (res.error) throw res.error;
                  toast({ title: "Compte supprimé", description: "Toutes tes données ont été effacées. À bientôt 👋" });
                  await supabase.auth.signOut();
                  setTimeout(() => { window.location.href = "/"; }, 1200);
                } catch (err: any) {
                  setDeleting(false);
                  toast({ title: "Erreur de suppression", description: err?.message, variant: "destructive" });
                }
              }}
            >
              {deleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Suppression...</>
              ) : (
                "Supprimer définitivement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
};

export default Settings;
