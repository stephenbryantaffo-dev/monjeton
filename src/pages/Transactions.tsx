import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Wallet, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Transactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*, categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, [user]);

  const handleDelete = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    toast({ title: "Transaction supprimée" });
    fetchTransactions();
  };

  const filtered = transactions.filter(t =>
    (t.note || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.categories?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Transactions">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
      </div>

      <div className="space-y-2">
        {filtered.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }} className="glass-card rounded-xl p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === "income" ? "bg-primary/20" : "bg-secondary"}`}>
              <Wallet className={`w-5 h-5 ${t.type === "income" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{t.note || t.categories?.name || "Transaction"}</p>
              <p className="text-xs text-muted-foreground">{t.categories?.name} · {new Date(t.date).toLocaleDateString("fr-FR")}</p>
            </div>
            <span className={`text-sm font-semibold ${t.type === "income" ? "text-primary" : "text-foreground"}`}>
              {t.type === "income" ? "+" : "-"}{Number(t.amount).toLocaleString("fr-FR")} F
            </span>
            <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Aucune transaction</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
