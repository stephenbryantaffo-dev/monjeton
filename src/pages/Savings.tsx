import DashboardLayout from "@/components/DashboardLayout";
import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const goals = [
  { name: "Nouvel iPhone", target: 500000, current: 175000, deadline: "Juin 2026" },
  { name: "Voyage Maroc", target: 300000, current: 90000, deadline: "Déc 2026" },
  { name: "Fonds d'urgence", target: 200000, current: 160000, deadline: "Mars 2026" },
];

const Savings = () => (
  <DashboardLayout title="Épargne">
    <div className="space-y-3 mb-4">
      {goals.map((g) => {
        const pct = Math.round((g.current / g.target) * 100);
        return (
          <div key={g.name} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">Échéance : {g.deadline}</p>
              </div>
              <span className="text-sm font-bold text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2 bg-secondary" />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted-foreground">{g.current.toLocaleString("fr-FR")} F</span>
              <span className="text-xs text-muted-foreground">{g.target.toLocaleString("fr-FR")} F</span>
            </div>
          </div>
        );
      })}
    </div>
    <Button variant="glass" size="lg" className="w-full">
      <Plus className="w-4 h-4" /> Nouvel objectif
    </Button>
  </DashboardLayout>
);

export default Savings;
