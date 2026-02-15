import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { CardSkeleton } from "@/components/DashboardSkeleton";

const Savings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from("savings_goals").select("*").eq("user_id", user.id).order("created_at");
    setGoals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, [user]);

  const handleAdd = async () => {
    if (!name || !target || !user) return;
    await supabase.from("savings_goals").insert({
      user_id: user.id, name, target_amount: Number(target), deadline: deadline || null,
    });
    toast({ title: "Objectif créé ✅" });
    setName(""); setTarget(""); setDeadline(""); setShowAdd(false);
    fetchGoals();
  };

  const handleAddAmount = async (id: string, currentAmount: number) => {
    const amountStr = prompt("Montant à ajouter (FCFA) :");
    if (!amountStr) return;
    await supabase.from("savings_goals").update({ current_amount: currentAmount + Number(amountStr) }).eq("id", id);
    toast({ title: "Montant ajouté ✅" });
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("savings_goals").delete().eq("id", id);
    fetchGoals();
  };

  return (
    <DashboardLayout title="Épargne">
      <div className="space-y-3 mb-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : goals.map((g, i) => {
            const pct = g.target_amount > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{g.name}</p>
                    {g.deadline && <p className="text-xs text-muted-foreground">Échéance : {new Date(g.deadline).toLocaleDateString("fr-FR")}</p>}
                  </div>
                  <span className="text-sm font-bold text-primary">{pct}%</span>
                  <ConfirmDeleteDialog onConfirm={() => handleDelete(g.id)} title="Supprimer cet objectif ?" />
                </div>
                <Progress value={pct} className="h-2 bg-secondary" />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{Number(g.current_amount).toLocaleString("fr-FR")} F</span>
                  <span className="text-xs text-muted-foreground">{Number(g.target_amount).toLocaleString("fr-FR")} F</span>
                </div>
                <button onClick={() => handleAddAmount(g.id, Number(g.current_amount))} className="text-xs text-primary mt-2">+ Ajouter un montant</button>
              </motion.div>
            );
          })}
        {!loading && goals.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Aucun objectif d'épargne</p>}
      </div>

      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <Input placeholder="Nom de l'objectif" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
          <Input type="number" placeholder="Montant cible (FCFA)" value={target} onChange={(e) => setTarget(e.target.value)} className="bg-secondary border-border" />
          <div className="space-y-1">
            <Label className="text-xs">Échéance</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => setShowAdd(false)} className="flex-1">Annuler</Button>
            <Button variant="hero" onClick={handleAdd} className="flex-1">Créer</Button>
          </div>
        </motion.div>
      ) : (
        <Button variant="glass" size="lg" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Nouvel objectif
        </Button>
      )}
    </DashboardLayout>
  );
};

export default Savings;
