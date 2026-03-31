import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
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
  const [addingAmountId, setAddingAmountId] = useState<string | null>(null);
  const [addAmountValue, setAddAmountValue] = useState("");

  const fetchGoals = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");
      if (error) throw error;
      setGoals(data || []);
    } catch {
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, [user]);

  const handleAdd = async () => {
    if (!name || !target || !user) return;
    try {
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id, name, target_amount: Number(target), deadline: deadline || null,
      });
      if (error) throw error;
      toast({ title: "Objectif créé ✅" });
      setName(""); setTarget(""); setDeadline(""); setShowAdd(false);
      fetchGoals();
    } catch {
      toast({ title: "Erreur de création", variant: "destructive" });
    }
  };

  const confirmAddAmount = async (id: string, current: number) => {
    const val = parseFloat(addAmountValue);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    const goal = goals.find(g => g.id === id);
    if (goal && current + val > Number(goal.target_amount)) {
      toast({
        title: "Dépassement",
        description: `Max ${Number(goal.target_amount) - current} F restants`,
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("savings_goals")
        .update({ current_amount: current + val })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Montant ajouté ✅" });
      setAddingAmountId(null);
      setAddAmountValue("");
      fetchGoals();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
      fetchGoals();
    } catch {
      toast({ title: "Erreur de suppression", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Épargne">
      <div className="space-y-3 mb-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : goals.map((g, i) => {
            const pct = g.target_amount > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
            const daysLeft = g.deadline
              ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
              >
                <BorderRotate className="p-4" animationSpeed={8}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{g.name}</p>
                    {g.deadline && <p className="text-xs text-muted-foreground">Échéance : {new Date(g.deadline).toLocaleDateString("fr-FR")}</p>}
                    {daysLeft !== null && (
                      <p className={`text-xs mt-1 font-medium ${
                        daysLeft < 0 ? "text-destructive" :
                        daysLeft < 7 ? "text-yellow-500" :
                        "text-muted-foreground"
                      }`}>
                        {daysLeft > 0 ? `${daysLeft} jours restants` : "Échéance dépassée ⚠️"}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary">{pct}%</span>
                  <ConfirmDeleteDialog onConfirm={() => handleDelete(g.id)} title="Supprimer cet objectif ?" />
                </div>
                <Progress value={pct} className="h-2 bg-secondary" />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{Number(g.current_amount).toLocaleString("fr-FR")} F</span>
                  <span className="text-xs text-muted-foreground">{Number(g.target_amount).toLocaleString("fr-FR")} F</span>
                </div>

                {addingAmountId === g.id ? (
                  <div className="flex gap-2 mt-3">
                    <Input
                      type="number"
                      placeholder="Montant"
                      value={addAmountValue}
                      onChange={e => setAddAmountValue(e.target.value)}
                      className="bg-secondary border-border flex-1"
                      autoFocus
                    />
                    <Button size="sm" variant="hero" onClick={() => confirmAddAmount(g.id, Number(g.current_amount))}>
                      OK
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingAmountId(null); setAddAmountValue(""); }}>
                      ✕
                    </Button>
                  </div>
                ) : (
                  <Button variant="glass" size="sm" className="w-full mt-3" onClick={() => setAddingAmountId(g.id)}>
                    + Ajouter un montant
                  </Button>
                )}
                </BorderRotate>
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
