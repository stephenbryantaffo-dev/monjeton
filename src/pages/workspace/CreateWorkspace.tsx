import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CreateWorkspace = () => {
  const { user } = useAuth();
  const { refresh, setActiveWorkspaceId } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({ name: name.trim(), created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      setActiveWorkspaceId(data.id);
      toast({ title: "Espace créé ! 🎉", description: `${data.name} est prêt.` });
      navigate(`/workspace/${data.id}/dashboard`);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Créer un espace" showBack>
      <Card className="glass-card border-border/40 max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle>Nouvel espace entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de l'entreprise</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ma Société SARL"
              className="bg-secondary/50"
            />
          </div>
          <Button onClick={handleCreate} disabled={!name.trim() || loading} className="w-full gradient-primary text-primary-foreground font-semibold">
            {loading ? "Création..." : "Créer l'espace"}
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CreateWorkspace;
