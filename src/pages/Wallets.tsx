import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Wallet, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePrivacy } from "@/contexts/PrivacyContext";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";

const WALLET_COLORS: Record<string, string> = {
  "Orange Money": "hsl(25, 95%, 53%)",
  "MTN Mobile Money": "hsl(45, 96%, 58%)",
  "Wave": "hsl(200, 70%, 50%)",
  "Moov Money": "hsl(270, 70%, 60%)",
  "Cash": "hsl(84, 81%, 44%)",
};

const Wallets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatAmount } = usePrivacy();
  const [wallets, setWallets] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, { income: number; expense: number }>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const [{ data: walletsData }, { data: txData }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("wallet_id, type, amount").eq("user_id", user.id),
    ]);
    setWallets(walletsData || []);

    const bal: Record<string, { income: number; expense: number }> = {};
    (txData || []).forEach((t: any) => {
      if (!t.wallet_id) return;
      if (!bal[t.wallet_id]) bal[t.wallet_id] = { income: 0, expense: 0 };
      if (t.type === "income") bal[t.wallet_id].income += Number(t.amount);
      else bal[t.wallet_id].expense += Number(t.amount);
    });
    setBalances(bal);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAdd = async () => {
    if (!newName.trim() || !user) return;
    await supabase.from("wallets").insert({ user_id: user.id, wallet_name: newName });
    toast({ title: "Portefeuille ajouté ✅" });
    setNewName("");
    setShowAdd(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("wallets").delete().eq("id", id);
    toast({ title: "Portefeuille supprimé" });
    fetchData();
  };

  return (
    <DashboardLayout title="Portefeuilles">
      <div className="space-y-3 mb-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)
          : wallets.map((w, i) => {
            const color = WALLET_COLORS[w.wallet_name] || "hsl(200, 70%, 50%)";
            const b = balances[w.id] || { income: 0, expense: 0 };
            const solde = b.income - b.expense;
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="glass-card rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <Wallet className="w-6 h-6" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{w.wallet_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {solde >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-primary" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <span className={`text-sm font-semibold ${solde >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatAmount(solde)} F
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    +{formatAmount(b.income)} / -{formatAmount(b.expense)}
                  </p>
                </div>
                <ConfirmDeleteDialog onConfirm={() => handleDelete(w.id)} title="Supprimer ce portefeuille ?" />
              </motion.div>
            );
          })}
      </div>

      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <Input placeholder="Nom du portefeuille" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border" />
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => setShowAdd(false)} className="flex-1">Annuler</Button>
            <Button variant="hero" onClick={handleAdd} className="flex-1">Ajouter</Button>
          </div>
        </motion.div>
      ) : (
        <Button variant="glass" size="lg" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Ajouter un portefeuille
        </Button>
      )}
    </DashboardLayout>
  );
};

export default Wallets;
