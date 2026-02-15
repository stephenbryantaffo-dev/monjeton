import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, X, Clock, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  merchant_name: string | null;
  status: string;
  date: string;
  created_by: string | null;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  approved: { icon: Check, color: "text-green-400", label: "Approuvé" },
  rejected: { icon: X, color: "text-red-400", label: "Rejeté" },
  pending: { icon: Clock, color: "text-neon-yellow", label: "En attente" },
};

const WorkspaceTransactions = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { activeRole, activeMember } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [newTx, setNewTx] = useState({ type: "expense", amount: "", note: "", merchant_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const canApprove = activeRole === "owner" || activeRole === "admin";

  const fetchTx = async () => {
    if (!workspaceId) return;
    let q = supabase.from("transactions").select("*").eq("workspace_id", workspaceId).order("date", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTx(); }, [workspaceId, filter]);

  const handleCreate = async () => {
    if (!workspaceId || !user || !newTx.amount) return;
    setSubmitting(true);
    const autoApprove = activeRole === "owner" || activeRole === "admin";
    const { error } = await supabase.from("transactions").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      created_by: user.id,
      type: newTx.type,
      amount: Number(newTx.amount),
      note: newTx.note || null,
      merchant_name: newTx.merchant_name || null,
      status: autoApprove ? "approved" : "pending",
      date: new Date().toISOString().split("T")[0],
    });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Transaction créée !" });
      setShowNew(false);
      setNewTx({ type: "expense", amount: "", note: "", merchant_name: "" });
      fetchTx();
    }
    setSubmitting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("transactions").update({ status }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else fetchTx();
  };

  return (
    <WorkspaceLayout title="Transactions">
      <div className="space-y-4">
        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="all" className="flex-1 text-xs">Tout</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 text-xs">En attente</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 text-xs">Approuvé</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1 text-xs">Rejeté</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* New transaction */}
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button className="w-full gradient-primary text-primary-foreground font-semibold gap-2">
              <Plus className="w-4 h-4" /> Nouvelle transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle transaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={newTx.type} onValueChange={(v) => setNewTx(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Dépense</SelectItem>
                    <SelectItem value="income">Revenu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Montant (FCFA)</Label>
                <Input type="number" value={newTx.amount} onChange={(e) => setNewTx(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="bg-secondary/50" />
              </div>
              <div>
                <Label>Commerçant</Label>
                <Input value={newTx.merchant_name} onChange={(e) => setNewTx(p => ({ ...p, merchant_name: e.target.value }))} placeholder="Optionnel" className="bg-secondary/50" />
              </div>
              <div>
                <Label>Note</Label>
                <Input value={newTx.note} onChange={(e) => setNewTx(p => ({ ...p, note: e.target.value }))} placeholder="Optionnel" className="bg-secondary/50" />
              </div>
              <Button onClick={handleCreate} disabled={!newTx.amount || submitting} className="w-full gradient-primary text-primary-foreground">
                {submitting ? "Envoi..." : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transactions list */}
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const sc = statusConfig[tx.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <Card key={tx.id} className="glass-card border-border/40">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tx.type === "income" ? "bg-green-500/20" : "bg-red-500/20")}>
                      {tx.type === "income" ? <ArrowDownLeft className="w-5 h-5 text-green-400" /> : <ArrowUpRight className="w-5 h-5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.merchant_name || tx.note || (tx.type === "income" ? "Revenu" : "Dépense")}</p>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={cn("w-3 h-3", sc.color)} />
                        <span className={cn("text-[10px]", sc.color)}>{sc.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">{tx.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-bold text-sm", tx.type === "income" ? "text-green-400" : "text-red-400")}>
                        {tx.type === "income" ? "+" : "-"}{Number(tx.amount).toLocaleString()} F
                      </p>
                      {canApprove && tx.status === "pending" && (
                        <div className="flex gap-1 mt-1">
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => updateStatus(tx.id, "approved")}>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => updateStatus(tx.id, "rejected")}>
                            <X className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default WorkspaceTransactions;
