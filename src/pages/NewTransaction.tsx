import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NewTransaction = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [walletId, setWalletId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id),
      supabase.from("wallets").select("*").eq("user_id", user.id),
    ]).then(([catRes, walRes]) => {
      setCategories(catRes.data || []);
      setWallets(walRes.data || []);
    });
  }, [user]);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !user) return;
    setLoading(true);

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      amount: Number(amount),
      note,
      date,
      category_id: categoryId,
      wallet_id: walletId || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Transaction enregistrée ✅" });
      navigate("/transactions");
    }
  };

  return (
    <DashboardLayout>
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Nouvelle transaction</h1>
      </div>

      <div className="flex gap-1 p-1 glass-card rounded-xl mb-6">
        <button onClick={() => setType("expense")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>
          Dépense
        </button>
        <button onClick={() => setType("income")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === "income" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
          Revenu
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Montant (FCFA)</Label>
          <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary border-border text-2xl font-bold h-14" required />
        </div>

        <div className="space-y-2">
          <Label>Catégorie</Label>
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((c) => (
              <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryId === c.id ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Portefeuille</Label>
          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <button key={w.id} type="button" onClick={() => setWalletId(w.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${walletId === w.id ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"}`}>
                {w.wallet_name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Note</Label>
          <Textarea placeholder="Détails de la transaction..." value={note} onChange={(e) => setNote(e.target.value)} className="bg-secondary border-border" />
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border" />
        </div>

        <Button variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>
    </DashboardLayout>
  );
};

export default NewTransaction;
