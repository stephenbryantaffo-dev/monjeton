import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, RefreshCw, Trash2, Download, Share2, Receipt, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getReceiptImageUrl } from "@/lib/receiptImageManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ScanHistoryItem {
  id: string;
  scan_type: string;
  parsed_amount: number | null;
  parsed_merchant: string | null;
  parsed_category: string | null;
  parsed_date: string | null;
  parsed_currency: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  storage_path?: string | null;
}

interface ScanHistoryProps {
  scans: ScanHistoryItem[];
  onRefresh?: () => void;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "En attente" },
  confirmed: { icon: CheckCircle, color: "text-primary", label: "Confirmé" },
  rejected: { icon: XCircle, color: "text-destructive", label: "Rejeté" },
};

const Thumb = ({ scan, onClick }: { scan: ScanHistoryItem; onClick: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getReceiptImageUrl(scan.storage_path, scan.image_url).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [scan.storage_path, scan.image_url]);

  if (url && !failed) {
    return (
      <button
        onClick={onClick}
        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border"
        aria-label="Voir l'image"
      >
        <img
          src={url}
          alt="Reçu"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      </button>
    );
  }

  return (
    <div className="w-14 h-14 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 border border-border">
      <Receipt className="w-6 h-6 text-muted-foreground" />
    </div>
  );
};

const ImageModal = ({
  scan,
  onClose,
  onDelete,
}: {
  scan: ScanHistoryItem;
  onClose: () => void;
  onDelete: () => void;
}) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getReceiptImageUrl(scan.storage_path, scan.image_url).then(setUrl);
  }, [scan.storage_path, scan.image_url]);

  const filename = `recu-${(scan.parsed_merchant || "scan").replace(/[^a-z0-9]+/gi, "-")}-${scan.id.slice(0, 8)}.jpg`;

  const handleDownload = async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast({ title: "Image téléchargée" });
    } catch (e: any) {
      toast({ title: "Téléchargement impossible", description: e?.message, variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "Reçu" });
      } else if (nav.share) {
        await nav.share({ title: "Reçu", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Lien copié" });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Partage impossible", description: e?.message, variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 bg-background border-border overflow-hidden">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="bg-black flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
            {url ? (
              <img src={url} alt="Reçu" className="max-w-full max-h-[70vh] object-contain" />
            ) : (
              <div className="p-12 text-muted-foreground text-sm">Chargement…</div>
            )}
          </div>
          <div className="p-3 flex items-center gap-2 border-t border-border">
            <button
              onClick={handleDownload}
              disabled={!url}
              className="flex-1 h-10 rounded-lg glass-card flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Télécharger
            </button>
            <button
              onClick={handleShare}
              disabled={!url}
              className="flex-1 h-10 rounded-lg glass-card flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" /> Partager
            </button>
            <button
              onClick={onDelete}
              className="h-10 px-4 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center gap-2 text-sm hover:bg-destructive/20"
            >
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ScanHistory = ({ scans, onRefresh }: ScanHistoryProps) => {
  const [toDelete, setToDelete] = useState<ScanHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewing, setViewing] = useState<ScanHistoryItem | null>(null);

  // Dedupe: same storage_path = same image scan, show once (the most recent)
  const display = useMemo(() => {
    const seen = new Set<string>();
    const out: ScanHistoryItem[] = [];
    for (const s of scans) {
      const key = s.storage_path || `id:${s.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }, [scans]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      // Best-effort: delete file from storage
      if (toDelete.storage_path) {
        const { error: storageErr } = await supabase.storage
          .from("receipts")
          .remove([toDelete.storage_path]);
        if (storageErr) console.warn("Storage delete error:", storageErr);
      }
      // Delete ALL receipt_scans pointing to this same image (keeps transactions intact)
      if (toDelete.storage_path) {
        const { error } = await supabase
          .from("receipt_scans")
          .delete()
          .eq("storage_path", toDelete.storage_path);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("receipt_scans")
          .delete()
          .eq("id", toDelete.id);
        if (error) throw error;
      }
      toast({
        title: "🗑️ Image supprimée",
        description: "Transactions conservées",
      });
      setToDelete(null);
      setViewing(null);
      onRefresh?.();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (display.length === 0)
    return (
      <div className="mt-6 glass-card rounded-2xl p-8 text-center">
        <span className="text-4xl">🧾</span>
        <p className="text-sm font-semibold text-foreground mt-3 mb-1">Aucun reçu scanné</p>
        <p className="text-xs text-muted-foreground">
          Scanne un ticket ou screenshot mobile money ci-dessus
        </p>
      </div>
    );

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Mes reçus ({display.length})</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-primary flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Actualiser
          </button>
        )}
      </div>
      <div className="space-y-2">
        {display.map((scan, i) => {
          const cfg = statusConfig[scan.status] || statusConfig.pending;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 * i }}
              className="glass-card rounded-xl p-3 flex items-center gap-3"
            >
              <Thumb scan={scan} onClick={() => setViewing(scan)} />

              <button
                onClick={() => setViewing(scan)}
                className="flex-1 min-w-0 overflow-hidden text-left"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {scan.parsed_merchant ||
                    (scan.scan_type === "screenshot" ? "Mobile Money" : "Ticket")}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {scan.parsed_category || "Catégorie inconnue"} ·{" "}
                  {scan.parsed_date || new Date(scan.created_at).toLocaleDateString("fr-FR")}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                  <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                </div>
              </button>

              {scan.parsed_amount != null && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {Number(scan.parsed_amount).toLocaleString("fr-FR")}
                  </p>
                  {scan.parsed_currency && scan.parsed_currency !== "XOF" && (
                    <p className="text-xs text-muted-foreground">({scan.parsed_currency})</p>
                  )}
                </div>
              )}

              <button
                onClick={() => setToDelete(scan)}
                className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Supprimer le scan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {viewing && (
        <ImageModal
          scan={viewing}
          onClose={() => setViewing(null)}
          onDelete={() => setToDelete(viewing)}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'image ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'image sera supprimée définitivement. Les transactions associées seront conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScanHistory;
