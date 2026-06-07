import { useCallback, useEffect, useState } from "react";
import {
  Users, Search, ArrowUpDown, Eye, Crown, Wrench,
  ArrowUp, ArrowDown, UserMinus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface CollabRow {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

const ROLE_BADGE: Record<string, { label: string; icon: typeof Eye; cls: string }> = {
  owner:   { label: "Propriétaire",   icon: Crown,  cls: "bg-amber-500/15 text-amber-500" },
  manager: { label: "Co-gestionnaire", icon: Wrench, cls: "bg-blue-500/15 text-blue-400" },
  viewer:  { label: "Observateur",     icon: Eye,    cls: "bg-muted text-muted-foreground" },
};

interface Props {
  caisseId: string;
  canManage: boolean;
}

/**
 * Section "Suivi par" partagée entre la vue tontine/association (Tontine.tsx)
 * et la vue caisse de projet (ProjectCaisseView garde son rendu inline propre).
 * Composant 100% autonome : charge ses propres collaborateurs + profils,
 * gère le realtime, et propose promote/demote/remove pour les managers.
 */
const CaisseCollaborators = ({ caisseId, canManage }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [collabSearch, setCollabSearch] = useState("");
  const [collabSort, setCollabSort] = useState<"name" | "role">("name");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("caisse_collaborators" as any)
      .select("user_id, role")
      .eq("caisse_id", caisseId);
    const collabs = ((data || []) as any[]) as { user_id: string; role: string }[];
    if (collabs.length === 0) {
      setCollaborators([]);
      return;
    }
    const uids = collabs.map(c => c.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", uids);
    const pmap = new Map<string, { full_name: string | null; email: string | null }>();
    (profs || []).forEach((p: any) => pmap.set(p.user_id, { full_name: p.full_name, email: p.email }));
    setCollaborators(collabs.map(c => ({
      user_id: c.user_id,
      role: c.role,
      full_name: pmap.get(c.user_id)?.full_name ?? null,
      email: pmap.get(c.user_id)?.email ?? null,
    })));
  }, [caisseId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!caisseId) return;
    const channel = supabase
      .channel(`caisse-collabs-${caisseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "caisse_collaborators", filter: `caisse_id=eq.${caisseId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [caisseId, load]);

  const changeRole = async (collabUserId: string, newRole: "manager" | "viewer") => {
    if (saving || !canManage) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("caisse_collaborators" as any)
        .update({ role: newRole })
        .eq("caisse_id", caisseId)
        .eq("user_id", collabUserId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Rôle mis à jour ✅" });
      await load();
    } finally { setSaving(false); }
  };

  const removeCollaborator = async (collabUserId: string) => {
    if (saving || !canManage) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("caisse_collaborators" as any)
        .delete()
        .eq("caisse_id", caisseId)
        .eq("user_id", collabUserId)
        .select();
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      if (!data || (data as any[]).length === 0) {
        toast({ title: "Action refusée", description: "Tu ne peux pas retirer ce membre.", variant: "destructive" });
        return;
      }
      toast({ title: "Collaborateur retiré ✅" });
      await load();
    } finally { setSaving(false); }
  };

  if (collaborators.length === 0) return null;

  const query = collabSearch.trim().toLowerCase();
  let list = collaborators.slice();
  if (query) {
    list = list.filter(c =>
      (c.full_name || "").toLowerCase().includes(query) ||
      (c.email || "").toLowerCase().includes(query) ||
      (ROLE_BADGE[c.role]?.label || "").toLowerCase().includes(query)
    );
  }
  const roleOrder: Record<string, number> = { owner: 0, manager: 1, viewer: 2 };
  list.sort((a, b) => {
    if (collabSort === "role") {
      const ra = roleOrder[a.role] ?? 3;
      const rb = roleOrder[b.role] ?? 3;
      if (ra !== rb) return ra - rb;
    }
    const na = (a.full_name || a.email || "").toLowerCase();
    const nb = (b.full_name || b.email || "").toLowerCase();
    return na.localeCompare(nb);
  });

  return (
    <div className="glass-card rounded-2xl p-3 mb-4">
      <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
        <Users className="w-3.5 h-3.5 text-primary" /> Suivi par
      </p>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={collabSearch}
            onChange={(e) => setCollabSearch(e.target.value)}
            placeholder="Rechercher…"
            className="glass pl-8 text-xs h-8"
          />
        </div>
        <button
          onClick={() => setCollabSort(s => s === "name" ? "role" : "name")}
          className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground glass rounded-lg px-2 py-1.5 border border-border"
          title={collabSort === "name" ? "Trier par rôle" : "Trier par nom"}
        >
          <ArrowUpDown className="w-3 h-3" />
          {collabSort === "name" ? "Nom" : "Rôle"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((c) => {
          const ri = ROLE_BADGE[c.role] || ROLE_BADGE.viewer;
          const Icon = ri.icon;
          const display = c.full_name || c.email || "Utilisateur";
          const initial = (c.full_name || c.email || "?").trim().charAt(0).toUpperCase();
          const isMe = c.user_id === user?.id;
          return (
            <div key={c.user_id} className="flex items-center gap-1.5 glass rounded-full pl-1 pr-1.5 py-1 border border-border">
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-foreground">{initial}</span>
              </div>
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {display}{isMe && " (toi)"}
              </span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${ri.cls}`}>
                <Icon className="w-2.5 h-2.5" /> {ri.label}
              </span>
              {canManage && !isMe && c.role !== "owner" && (
                <>
                  {c.role === "viewer" ? (
                    <button
                      title="Promouvoir co-gestionnaire"
                      disabled={saving}
                      onClick={() => changeRole(c.user_id, "manager")}
                      className="text-muted-foreground hover:text-blue-400 p-1 disabled:opacity-50"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  ) : c.role === "manager" ? (
                    <button
                      title="Passer observateur"
                      disabled={saving}
                      onClick={() => changeRole(c.user_id, "viewer")}
                      className="text-muted-foreground hover:text-amber-400 p-1 disabled:opacity-50"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  ) : null}
                  <ConfirmDeleteDialog
                    onConfirm={() => removeCollaborator(c.user_id)}
                    title={`Retirer ${display} de la caisse ?`}
                    description="Il n'aura plus accès à cette caisse."
                  >
                    <button
                      title="Retirer"
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <UserMinus className="w-3 h-3" />
                    </button>
                  </ConfirmDeleteDialog>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaisseCollaborators;
