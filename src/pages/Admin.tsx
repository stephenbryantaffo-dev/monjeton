import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, CreditCard, Activity, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatSkeleton } from "@/components/DashboardSkeleton";

const Admin = () => {
  const [stats, setStats] = useState<{ label: string; value: string; icon: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [profilesRes, subsRes, txCountRes, revenueRes] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("transactions").select("*", { count: "exact", head: true }),
          supabase.from("transactions").select("amount").eq("type", "income"),
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (subsRes.error) throw subsRes.error;
        if (txCountRes.error) throw txCountRes.error;
        if (revenueRes.error) throw revenueRes.error;

        const totalUsers = profilesRes.count ?? 0;
        const activeSubs = subsRes.count ?? 0;
        const totalTx = txCountRes.count ?? 0;
        const totalRevenue = (revenueRes.data || []).reduce((s, t) => s + Number(t.amount), 0);

        setStats([
          { label: "Utilisateurs", value: totalUsers.toLocaleString("fr-FR"), icon: Users },
          { label: "Abonnements actifs", value: activeSubs.toLocaleString("fr-FR"), icon: CreditCard },
          { label: "Transactions totales", value: totalTx.toLocaleString("fr-FR"), icon: Activity },
          { label: "Revenus (total)", value: `${totalRevenue.toLocaleString("fr-FR")} F`, icon: TrendingUp },
        ]);
      } catch (err: any) {
        console.error("Admin fetchStats error:", err);
        setError(err.message || "Erreur lors du chargement des statistiques");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Admin">
      <div className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
      </div>
    </DashboardLayout>
  );
};

export default Admin;
