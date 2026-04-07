import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";
import CreateTontineModal from "./CreateTontineModal";
import { TontineData, TontineCycle, FREQ_LABELS, FREQ_BADGE_CLASSES } from "./types";
import { fmt } from "./utils";

interface Props {
  tontines: TontineData[];
  loading: boolean;
  onRefresh: () => void;
}

interface CycleInfo {
  tontine_id: string;
  total_expected: number;
  total_collected: number;
  period_label: string;
}

interface MemberCount {
  tontine_id: string;
  count: number;
}

const TontineList = ({ tontines, loading, onRefresh }: Props) => {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [cycleMap, setCycleMap] = useState<Record<string, CycleInfo>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (tontines.length > 0) loadExtras();
  }, [tontines]);

  const loadExtras = async () => {
    const ids = tontines.map((t) => t.id);

    const [cyclesRes, membersRes] = await Promise.all([
      supabase
        .from("tontine_cycles" as any)
        .select("tontine_id, total_expected, total_collected, period_label")
        .in("tontine_id", ids)
        .eq("status", "open"),
      supabase
        .from("tontine_members" as any)
        .select("tontine_id")
        .in("tontine_id", ids),
    ]);

    const cMap: Record<string, CycleInfo> = {};
    (cyclesRes.data || []).forEach((c: any) => {
      cMap[c.tontine_id] = c;
    });
    setCycleMap(cMap);

    const mMap: Record<string, number> = {};
    (membersRes.data || []).forEach((m: any) => {
      mMap[m.tontine_id] = (mMap[m.tontine_id] || 0) + 1;
    });
    setMemberCounts(mMap);
  };

  const deleteTontine = async (id: string) => {
    const { error } = await supabase.from("tontines" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur de suppression", variant: "destructive" });
      return;
    }
    toast({ title: "Tontine supprimée" });
    onRefresh();
  };

  return (
    <div>
      <Button onClick={() => setCreateOpen(true)} className="w-full mb-4 gradient-primary text-primary-foreground">
        <Plus className="w-4 h-4 mr-2" /> Nouvelle tontine
      </Button>

      <CreateTontineModal open={createOpen} onOpenChange={setCreateOpen} onCreated={onRefresh} />

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)
          : tontines.map((t, i) => {
              const cycle = cycleMap[t.id];
              const mc = memberCounts[t.id] || 0;
              const pct = cycle && cycle.total_expected > 0
                ? Math.round((cycle.total_collected / cycle.total_expected) * 100)
                : 0;

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="glass-card rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-foreground text-sm truncate">{t.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${FREQ_BADGE_CLASSES[t.frequency] || FREQ_BADGE_CLASSES.custom}`}>
                          {FREQ_LABELS[t.frequency] || t.frequency}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {fmt(t.contribution_amount)} F · {mc} membres
                      </p>
                    </div>
                    <ConfirmDeleteDialog onConfirm={() => deleteTontine(t.id)} title="Supprimer cette tontine ?">
                      <Button size="icon" variant="ghost">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>

                  {cycle && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{cycle.period_label}</span>
                        <span>{fmt(cycle.total_collected)} / {fmt(cycle.total_expected)} F</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  )}
                </motion.div>
              );
            })}
        {tontines.length === 0 && !loading && (
          <p className="text-center text-muted-foreground text-sm py-12">Aucune tontine créée</p>
        )}
      </div>
    </div>
  );
};

export default TontineList;
