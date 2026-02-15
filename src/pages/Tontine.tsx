import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Phone, CheckCircle, Clock, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Tontine {
  id: string;
  name: string;
  contribution_amount: number;
  frequency: string;
  start_date: string;
  members_count: number;
}

interface Member {
  id: string;
  tontine_id: string;
  member_name: string;
  member_phone: string | null;
}

interface Payment {
  id: string;
  tontine_id: string;
  member_name: string;
  amount: number;
  date: string;
  status: string;
}

const Tontine = () => {
  const { user } = useAuth();
  const [tontines, setTontines] = useState<Tontine[]>([]);
  const [selectedTontine, setSelectedTontine] = useState<Tontine | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newFreq, setNewFreq] = useState("monthly");
  const [createOpen, setCreateOpen] = useState(false);

  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);

  useEffect(() => {
    if (user) loadTontines();
  }, [user]);

  const loadTontines = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tontines")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTontines(data || []);
    setLoading(false);
  };

  const selectTontine = async (t: Tontine) => {
    setSelectedTontine(t);
    const [membersRes, paymentsRes] = await Promise.all([
      supabase.from("tontine_members").select("*").eq("tontine_id", t.id),
      supabase.from("tontine_payments").select("*").eq("tontine_id", t.id).order("date", { ascending: false }),
    ]);
    setMembers(membersRes.data || []);
    setPayments(paymentsRes.data || []);
  };

  const createTontine = async () => {
    if (!user || !newName || !newAmount) return;
    const { error } = await supabase.from("tontines").insert({
      user_id: user.id,
      name: newName,
      contribution_amount: Number(newAmount),
      frequency: newFreq,
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setCreateOpen(false);
    setNewName("");
    setNewAmount("");
    toast({ title: "Tontine créée ✅" });
    loadTontines();
  };

  const addMember = async () => {
    if (!selectedTontine || !memberName) return;
    await supabase.from("tontine_members").insert({
      tontine_id: selectedTontine.id,
      member_name: memberName,
      member_phone: memberPhone || null,
    });
    await supabase.from("tontines").update({
      members_count: (selectedTontine.members_count || 0) + 1,
    }).eq("id", selectedTontine.id);
    setMemberOpen(false);
    setMemberName("");
    setMemberPhone("");
    toast({ title: "Membre ajouté ✅" });
    selectTontine({ ...selectedTontine, members_count: selectedTontine.members_count + 1 });
  };

  const addPayment = async (mName: string) => {
    if (!selectedTontine) return;
    await supabase.from("tontine_payments").insert({
      tontine_id: selectedTontine.id,
      member_name: mName,
      amount: selectedTontine.contribution_amount,
      status: "paid",
    });
    toast({ title: `Paiement de ${mName} enregistré ✅` });
    selectTontine(selectedTontine);
  };

  const deleteTontine = async (id: string) => {
    await supabase.from("tontines").delete().eq("id", id);
    if (selectedTontine?.id === id) setSelectedTontine(null);
    toast({ title: "Tontine supprimée" });
    loadTontines();
  };

  const freqLabel: Record<string, string> = { weekly: "Hebdo", monthly: "Mensuel", daily: "Quotidien" };

  // Detail view
  if (selectedTontine) {
    return (
      <DashboardLayout title={selectedTontine.name}>
        <Button variant="ghost" size="sm" onClick={() => setSelectedTontine(null)} className="mb-4 text-muted-foreground">
          ← Retour
        </Button>

        <div className="glass-card rounded-2xl p-4 mb-4">
          <p className="text-sm text-muted-foreground">{freqLabel[selectedTontine.frequency] || selectedTontine.frequency}</p>
          <p className="text-2xl font-bold text-foreground">{selectedTontine.contribution_amount.toLocaleString("fr-FR")} F</p>
          <p className="text-xs text-muted-foreground">{selectedTontine.members_count} membres</p>
        </div>

        {/* Members */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Membres</h3>
          <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="glass"><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border">
              <DialogHeader><DialogTitle>Nouveau membre</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nom" value={memberName} onChange={(e) => setMemberName(e.target.value)} className="glass" />
                <Input placeholder="Téléphone (optionnel)" value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} className="glass" />
                <Button onClick={addMember} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2 mb-6">
          {members.map((m) => (
            <div key={m.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{m.member_name}</span>
                {m.member_phone && <Phone className="w-3 h-3 text-muted-foreground" />}
              </div>
              <Button size="sm" variant="ghost" onClick={() => addPayment(m.member_name)}>
                <CheckCircle className="w-4 h-4 text-primary" />
              </Button>
            </div>
          ))}
          {members.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Aucun membre</p>}
        </div>

        {/* Recent payments */}
        <h3 className="font-semibold text-foreground mb-3">Paiements récents</h3>
        <div className="space-y-2">
          {payments.slice(0, 10).map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{p.member_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{p.amount.toLocaleString("fr-FR")} F</span>
                {p.status === "paid" ? <CheckCircle className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          ))}
          {payments.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Aucun paiement</p>}
        </div>
      </DashboardLayout>
    );
  }

  // List view
  return (
    <DashboardLayout title="Tontines">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button className="w-full mb-4 gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle tontine
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Créer une tontine</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nom de la tontine" value={newName} onChange={(e) => setNewName(e.target.value)} className="glass" />
            <Input type="number" placeholder="Montant cotisation (F)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="glass" />
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value)}
              className="w-full rounded-lg bg-background/50 border border-border p-2.5 text-foreground text-sm"
            >
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </select>
            <Button onClick={createTontine} className="w-full">Créer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {tontines.map((t) => (
          <div key={t.id} className="glass-card rounded-2xl p-4 flex items-center justify-between">
            <button onClick={() => selectTontine(t)} className="flex-1 text-left">
              <p className="font-semibold text-foreground">{t.name}</p>
              <p className="text-sm text-muted-foreground">
                {t.contribution_amount.toLocaleString("fr-FR")} F · {freqLabel[t.frequency] || t.frequency} · {t.members_count} membres
              </p>
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette tontine ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTontine(t.id)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
        {tontines.length === 0 && !loading && (
          <p className="text-center text-muted-foreground text-sm py-12">Aucune tontine créée</p>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tontine;
