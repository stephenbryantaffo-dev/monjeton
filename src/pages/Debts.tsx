import DashboardLayout from "@/components/DashboardLayout";
import { ArrowUpRight, ArrowDownLeft, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const debts = [
  { id: 1, type: "i_owe", person: "Kouassi Aya", amount: 15000, due: "28 Fév 2026", status: "pending" },
  { id: 2, type: "owed_to_me", person: "Traoré Moussa", amount: 25000, due: "15 Mars 2026", status: "pending" },
  { id: 3, type: "i_owe", person: "Bamba Salif", amount: 10000, due: "01 Fév 2026", status: "paid" },
];

const Debts = () => (
  <DashboardLayout title="Dettes">
    <div className="flex gap-1 p-1 glass-card rounded-xl mb-4">
      <button className="flex-1 py-2 rounded-lg text-sm font-medium gradient-primary text-primary-foreground">Tout</button>
      <button className="flex-1 py-2 rounded-lg text-sm font-medium text-muted-foreground">Je dois</button>
      <button className="flex-1 py-2 rounded-lg text-sm font-medium text-muted-foreground">On me doit</button>
    </div>

    <div className="space-y-2 mb-4">
      {debts.map((d) => (
        <div key={d.id} className={`glass-card rounded-xl p-4 flex items-center gap-3 ${d.status === "paid" ? "opacity-50" : ""}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            d.type === "i_owe" ? "bg-destructive/20" : "bg-primary/20"
          }`}>
            {d.type === "i_owe" ? (
              <ArrowUpRight className="w-5 h-5 text-destructive" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{d.person}</p>
            <p className="text-xs text-muted-foreground">
              {d.type === "i_owe" ? "Je dois" : "On me doit"} · {d.due}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{d.amount.toLocaleString("fr-FR")} F</p>
            {d.status === "paid" && (
              <span className="text-xs text-primary flex items-center gap-1 justify-end">
                <Check className="w-3 h-3" /> Payé
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
    <Button variant="glass" size="lg" className="w-full">
      <Plus className="w-4 h-4" /> Ajouter une dette
    </Button>
  </DashboardLayout>
);

export default Debts;
