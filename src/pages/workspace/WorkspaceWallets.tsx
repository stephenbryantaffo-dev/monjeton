import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface WalletItem {
  id: string;
  wallet_name: string;
  initial_balance: number;
  currency: string;
}

const WorkspaceWallets = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { activeRole } = useWorkspace();
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const canCreate = activeRole !== "viewer";

  const fetchWallets = async () => {
    if (!workspaceId) return;
    const { data } = await supabase.from("wallets").select("*").eq("workspace_id", workspaceId);
    setWallets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWallets(); }, [workspaceId]);

  const handleCreate = async () => {
    if (!name.trim() || !workspaceId || !user) return;
    const { error } = await supabase.from("wallets").insert({
      wallet_name: name.trim(),
      workspace_id: workspaceId,
      user_id: user.id,
      initial_balance: Number(balance) || 0,
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Portefeuille créé !" }); setShowNew(false); setName(""); setBalance(""); fetchWallets(); }
  };

  return (
    <WorkspaceLayout title="Portefeuilles" showBack>
      <div className="space-y-4">
        {canCreate && (
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button className="w-full gradient-primary text-primary-foreground font-semibold gap-2">
                <Plus className="w-4 h-4" /> Nouveau portefeuille
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau portefeuille</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Caisse" className="bg-secondary/50" /></div>
                <div><Label>Solde initial (FCFA)</Label><Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" className="bg-secondary/50" /></div>
                <Button onClick={handleCreate} disabled={!name.trim()} className="w-full gradient-primary text-primary-foreground">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : wallets.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Aucun portefeuille</p>
        ) : (
          <div className="space-y-2">
            {wallets.map(w => (
              <Card key={w.id} className="glass-card border-border/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{w.wallet_name}</p>
                    <p className="text-xs text-muted-foreground">{w.currency}</p>
                  </div>
                  <p className="font-bold text-sm">{Number(w.initial_balance).toLocaleString()} F</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default WorkspaceWallets;
