import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Copy, Link2, Crown, Shield, Calculator, Eye, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Member {
  id: string;
  user_id: string;
  display_name: string;
  role: string;
  avatar_url: string | null;
  member_color: string | null;
  joined_at: string;
}

const roleIcon: Record<string, any> = {
  owner: Crown,
  admin: Shield,
  accountant: Calculator,
  viewer: Eye,
  member: User,
};

const roleColor: Record<string, string> = {
  owner: "text-primary",
  admin: "text-accent",
  accountant: "text-neon-yellow",
  member: "text-foreground",
  viewer: "text-muted-foreground",
};

const WorkspaceMembers = () => {
  const { workspaceId } = useParams();
  const { activeRole } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const canManage = activeRole === "owner" || activeRole === "admin";

  useEffect(() => {
    if (!workspaceId) return;
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("joined_at");
      setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, [workspaceId]);

  const generateInvite = async () => {
    if (!workspaceId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("workspace_invites")
      .insert({ workspace_id: workspaceId, created_by: user.id })
      .select()
      .single();
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setInviteCode(data.invite_code);
    toast({ title: "Code d'invitation créé", description: data.invite_code });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: "Copié !" });
  };

  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <WorkspaceLayout title="Membres">
      <div className="space-y-4">
        {/* Invite section */}
        {canManage && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full gradient-primary text-primary-foreground font-semibold gap-2">
                <UserPlus className="w-4 h-4" /> Inviter un membre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Button onClick={generateInvite} className="w-full gap-2" variant="outline">
                  <Link2 className="w-4 h-4" /> Générer un code d'invitation
                </Button>
                {inviteCode && (
                  <div className="flex items-center gap-2">
                    <Input value={inviteCode} readOnly className="bg-secondary/50 font-mono text-center text-lg tracking-widest" />
                    <Button variant="outline" size="icon" onClick={copyCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Members list */}
        <div className="space-y-2">
          {members.map(m => {
            const Icon = roleIcon[m.role] || User;
            return (
              <Card key={m.id} className="glass-card border-border/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm" style={m.member_color ? { backgroundColor: m.member_color + "33", color: m.member_color } : {}}>
                    {getInitials(m.display_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.display_name}</p>
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("w-3 h-3", roleColor[m.role])} />
                      <span className={cn("text-xs capitalize", roleColor[m.role])}>{m.role}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default WorkspaceMembers;
