import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Wallet, Tag, Target, CreditCard, ChevronRight, MessageCircle, Shield, Camera, PieChart, Users, Award, BarChart3, Settings } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { BADGES_CI } from "@/lib/badgeCalculator";

const menuItems = [
  { icon: Camera, label: "Scanner (OCR)", path: "/scan" },
  { icon: Wallet, label: "Portefeuilles", path: "/wallets" },
  { icon: Tag, label: "Catégories", path: "/categories" },
  { icon: Target, label: "Épargne", path: "/savings" },
  { icon: Shield, label: "Dettes", path: "/debts" },
  { icon: PieChart, label: "Budgets", path: "/budgets" },
  { icon: Users, label: "Tontine & Caisse commune", path: "/tontine" },
  { icon: MessageCircle, label: "Assistant IA", path: "/assistant" },
  { icon: BarChart3, label: "Bourse BRVM", path: "/brvm" },
  { icon: CreditCard, label: "Mon abonnement", path: "/settings/subscription" },
];

const SettingsPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [earnedBadges, setEarnedBadges] = useState<{ badge_id: string; month: number; year: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from("monthly_badges")
        .select("badge_id, month, year")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .then(({ data }) => {
          if (data) setEarnedBadges(data);
        });
    });
  }, [user]);

  return (
    <DashboardLayout title="Mon espace">
      {/* Profil */}
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

      {/* Bouton Paramètres */}
      <button
        onClick={() => navigate("/parametres")}
        className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors mb-6"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Settings className="w-[18px] h-[18px] text-primary" />
        </div>
        <span className="flex-1 text-left text-[15px] font-semibold text-foreground">Paramètres</span>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Titre outils */}
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">Mes outils</h3>

      {/* Grille d'outils */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {menuItems.map((item) => {
          const content = (
            <div className="flex flex-col items-start gap-2 h-full">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-[18px] h-[18px] text-primary" />
              </div>
              <div className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-foreground leading-tight">{item.label}</span>
              </div>
            </div>
          );

          if (item.path === "/settings/subscription") {
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate("/settings/subscription")}
                className="glass-card rounded-2xl p-4 flex hover:bg-secondary/50 transition-colors min-h-[92px] text-left"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={item.path} to={item.path} className="glass-card rounded-2xl p-4 flex hover:bg-secondary/50 transition-colors min-h-[92px]">
              {content}
            </Link>
          );
        })}
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
    </DashboardLayout>
  );
};

export default SettingsPage;
