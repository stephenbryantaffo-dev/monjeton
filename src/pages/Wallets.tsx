import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Wallet, Plus, TrendingUp, TrendingDown, Pencil, Check, X } from "lucide-react";
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
  const [newInitialBalance, setNewInitialBalance] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState("");

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
    const initBal = parseFloat(newInitialBalance) || 0;
    await supabase.from("wallets").insert({ user_id: user.id, wallet_name: newName, initial_balance: initBal } as any);
    toast({ title: "Portefeuille ajouté ✅" });
    setNewName("");
    setNewInitialBalance("");
    setShowAdd(false);
    fetchData();
  };

  const handleUpdateBalance = async (id: string) => {
    const val = parseFloat(editBalance);
    if (isNaN(val)) return;
    await supabase.from("wallets").update({ initial_balance: val } as any).eq("id", id);
    toast({ title: "Solde initial mis à jour ✅" });
    setEditingId(null);
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
            const initBal = Number(w.initial_balance) || 0;
            const solde = initBal + b.income - b.expense;
            const isEditing = editingId === w.id;
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="glass-card rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center gap-4">
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
                  </div>
                  <ConfirmDeleteDialog onConfirm={() => handleDelete(w.id)} title="Supprimer ce portefeuille ?" />
                </div>
                {/* Initial balance row */}
                <div className="flex items-center justify-between pl-16 text-xs text-muted-foreground">
                  <span>Solde initial : {isEditing ? "" : `${formatAmount(initBal)} F`}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        className="h-7 w-28 text-xs bg-secondary border-border"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateBalance(w.id)} className="text-primary hover:text-primary/80"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(w.id); setEditBalance(String(initBal)); }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pl-16">
                  +{formatAmount(b.income)} / -{formatAmount(b.expense)}
                </p>
              </motion.div>
            );
          })}
      </div>

      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <Input placeholder="Nom du portefeuille" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-secondary border-border" />
          <Input placeholder="Solde initial (ex: 50000)" type="number" value={newInitialBalance} onChange={(e) => setNewInitialBalance(e.target.value)} className="bg-secondary border-border" />
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
