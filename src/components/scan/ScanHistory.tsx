import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

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

const ScanHistory = ({ scans, onRefresh }: ScanHistoryProps) => {
  if (scans.length === 0) return (
    <div className="mt-6 glass-card rounded-2xl p-8 text-center">
      <span className="text-4xl">🧾</span>
      <p className="text-sm font-semibold text-foreground mt-3 mb-1">
        Aucun reçu scanné
      </p>
      <p className="text-xs text-muted-foreground">
        Scanne un ticket ou screenshot mobile money ci-dessus
      </p>
    </div>
  );

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Mes reçus ({scans.length})
        </h3>
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
        {scans.map((scan, i) => {
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
              {/* Miniature */}
              {scan.image_url ? (
                <img
                  src={scan.image_url}
                  alt="Reçu"
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">
                    {scan.scan_type === "screenshot" ? "📱" : "🧾"}
                  </span>
                </div>
              )}

              {/* Infos */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {scan.parsed_merchant ||
                    (scan.scan_type === "screenshot" ? "Mobile Money" : "Ticket")}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {scan.parsed_category || "Catégorie inconnue"} ·{" "}
                  {scan.parsed_date ||
                    new Date(scan.created_at).toLocaleDateString("fr-FR")}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                  <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>

              {/* Montant */}
              {scan.parsed_amount != null && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {Number(scan.parsed_amount).toLocaleString("fr-FR")} F
                  </p>
                  {scan.parsed_currency && scan.parsed_currency !== "XOF" && (
                    <p className="text-xs text-muted-foreground">
                      ({scan.parsed_currency})
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ScanHistory;
