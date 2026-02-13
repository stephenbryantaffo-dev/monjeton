import DashboardLayout from "@/components/DashboardLayout";
import { Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const wallets = [
  { name: "Orange Money", balance: 45000, color: "hsl(25, 95%, 53%)" },
  { name: "MTN Mobile Money", balance: 23000, color: "hsl(45, 96%, 58%)" },
  { name: "Wave", balance: 67000, color: "hsl(200, 70%, 50%)" },
  { name: "Moov Money", balance: 12000, color: "hsl(270, 70%, 60%)" },
  { name: "Cash", balance: 8000, color: "hsl(84, 81%, 44%)" },
];

const Wallets = () => (
  <DashboardLayout title="Portefeuilles">
    <div className="space-y-3 mb-4">
      {wallets.map((w) => (
        <div key={w.name} className="glass-card rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${w.color}20` }}>
            <Wallet className="w-6 h-6" style={{ color: w.color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{w.name}</p>
            <p className="text-xs text-muted-foreground">XOF</p>
          </div>
          <p className="text-lg font-bold text-foreground">{w.balance.toLocaleString("fr-FR")} <span className="text-xs text-muted-foreground">F</span></p>
        </div>
      ))}
    </div>
    <Button variant="glass" size="lg" className="w-full">
      <Plus className="w-4 h-4" /> Ajouter un portefeuille
    </Button>
  </DashboardLayout>
);

export default Wallets;
