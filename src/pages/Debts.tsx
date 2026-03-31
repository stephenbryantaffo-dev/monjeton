import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { ArrowUpRight, ArrowDownLeft, Plus, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { ListItemSkeleton } from "@/components/DashboardSkeleton";

const Debts = () => {
  const { user } = useAuth();
  const { formatAmount } = usePrivacy();
  const { toast } = useToast();
  const [debts, setDebts] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "i_owe" | "owed_to_me">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<"i_owe" | "owed_to_me">("i_owe");
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchDebts = async () => {
    if (!user) return;
    const { data } = await supabase.from("debts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setDebts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDebts(); }, [user]);

  const handleAdd = async () => {
    if (!personName || !amount || !user) return;
    await supabase.from("debts").insert({
      user_id: user.id, type: newType, person_name: personName,
      amount: Number(amount), due_date: dueDate || null, note: note || null,
    });
    toast({ title: "Dette ajoutée ✅" });
    setPersonName(""); setAmount(""); setDueDate(""); setNote(""); setShowAdd(false);
    fetchDebts();
  };

  const togglePaid = async (id: string, currentStatus: string) => {
    await supabase.from("debts").update({ status: currentStatus === "paid" ? "pending" : "paid" }).eq("id", id);
    fetchDebts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("debts").delete().eq("id", id);
    fetchDebts();
  };

  const sendWhatsAppReminder = (debt: any) => {
    const msg = `Salut ${debt.person_name}, tu me dois ${Number(debt.amount).toLocaleString("fr-FR")} FCFA, stp n'oublie pas 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filtered = debts.filter(d => filter === "all" || d.type === filter);

  return (
    <DashboardLayout title="Dettes">
      <div className="flex gap-1 p-1 glass-card rounded-xl mb-4">
        {[{ key: "all", label: "Tout" }, { key: "i_owe", label: "Je dois" }, { key: "owed_to_me", label: "On me doit" }].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${filter === f.key ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)
          : filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <BorderRotate className={`p-4 flex items-center gap-3 ${d.status === "paid" ? "opacity-50" : ""}`} animationSpeed={18}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.type === "i_owe" ? "bg-destructive/20" : "bg-primary/20"}`}>
                {d.type === "i_owe" ? <ArrowUpRight className="w-5 h-5 text-destructive" /> : <ArrowDownLeft className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{d.person_name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.type === "i_owe" ? "Je dois" : "On me doit"}{d.due_date ? ` · ${new Date(d.due_date).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>
              <div className="text-right flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground">{formatAmount(Number(d.amount))} F</p>
                {d.type === "owed_to_me" && d.status !== "paid" && (
                  <button onClick={() => sendWhatsAppReminder(d)} className="text-primary" title="Rappeler via WhatsApp">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => togglePaid(d.id, d.status)} className={d.status === "paid" ? "text-primary" : "text-muted-foreground"}>
                  <Check className="w-4 h-4" />
                </button>
                <ConfirmDeleteDialog onConfirm={() => handleDelete(d.id)} title="Supprimer cette dette ?" />
              </div>
              </BorderRotate>
            </motion.div>
          ))}
        {!loading && filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Aucune dette</p>}
      </div>

      {showAdd ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setNewType("i_owe")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "i_owe" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>Je dois</button>
            <button onClick={() => setNewType("owed_to_me")} className={`flex-1 py-2 rounded-lg text-sm ${newType === "owed_to_me" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>On me doit</button>
          </div>
          <Input placeholder="Nom de la personne" value={personName} onChange={(e) => setPersonName(e.target.value)} className="bg-secondary border-border" />
          <Input type="number" placeholder="Montant (FCFA)" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary border-border" />
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-secondary border-border" />
          <Input placeholder="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} className="bg-secondary border-border" />
          <div className="flex gap-2">
            <Button variant="glass" onClick={() => setShowAdd(false)} className="flex-1">Annuler</Button>
            <Button variant="hero" onClick={handleAdd} className="flex-1">Ajouter</Button>
          </div>
        </motion.div>
      ) : (
        <Button variant="glass" size="lg" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Ajouter une dette
        </Button>
      )}
    </DashboardLayout>
  );
};

export default Debts;
