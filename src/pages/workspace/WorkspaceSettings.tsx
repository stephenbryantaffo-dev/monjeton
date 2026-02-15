import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, LogOut, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace, activeRole, refresh, setActiveWorkspaceId } = useWorkspace();
  const [name, setName] = useState(activeWorkspace?.name || "");
  const [saving, setSaving] = useState(false);
  const isOwner = activeRole === "owner";

  const saveName = async () => {
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("workspaces").update({ name: name.trim() }).eq("id", workspaceId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { await refresh(); toast({ title: "Nom mis à jour !" }); }
    setSaving(false);
  };

  const leaveWorkspace = async () => {
    if (!workspaceId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", user.id);
    setActiveWorkspaceId(null);
    await refresh();
    navigate("/dashboard");
    toast({ title: "Vous avez quitté l'espace" });
  };

  const deleteWorkspace = async () => {
    if (!workspaceId || !isOwner) return;
    if (!confirm("Supprimer cet espace ? Cette action est irréversible.")) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      setActiveWorkspaceId(null);
      await refresh();
      navigate("/dashboard");
      toast({ title: "Espace supprimé" });
    }
  };

  return (
    <WorkspaceLayout title="Paramètres">
      <div className="space-y-4 max-w-md mx-auto">
        {(isOwner || activeRole === "admin") && (
          <Card className="glass-card border-border/40">
            <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Nom de l'espace</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary/50" />
              </div>
              <Button onClick={saveName} disabled={saving} variant="outline" className="w-full">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card border-border/40">
          <CardContent className="p-4 space-y-3">
            <Button onClick={() => navigate(`/workspace/${workspaceId}/wallets`)} variant="outline" className="w-full justify-start gap-2">
              <Wallet className="w-4 h-4" /> Gérer les portefeuilles
            </Button>
            {!isOwner && (
              <Button onClick={leaveWorkspace} variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                <LogOut className="w-4 h-4" /> Quitter l'espace
              </Button>
            )}
            {isOwner && (
              <Button onClick={deleteWorkspace} variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" /> Supprimer l'espace
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  );
};

export default WorkspaceSettings;
