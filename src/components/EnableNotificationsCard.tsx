import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  enableDailyReminders,
  disableDailyReminders,
  isDailyReminderActive,
  pushSupported,
} from "@/lib/pushNotifications";

interface Props {
  variant?: "card" | "row";
}

const EnableNotificationsCard = ({ variant = "card" }: Props) => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(pushSupported());
    isDailyReminderActive().then(setActive);
  }, []);

  if (!supported) {
    return variant === "card" ? (
      <div className="glass-card rounded-2xl p-4 border border-border/50 text-xs text-muted-foreground">
        Ton navigateur ne supporte pas les notifications push. Sur iPhone, installe d'abord Mon Jeton
        sur ton écran d'accueil pour activer les rappels.
      </div>
    ) : null;
  }

  const handleEnable = async () => {
    setLoading(true);
    const res = await enableDailyReminders();
    setLoading(false);
    if (res.ok) {
      setActive(true);
      toast({ title: "Rappels activés ✅", description: "Tu recevras un rappel matin et soir." });
    } else {
      const map: Record<string, string> = {
        permission_denied: "Autorisation refusée. Active les notifications dans ton navigateur.",
        unsupported: "Ton navigateur ne supporte pas les notifications.",
        preview_disabled: "Disponible uniquement sur l'app publiée, pas dans l'aperçu.",
        not_authenticated: "Connecte-toi pour activer les rappels.",
        missing_vapid_key: "Configuration serveur incomplète.",
      };
      toast({
        title: "Impossible d'activer",
        description: map[res.error] || res.error,
        variant: "destructive",
      });
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    await disableDailyReminders();
    setLoading(false);
    setActive(false);
    toast({ title: "Rappels désactivés" });
  };

  if (variant === "row") {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            {active ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Rappels quotidiens</p>
            <p className="text-xs text-muted-foreground truncate">Matin et soir, si aucune dépense saisie.</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={active ? "outline" : "default"}
          onClick={active ? handleDisable : handleEnable}
          disabled={loading}
          className={active ? "" : "gradient-primary text-primary-foreground"}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active ? "Désactiver" : "Activer"}
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4 mb-4 border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 border border-primary/20">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm mb-0.5">Active tes rappels quotidiens</p>
          <p className="text-xs text-muted-foreground mb-3">
            Un petit ping le matin et le soir pour ne plus oublier de noter tes dépenses.
          </p>
          <div className="flex gap-2">
            {active ? (
              <Button size="sm" variant="outline" onClick={handleDisable} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <BellOff className="w-3.5 h-3.5 mr-1" />}
                Désactiver
              </Button>
            ) : (
              <Button size="sm" onClick={handleEnable} disabled={loading} className="gradient-primary text-primary-foreground">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Bell className="w-3.5 h-3.5 mr-1" />}
                Activer les rappels
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnableNotificationsCard;
