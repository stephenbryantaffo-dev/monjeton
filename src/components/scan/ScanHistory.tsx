import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface ScanHistoryItem {
  id: string;
  scan_type: string;
  parsed_amount: number | null;
  parsed_merchant: string | null;
  status: string;
  created_at: string;
}

interface ScanHistoryProps {
  scans: ScanHistoryItem[];
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "En attente" },
  confirmed: { icon: CheckCircle, color: "text-primary", label: "Confirmé" },
  rejected: { icon: XCircle, color: "text-destructive", label: "Rejeté" },
};

const ScanHistory = ({ scans }: ScanHistoryProps) => {
  if (scans.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">Historique des scans</h3>
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
              <div className={`w-8 h-8 rounded-lg glass flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {scan.parsed_merchant || (scan.scan_type === "screenshot" ? "Mobile Money" : "Ticket")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(scan.created_at).toLocaleDateString("fr-FR")} · {cfg.label}
                </p>
              </div>
              {scan.parsed_amount && (
                <span className="text-sm font-semibold text-foreground">
                  {scan.parsed_amount.toLocaleString("fr-FR")} F
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ScanHistory;
