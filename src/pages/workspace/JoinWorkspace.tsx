import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const JoinWorkspace = () => {
  const { user, profile } = useAuth();
  const { refresh, setActiveWorkspaceId } = useWorkspace();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);
    try {
      // Find invite
      const { data: invite, error: invErr } = await supabase
        .from("workspace_invites")
        .select("*")
        .eq("invite_code", code.trim())
        .eq("status", "active")
        .single();
      if (invErr || !invite) throw new Error("Code invalide ou expiré");

      // Check expiry
      if (new Date(invite.expires_at) < new Date()) throw new Error("Invitation expirée");

      // Join
      const { error: joinErr } = await supabase.from("workspace_members").insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        display_name: profile?.full_name || user.email || "Membre",
        role: "member",
      });
      if (joinErr) {
        if (joinErr.code === "23505") throw new Error("Vous êtes déjà membre");
        throw joinErr;
      }

      // Mark invite as used
      await supabase.from("workspace_invites").update({ status: "used" }).eq("id", invite.id);

      await refresh();
      setActiveWorkspaceId(invite.workspace_id);
      toast({ title: "Bienvenue ! 🎉" });
      navigate(`/workspace/${invite.workspace_id}/dashboard`);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Rejoindre un espace" showBack>
      <Card className="glass-card border-border/40 max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-8 h-8 text-accent-foreground" />
          </div>
          <CardTitle>Rejoindre un espace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code d'invitation"
              className="bg-secondary/50 text-center font-mono text-lg tracking-widest"
            />
          </div>
          <Button onClick={handleJoin} disabled={!code.trim() || loading} className="w-full gradient-primary text-primary-foreground font-semibold">
            {loading ? "Vérification..." : "Rejoindre"}
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default JoinWorkspace;
