import DashboardLayout from "@/components/DashboardLayout";
import { Utensils, Car, Smartphone, ShoppingBag, Zap, Heart, Music, Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const defaultCategories = [
  { name: "Alimentation", icon: Utensils, color: "hsl(84, 81%, 44%)", type: "expense" },
  { name: "Transport", icon: Car, color: "hsl(270, 70%, 60%)", type: "expense" },
  { name: "Téléphone", icon: Smartphone, color: "hsl(45, 96%, 58%)", type: "expense" },
  { name: "Shopping", icon: ShoppingBag, color: "hsl(200, 70%, 50%)", type: "expense" },
  { name: "Factures", icon: Zap, color: "hsl(0, 70%, 55%)", type: "expense" },
  { name: "Santé", icon: Heart, color: "hsl(340, 70%, 55%)", type: "expense" },
  { name: "Loisirs", icon: Music, color: "hsl(180, 60%, 45%)", type: "expense" },
  { name: "Sport", icon: Dumbbell, color: "hsl(30, 80%, 50%)", type: "expense" },
];

const Categories = () => (
  <DashboardLayout title="Catégories">
    <div className="grid grid-cols-2 gap-3 mb-4">
      {defaultCategories.map((c) => (
        <div key={c.name} className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.color}20` }}>
            <c.icon className="w-6 h-6" style={{ color: c.color }} />
          </div>
          <span className="text-sm font-medium text-foreground">{c.name}</span>
          <span className="text-xs text-muted-foreground capitalize">{c.type === "expense" ? "Dépense" : "Revenu"}</span>
        </div>
      ))}
    </div>
    <Button variant="glass" size="lg" className="w-full">
      <Plus className="w-4 h-4" /> Ajouter une catégorie
    </Button>
  </DashboardLayout>
);

export default Categories;
