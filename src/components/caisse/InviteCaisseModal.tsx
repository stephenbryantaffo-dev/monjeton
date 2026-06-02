import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Share2, Link2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caisseId: string;
  caisseName: string;
}

const InviteCaisseModal = ({ open, onOpenChange, caisseId, caisseName }: Props) => {
  const [role, setRole] = useState<"viewer" | "manager">("viewer");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLink(null);
      setRole("viewer");
    }
  }, [open]);

  const generateLink = async () => {
    setGenerating(true);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Tu dois être connecté.");
      setGenerating(false);
      return;
    }

    const { data, error } = await supabase
      .from("caisse_invites" as any)
      .insert({
        caisse_id: caisseId,
        role,
        created_by: user.id,
        expires_at: expiresAt,
      } as any)
      .select("token")
      .single();

    setGenerating(false);

    if (error || !data) {
      toast.error("Impossible de générer le lien.");
      return;
    }
    const token = (data as any).token;
    setLink(`${window.location.origin}/rejoindre-caisse/${token}`);
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Lien copié 📋");
    } catch {
      toast.error("Copie impossible. Sélectionne le lien manuellement.");
    }
  };

  const shareWhatsApp = () => {
    if (!link) return;
    const text = `Rejoins notre caisse « ${caisseName} » sur Mon Jeton : ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Inviter à suivre la caisse
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Rôle attribué</Label>
            <Select value={role} onValueChange={(v) => { setRole(v as any); setLink(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div className="flex flex-col">
                    <span className="font-medium">Observateur</span>
                    <span className="text-xs text-muted-foreground">Voit tout, ne modifie rien</span>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex flex-col">
                    <span className="font-medium">Co-gestionnaire</span>
                    <span className="text-xs text-muted-foreground">Peut ajouter cotisations, dépenses, membres</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Le lien expire dans 7 jours.
            </p>
          </div>

          {!link ? (
            <Button
              onClick={generateLink}
              disabled={generating}
              className="w-full gradient-primary text-primary-foreground"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Génération...</>
              ) : (
                <><Link2 className="w-4 h-4 mr-2" /> Générer le lien</>
              )}
            </Button>
          ) : (
            <div className="space-y-2.5">
              <div className="glass rounded-xl p-3 border border-primary/20">
                <p className="text-[11px] text-muted-foreground mb-1">Lien à partager</p>
                <p className="text-xs font-mono text-foreground break-all">{link}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyLink} variant="outline" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" /> Copier
                </Button>
                <Button onClick={shareWhatsApp} className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white">
                  <Share2 className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
              </div>
              <button
                onClick={() => setLink(null)}
                className="w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1 mt-1"
              >
                <RefreshCw className="w-3 h-3" /> Générer un autre lien
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteCaisseModal;
