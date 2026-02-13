import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";

const categories = ["Alimentation", "Transport", "Téléphone", "Shopping", "Factures", "Loisirs", "Santé", "Autre"];
const wallets = ["Orange Money", "MTN Mobile Money", "Wave", "Moov Money", "Cash"];

const NewTransaction = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<"expense" | "income">("expense");

  return (
    <DashboardLayout>
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Nouvelle transaction</h1>
      </div>

      {/* Type toggle */}
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-6">
        <button
          onClick={() => setType("expense")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            type === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"
          }`}
        >
          Dépense
        </button>
        <button
          onClick={() => setType("income")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            type === "income" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Revenu
        </button>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <Label>Montant (FCFA)</Label>
          <Input type="number" placeholder="0" className="bg-secondary border-border text-2xl font-bold h-14" />
        </div>

        <div className="space-y-2">
          <Label>Catégorie</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className="px-3 py-1.5 rounded-full text-xs font-medium glass-card text-muted-foreground hover:text-foreground transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Portefeuille</Label>
          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <button
                key={w}
                type="button"
                className="px-3 py-1.5 rounded-full text-xs font-medium glass-card text-muted-foreground hover:text-foreground transition-colors"
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Note</Label>
          <Textarea placeholder="Détails de la transaction..." className="bg-secondary border-border" />
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" className="bg-secondary border-border" />
        </div>

        <Button variant="hero" size="lg" className="w-full">
          Enregistrer
        </Button>
      </form>
    </DashboardLayout>
  );
};

export default NewTransaction;
