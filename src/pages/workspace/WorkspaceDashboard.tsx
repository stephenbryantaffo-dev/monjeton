import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Users, Wallet, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const WorkspaceDashboard = () => {
  const { workspaceId } = useParams();
  const { activeWorkspace, activeRole } = useWorkspace();
  const [stats, setStats] = useState({ income: 0, expense: 0, members: 0, wallets: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      const [txRes, memRes, walRes] = await Promise.all([
        supabase.from("transactions").select("amount, type, status").eq("workspace_id", workspaceId),
        supabase.from("workspace_members").select("id").eq("workspace_id", workspaceId),
        supabase.from("wallets").select("id").eq("workspace_id", workspaceId),
      ]);
      const txs = txRes.data || [];
      setStats({
        income: txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
        members: memRes.data?.length || 0,
        wallets: walRes.data?.length || 0,
        pending: txs.filter(t => t.status === "pending").length,
      });
      setLoading(false);
    };
    load();
  }, [workspaceId]);

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-4">
        {/* Welcome */}
        <div className="mb-2">
          <h2 className="text-xl font-bold">{activeWorkspace?.name}</h2>
          <p className="text-muted-foreground text-sm">Rôle: <span className="text-primary font-medium capitalize">{activeRole}</span></p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="glass-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-muted-foreground">Revenus</span>
              </div>
              <p className="text-lg font-bold">{stats.income.toLocaleString()} <span className="text-xs text-muted-foreground">FCFA</span></p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-xs text-muted-foreground">Dépenses</span>
              </div>
              <p className="text-lg font-bold">{stats.expense.toLocaleString()} <span className="text-xs text-muted-foreground">FCFA</span></p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Membres</span>
              </div>
              <p className="text-lg font-bold">{stats.members}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-accent" />
                </div>
                <span className="text-xs text-muted-foreground">Portefeuilles</span>
              </div>
              <p className="text-lg font-bold">{stats.wallets}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending transactions */}
        {stats.pending > 0 && (
          <Link to={`/workspace/${workspaceId}/transactions`}>
            <Card className="glass-card border-primary/30 neon-glow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-yellow/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-neon-yellow" />
                </div>
                <div>
                  <p className="font-semibold">{stats.pending} transaction(s) en attente</p>
                  <p className="text-xs text-muted-foreground">Nécessite validation</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default WorkspaceDashboard;
