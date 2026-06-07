import { useEffect, useState } from "react";
import { LogOut, Crown, Wrench, Eye, AlertTriangle, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CollabRow {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  caisseId: string;
  isOwner: boolean;
  onLeft: () => void;
  className?: string;
}

const ROLE_META: Record<string, { label: string; icon: typeof Eye; cls: string }> = {
  owner:   { label: "Propriétaire",   icon: Crown,  cls: "bg-amber-500/15 text-amber-500" },
  manager: { label: "Co-gestionnaire", icon: Wrench, cls: "bg-blue-500/15 text-blue-400" },
  viewer:  { label: "Observateur",     icon: Eye,    cls: "bg-muted text-muted-foreground" },
};

const LeaveCaisseButton = ({ caisseId, isOwner, onLeft, className }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [collabs, setCollabs] = useState<CollabRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [transferUserId, setTransferUserId] = useState<string>("");

  const otherCollabs = collabs.filter(c => c.user_id !== user?.id);

  const loadCollabs = async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("caisse_collaborators" as any)
        .select("user_id, role")
        .eq("caisse_id", caisseId);
      const list = (rows || []) as any[];
      const ids = list.map(r => r.user_id);
      let profiles: any[] = [];
      if (ids.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", ids);
        profiles = p || [];
      }
      const merged: CollabRow[] = list.map(r => {
        const prof = profiles.find(p => p.user_id === r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          full_name: prof?.full_name || null,
          email: prof?.email || null,
        };
      });
      setCollabs(merged);
    } finally {
      setLoading(false);
    }
  };

  // For owner: open dialog with options; load collabs to know "alone?"
  const handleClick = async () => {
    if (saving) return;
    if (!isOwner) {
      // viewer/manager: confirm + leave directly (handled by AlertDialog trigger wrapper)
      return;
    }
    setSaving(true);
    try {
      await loadCollabs();
    } finally {
      setSaving(false);
    }
    setOwnerDialogOpen(true);
  };

  const doLeaveSelf = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      // Garde-fou : si l'utilisateur est en réalité le user_id (créateur)
      // de la tontine, quitter en tant que collaborateur ne suffira pas.
      const { data: tont } = await supabase
        .from("tontines")
        .select("user_id")
        .eq("id", caisseId)
        .maybeSingle();
      if (tont && (tont as any).user_id === user.id) {
        toast({
          title: "Tu es le propriétaire",
          description: "Transfère la caisse ou supprime-la depuis l'option propriétaire.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("caisse_collaborators" as any)
        .delete()
        .eq("caisse_id", caisseId)
        .eq("user_id", user.id)
        .select();
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      if (!data || data.length === 0) {
        toast({
          title: "Impossible de quitter",
          description: "Aucune adhésion trouvée à retirer (ou tu es le propriétaire).",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Tu as quitté la caisse 👋" });
      onLeft();
    } finally {
      setSaving(false);
    }
  };

  const doDeleteCaisse = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("tontines").delete().eq("id", caisseId);
      if (error) {
        toast({ title: "Suppression impossible", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Caisse supprimée ✅" });
      setOwnerDialogOpen(false);
      onLeft();
    } finally {
      setSaving(false);
    }
  };

  const doTransferAndLeave = async () => {
    if (!user || !transferUserId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc(
        "transfer_caisse_ownership" as any,
        { _caisse_id: caisseId, _new_owner: transferUserId } as any
      );
      if (error || !(data as any)?.ok) {
        toast({
          title: "Transfert impossible",
          description: error?.message || (data as any)?.error || "Erreur inconnue",
          variant: "destructive",
        });
        return;
      }
      const { error: delErr } = await supabase.from("caisse_collaborators" as any)
        .delete()
        .eq("caisse_id", caisseId)
        .eq("user_id", user.id);
      if (delErr) {
        toast({ title: "Erreur", description: delErr.message, variant: "destructive" });
        return;
      }
      toast({ title: "Propriété transférée, tu as quitté la caisse ✅" });
      setOwnerDialogOpen(false);
      onLeft();
    } finally {
      setSaving(false);
    }
  };

  // Non-owner branch: simple AlertDialog
  if (!isOwner) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className={`glass border-destructive/30 text-destructive hover:bg-destructive/10 ${className || ""}`}
            disabled={saving}
          >
            <LogOut className="w-4 h-4 mr-1" /> Quitter la caisse
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter cette caisse ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu n'y auras plus accès. Tu pourras y revenir si quelqu'un te ré-invite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={doLeaveSelf}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Owner branch
  const isAlone = !loading && otherCollabs.length === 0;

  return (
    <>
      <Button
        variant="outline"
        className={`glass border-destructive/30 text-destructive hover:bg-destructive/10 ${className || ""}`}
        onClick={handleClick}
        disabled={saving}
      >
        <LogOut className="w-4 h-4 mr-1" /> Quitter la caisse
      </Button>

      <Dialog open={ownerDialogOpen} onOpenChange={(o) => !saving && setOwnerDialogOpen(o)}>
        <DialogContent className="glass-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quitter la caisse</DialogTitle>
            <DialogDescription>
              Tu es le propriétaire. Choisis ce que tu veux faire avant de partir.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
          ) : isAlone ? (
            <div className="space-y-3">
              <div className="glass-card rounded-xl p-3 border border-amber-500/30 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Tu es le seul membre. Quitter <b>supprimera définitivement</b> la caisse
                  (cotisations, dépenses, postes — tout).
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full glass border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={saving}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Supprimer la caisse
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes les données seront perdues.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={doDeleteCaisse}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Option A: Transfer */}
              <div className="glass-card rounded-xl p-3 border border-emerald-500/20">
                <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-1">
                  <ArrowRight className="w-4 h-4 text-emerald-400" /> Transmettre et quitter
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Choisis le nouveau propriétaire. Tu seras retiré ensuite.
                </p>
                <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                  {otherCollabs.map(c => {
                    const meta = ROLE_META[c.role] || ROLE_META.viewer;
                    const Icon = meta.icon;
                    const display = c.full_name || c.email || "Utilisateur";
                    const selected = transferUserId === c.user_id;
                    return (
                      <button
                        key={c.user_id}
                        type="button"
                        onClick={() => setTransferUserId(c.user_id)}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 border transition-colors text-left ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border glass hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0">{display}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${meta.cls}`}>
                          <Icon className="w-2.5 h-2.5" /> {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  className="w-full"
                  disabled={!transferUserId || saving}
                  onClick={doTransferAndLeave}
                >
                  {saving ? "Transfert…" : "Transmettre et quitter"}
                </Button>
              </div>

              {/* Option B: Delete */}
              <div className="glass-card rounded-xl p-3 border border-destructive/20">
                <p className="text-sm font-bold text-destructive mb-1 flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> Tout supprimer
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  La caisse sera supprimée pour <b>tout le monde</b>. Action irréversible.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full glass border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={saving}
                    >
                      Supprimer la caisse
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer pour tout le monde ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est <b>irréversible</b>. Tous les collaborateurs perdront
                        l'accès et toutes les données seront effacées.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={doDeleteCaisse}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Tout supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveCaisseButton;
