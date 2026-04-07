import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowLeft, Edit3, CheckCircle2, XCircle, Clock,
  ChevronRight, ArrowUpDown, ShieldAlert, Eye, EyeOff, Lock,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ReceiptsPinLock from "@/components/ReceiptsPinLock";

interface ScanItem {
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
  extracted_text: string | null;
}

interface HistoryEntry {
  id: string;
  changed_at: string;
  changed_field: string;
  old_value: string | null;
  new_value: string | null;
  change_reason: string | null;
}

type FilterStatus = "all" | "confirmed" | "pending" | "rejected";

const MASK = "•••••";
const MASK_SHORT = "••••";

const Receipts = () => {
  const { user } = useAuth();
  const { formatAmount, pinEnabled, isDiscreetMode } = usePrivacy();
  const { toast } = useToast();

  // PIN gate — resets every mount so PIN is asked each visit
  const [isUnlocked, setIsUnlocked] = useState(!pinEnabled);

  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");

  // Detail view
  const [selectedScan, setSelectedScan] = useState<ScanItem | null>(null);
  const [scanHistory, setScanHistory] = useState<HistoryEntry[]>([]);

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    if (user && isUnlocked) fetchScans();
  }, [user, isUnlocked]);

  // Show PIN lock if enabled and not yet unlocked
  if (pinEnabled && !isUnlocked) {
    return <ReceiptsPinLock onUnlocked={() => setIsUnlocked(true)} />;
  }

  const fetchScans = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("receipt_scans")
      .select("id, scan_type, parsed_amount, parsed_merchant, parsed_category, parsed_date, parsed_currency, image_url, status, created_at, extracted_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setScans((data as unknown as ScanItem[]) || []);
    setLoading(false);
  };

  const loadScanHistory = async (scanId: string) => {
    const { data } = await supabase
      .from("receipt_scan_history")
      .select("id, changed_at, changed_field, old_value, new_value, change_reason")
      .eq("scan_id", scanId)
      .order("changed_at", { ascending: false });
    setScanHistory((data as unknown as HistoryEntry[]) || []);
  };

  // Stats
  const stats = {
    totalScans: scans.length,
    totalConfirmed: scans.filter((s) => s.status === "confirmed").length,
    totalRejected: scans.filter((s) => s.status === "rejected").length,
    totalAmount: scans
      .filter((s) => s.status === "confirmed")
      .reduce((sum, s) => sum + (s.parsed_amount || 0), 0),
    thisMonthAmount: scans
      .filter((s) => {
        if (s.status !== "confirmed") return false;
        const d = new Date(s.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, s) => sum + (s.parsed_amount || 0), 0),
    byCategory: scans
      .filter((s) => s.status === "confirmed" && s.parsed_category)
      .reduce((acc, s) => {
        const cat = s.parsed_category!;
        acc[cat] = (acc[cat] || 0) + (s.parsed_amount || 0);
        return acc;
      }, {} as Record<string, number>),
  };

  // Filtering & sorting
  const filteredScans = scans
    .filter((s) => filter === "all" || s.status === filter)
    .filter(
      (s) =>
        !searchText ||
        s.parsed_merchant?.toLowerCase().includes(searchText.toLowerCase()) ||
        s.parsed_category?.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === "date"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : (b.parsed_amount || 0) - (a.parsed_amount || 0)
    );

  const openDetail = async (scan: ScanItem) => {
    setSelectedScan(scan);
    await loadScanHistory(scan.id);
  };

  const openEdit = () => {
    if (!selectedScan) return;
    setEditMerchant(selectedScan.parsed_merchant || "");
    setEditAmount(String(selectedScan.parsed_amount || ""));
    setEditCategory(selectedScan.parsed_category || "");
    setEditReason("");
    setShowEditDialog(true);
  };

  const saveEdit = async () => {
    if (!selectedScan || !user) return;
    const changes: any[] = [];
    if (editMerchant !== (selectedScan.parsed_merchant || "")) {
      changes.push({
        scan_id: selectedScan.id,
        user_id: user.id,
        changed_field: "Marchand",
        old_value: selectedScan.parsed_merchant,
        new_value: editMerchant,
        change_reason: editReason,
      });
    }
    if (Number(editAmount) !== (selectedScan.parsed_amount || 0)) {
      changes.push({
        scan_id: selectedScan.id,
        user_id: user.id,
        changed_field: "Montant",
        old_value: String(selectedScan.parsed_amount),
        new_value: editAmount,
        change_reason: editReason,
      });
    }
    if (editCategory !== (selectedScan.parsed_category || "")) {
      changes.push({
        scan_id: selectedScan.id,
        user_id: user.id,
        changed_field: "Catégorie",
        old_value: selectedScan.parsed_category,
        new_value: editCategory,
        change_reason: editReason,
      });
    }

    if (changes.length > 0) {
      await supabase.from("receipt_scan_history").insert(changes);
    }

    await supabase
      .from("receipt_scans")
      .update({
        parsed_merchant: editMerchant || null,
        parsed_amount: Number(editAmount) || null,
        parsed_category: editCategory || null,
      })
      .eq("id", selectedScan.id);

    toast({
      title: "Reçu modifié ✅",
      description: `${changes.length} champ(s) mis à jour`,
    });
    setShowEditDialog(false);
    await fetchScans();
    const updated = scans.find((s) => s.id === selectedScan.id);
    if (updated) {
      setSelectedScan({
        ...selectedScan,
        parsed_merchant: editMerchant || null,
        parsed_amount: Number(editAmount) || null,
        parsed_category: editCategory || null,
      });
    }
    await loadScanHistory(selectedScan.id);
  };

  // Helper: mask text in discreet mode
  const maskText = (text: string | null, fallback: string) => {
    if (isDiscreetMode) return MASK;
    return text || fallback;
  };

  // Discreet mode banner
  const DiscreetBanner = () =>
    isDiscreetMode ? (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 flex items-center gap-3 border border-primary/20"
      >
        <EyeOff className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            Mode discret activé — données masquées
          </p>
          <p className="text-xs text-muted-foreground">
            Désactive dans Paramètres
          </p>
        </div>
      </motion.div>
    ) : null;

  // ━━━━━━━━━ Detail view ━━━━━━━━━
  if (selectedScan) {
    return (
      <DashboardLayout title="Détail du reçu">
        <div className="space-y-4">
          <DiscreetBanner />

          {/* Back button */}
          <button
            onClick={() => setSelectedScan(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Retour aux reçus
          </button>

          {/* Image — blurred in discreet mode */}
          {selectedScan.image_url && (
            <div className="relative">
              <img
                src={selectedScan.image_url}
                alt="Reçu original"
                className={`w-full rounded-2xl object-contain max-h-64 border border-border ${
                  isDiscreetMode ? "blur-lg" : ""
                }`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {isDiscreetMode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Mode discret activé</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extracted data — masked in discreet mode */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Données extraites</h3>
            {[
              {
                label: "Marchand",
                value: isDiscreetMode ? MASK : selectedScan.parsed_merchant,
              },
              {
                label: "Montant",
                value: isDiscreetMode
                  ? `${MASK_SHORT} F`
                  : selectedScan.parsed_amount
                  ? `${Number(selectedScan.parsed_amount).toLocaleString("fr-FR")} F`
                  : null,
              },
              {
                label: "Devise",
                value: isDiscreetMode ? MASK_SHORT : selectedScan.parsed_currency,
              },
              {
                label: "Catégorie",
                value: isDiscreetMode ? MASK : selectedScan.parsed_category,
              },
              { label: "Date", value: selectedScan.parsed_date },
              {
                label: "Type",
                value:
                  selectedScan.scan_type === "screenshot"
                    ? "Capture mobile money"
                    : "Ticket de caisse",
              },
              {
                label: "Statut",
                value:
                  selectedScan.status === "confirmed"
                    ? "✅ Confirmé"
                    : selectedScan.status === "rejected"
                    ? "❌ Rejeté"
                    : "⏳ En attente",
              },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
              ))}
          </div>

          {/* Audit trail */}
          {scanHistory.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Historique des modifications
              </h3>
              {scanHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{h.changed_field}</span> modifié
                      {h.old_value && h.new_value && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {isDiscreetMode ? MASK_SHORT : h.old_value} →{" "}
                          {isDiscreetMode ? MASK_SHORT : h.new_value}
                        </span>
                      )}
                    </p>
                    {h.change_reason && (
                      <p className="text-xs text-muted-foreground italic">
                        Raison : {h.change_reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.changed_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit button for confirmed scans */}
          {selectedScan.status === "confirmed" && (
            <button
              onClick={openEdit}
              className="w-full glass-card rounded-xl p-3.5 flex items-center justify-center gap-2 border border-border"
            >
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Modifier ce reçu</span>
            </button>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="glass-card border-border">
            <DialogTitle>Modifier le reçu</DialogTitle>
            <p className="text-xs text-muted-foreground -mt-2 mb-4">
              ⚠️ Toute modification sera tracée dans l'historique
            </p>
            <div className="space-y-3">
              <div>
                <Label>Marchand</Label>
                <Input
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label>Montant (F CFA)</Label>
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div>
                <Label className="text-destructive text-xs">
                  Raison de la modification (obligatoire)
                </Label>
                <Input
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ex: Montant mal reconnu par l'IA..."
                  className="bg-secondary border-border mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  disabled={!editReason.trim()}
                  onClick={saveEdit}
                  className="flex-1 gradient-primary text-primary-foreground"
                >
                  Confirmer la modification
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // ━━━━━━━━━ Main list view ━━━━━━━━━
  return (
    <DashboardLayout title="Mes Reçus">
      <div className="space-y-4">
        <DiscreetBanner />

        {/* Stats row 1 */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">Total des reçus confirmés</p>
            <p className="text-2xl font-bold text-primary tabular-nums">
              {formatAmount(stats.totalAmount)} F
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalConfirmed} reçu{stats.totalConfirmed > 1 ? "s" : ""}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">Ce mois-ci</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatAmount(stats.thisMonthAmount)} F
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
          </motion.div>
        </div>

        {/* Stats row 2 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Scannés</p>
            <p className="text-lg font-bold text-foreground">{stats.totalScans}</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Confirmés</p>
            <p className="text-lg font-bold text-primary">{stats.totalConfirmed}</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Rejetés</p>
            <p className="text-lg font-bold text-destructive">{stats.totalRejected}</p>
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3">
              Répartition par catégorie
            </p>
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([cat, amount]) => {
                const pct = stats.totalAmount > 0 ? Math.round((amount / stats.totalAmount) * 100) : 0;
                return (
                  <div key={cat} className="mb-2.5">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{cat}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {isDiscreetMode
                          ? `${MASK_SHORT} F · ••%`
                          : `${amount.toLocaleString("fr-FR")} F · ${pct}%`}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className="h-1.5 gradient-primary rounded-full transition-all"
                        style={{ width: isDiscreetMode ? "0%" : `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "confirmed", "pending", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? "gradient-primary text-primary-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {f === "all"
                ? `Tous (${stats.totalScans})`
                : f === "confirmed"
                ? `✅ Confirmés (${stats.totalConfirmed})`
                : f === "pending"
                ? "⏳ En attente"
                : `❌ Rejetés (${stats.totalRejected})`}
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un marchand, catégorie..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-secondary border-border pl-9"
            />
          </div>
          <button
            onClick={() => setSortBy(sortBy === "date" ? "amount" : "date")}
            className="glass-card rounded-xl px-3 flex items-center gap-1 text-xs text-muted-foreground"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortBy === "date" ? "Date" : "Montant"}
          </button>
        </div>

        {/* Scan list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <span className="text-4xl">🧾</span>
            <p className="text-sm font-semibold text-foreground mt-3 mb-1">
              Aucun reçu trouvé
            </p>
            <p className="text-xs text-muted-foreground">
              Scanne un ticket depuis la page Scan
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredScans.map((scan, i) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
                onClick={() => openDetail(scan)}
                className="glass-card rounded-xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              >
                {scan.image_url ? (
                  <img
                    src={scan.image_url}
                    alt="Reçu"
                    className={`w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border ${
                      isDiscreetMode ? "blur-sm" : ""
                    }`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">
                      {scan.scan_type === "screenshot" ? "📱" : "🧾"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {isDiscreetMode ? MASK : (scan.parsed_merchant || "Marchand inconnu")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isDiscreetMode ? MASK : (scan.parsed_category || "Catégorie inconnue")} ·{" "}
                    {scan.parsed_date ||
                      new Date(scan.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <span
                    className={`text-xs font-medium mt-0.5 inline-block ${
                      scan.status === "confirmed"
                        ? "text-primary"
                        : scan.status === "rejected"
                        ? "text-destructive"
                        : "text-yellow-500"
                    }`}
                  >
                    {scan.status === "confirmed"
                      ? "✅ Confirmé"
                      : scan.status === "rejected"
                      ? "❌ Rejeté"
                      : "⏳ En attente"}
                  </span>
                </div>
                {scan.parsed_amount != null && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {isDiscreetMode
                        ? `${MASK_SHORT} F`
                        : `${Number(scan.parsed_amount).toLocaleString("fr-FR")} F`}
                    </p>
                    {scan.parsed_currency && scan.parsed_currency !== "XOF" && !isDiscreetMode && (
                      <p className="text-xs text-muted-foreground">
                        ({scan.parsed_currency})
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Receipts;
