import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Plus, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fmt } from "@/components/tontine/utils";

interface TontineWidget {
  id: string;
  name: string;
  frequency: string;
  contribution_amount: number;
  cycle_number?: number;
  period_label?: string;
  total_expected?: number;
  total_collected?: number;
  members_count: number;
  paid_count: number;
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "Hebdo",
  monthly: "Mensuelle",
  quarterly: "Trimestrielle",
  annual: "Annuelle",
  custom: "Custom",
};

const FREQ_COLORS: Record<string, string> = {
  weekly: "bg-blue-500/15 text-blue-400",
  monthly: "bg-emerald-500/15 text-emerald-400",
  quarterly: "bg-amber-500/15 text-amber-400",
  annual: "bg-purple-500/15 text-purple-400",
  custom: "bg-muted text-muted-foreground",
};

const DashboardTontineWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tontines, setTontines] = useState<TontineWidget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTontines();
  }, [user]);

  const loadTontines = async () => {
    if (!user) return;
    try {
      const { data: tontineData } = await supabase
        .from("tontines")
        .select("id, name, frequency, contribution_amount")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!tontineData || tontineData.length === 0) {
        setTontines([]);
        setLoading(false);
        return;
      }

      const ids = tontineData.map((t) => t.id);

      const [cyclesRes, membersRes] = await Promise.all([
        supabase
          .from("tontine_cycles")
          .select("tontine_id, cycle_number, period_label, total_expected, total_collected")
          .in("tontine_id", ids)
          .eq("status", "open"),
        supabase
          .from("tontine_members")
          .select("tontine_id")
          .in("tontine_id", ids),
      ]);

      const cycleMap: Record<string, any> = {};
      (cyclesRes.data || []).forEach((c: any) => {
        cycleMap[c.tontine_id] = c;
      });

      const memberMap: Record<string, number> = {};
      (membersRes.data || []).forEach((m: any) => {
        memberMap[m.tontine_id] = (memberMap[m.tontine_id] || 0) + 1;
      });

      // Get paid counts for open cycles
      const openCycleIds = (cyclesRes.data || []).map((c: any) => c.tontine_id);
      let paidMap: Record<string, number> = {};

      if (openCycleIds.length > 0) {
        const cycleIdList = (cyclesRes.data || []).map((c: any) => ({ tontine_id: c.tontine_id, id: c.tontine_id }));
        // We need cycle IDs to get payments - fetch them properly
        const { data: fullCycles } = await supabase
          .from("tontine_cycles")
          .select("id, tontine_id")
          .in("tontine_id", ids)
          .eq("status", "open");

        if (fullCycles && fullCycles.length > 0) {
          const cIds = fullCycles.map((c: any) => c.id);
          const { data: payments } = await supabase
            .from("tontine_payments")
            .select("cycle_id, member_id")
            .in("cycle_id", cIds);

          const cycleToTontine: Record<string, string> = {};
          fullCycles.forEach((c: any) => {
            cycleToTontine[c.id] = c.tontine_id;
          });

          const paidMembers: Record<string, Set<string>> = {};
          (payments || []).forEach((p: any) => {
            const tid = cycleToTontine[p.cycle_id];
            if (tid) {
              if (!paidMembers[tid]) paidMembers[tid] = new Set();
              paidMembers[tid].add(p.member_id);
            }
          });

          Object.entries(paidMembers).forEach(([tid, set]) => {
            paidMap[tid] = set.size;
          });
        }
      }

      const widgets: TontineWidget[] = tontineData.map((t) => {
        const cycle = cycleMap[t.id];
        const mc = memberMap[t.id] || 0;
        return {
          id: t.id,
          name: t.name,
          frequency: t.frequency,
          contribution_amount: t.contribution_amount,
          cycle_number: cycle?.cycle_number,
          period_label: cycle?.period_label,
          total_expected: cycle?.total_expected,
          total_collected: cycle?.total_collected,
          members_count: mc,
          paid_count: paidMap[t.id] || 0,
        };
      });

      setTontines(widgets);
    } catch {
      console.warn("tontine widget load error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (tontines.length === 0) {
    return (
      <div className="mb-6">
        <button
          onClick={() => navigate("/tontine")}
          className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Créer une tontine</p>
            <p className="text-xs text-muted-foreground">Gérez vos cotisations entre amis</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">🤝 Mes Tontines</h2>
        <button onClick={() => navigate("/tontine")} className="text-xs text-primary">
          Voir tout
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {tontines.map((t, i) => {
          const pct =
            t.total_expected && t.total_expected > 0
              ? Math.round((t.total_collected || 0) / t.total_expected * 100)
              : 0;
          const waiting = t.members_count - t.paid_count;

          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => navigate("/tontine")}
              className="glass-card rounded-2xl p-4 min-w-[220px] max-w-[260px] flex-shrink-0 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🤝</span>
                <p className="text-sm font-semibold text-foreground truncate flex-1">{t.name}</p>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${FREQ_COLORS[t.frequency] || FREQ_COLORS.custom}`}>
                  {FREQ_LABELS[t.frequency] || t.frequency}
                </span>
                {t.cycle_number && (
                  <span className="text-[10px] text-muted-foreground">
                    Cycle {t.cycle_number}
                  </span>
                )}
              </div>

              {t.total_expected ? (
                <>
                  <Progress value={pct} className="h-1.5 mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">
                    {fmt(t.total_collected || 0)} / {fmt(t.total_expected)} F
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mb-1">Aucun cycle actif</p>
              )}

              {waiting > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400">
                  <Clock className="w-3 h-3" />
                  {waiting} membre{waiting > 1 ? "s" : ""} en attente ⏳
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardTontineWidget;
