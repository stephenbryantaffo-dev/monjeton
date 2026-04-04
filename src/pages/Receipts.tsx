import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Search, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface Receipt {
  id: string;
  user_id: string;
  image_base64: string | null;
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  date: string | null;
  category: string | null;
  type: string | null;
  wallet: string | null;
  raw_data: any;
  transaction_id: string | null;
  note: string | null;
  created_at: string;
}

const Receipts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

  useEffect(() => {
    if (user) fetchReceipts();
  }, [user]);

  const fetchReceipts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setReceipts((data as Receipt[]) || []);
    setLoading(false);
  };

  const deleteReceipt = async (id: string) => {
    await supabase.from("receipts").delete().eq("id", id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Reçu supprimé" });
  };

  const filtered = receipts.filter((r) => {
    const matchSearch =
      !search ||
      r.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      r.note?.toLowerCase().includes(search.toLowerCase());
    const matchMonth = !selectedMonth || r.date?.startsWith(selectedMonth);
    return matchSearch && matchMonth;
  });

  const totalAmount = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

  const exportPDF = () => {
    const receiptPages = filtered
      .map((r, index) => {
        const imageSection = r.image_base64
          ? `<div style="text-align:center;margin-top:16px"><img src="data:image/jpeg;base64,${r.image_base64}" style="max-width:100%;max-height:500px;border-radius:12px;border:1px solid #e5e7eb" /></div>`
          : `<div style="text-align:center;padding:40px;color:#9ca3af">📄 Aucune image disponible</div>`;

        return `
        <div class="receipt-block" style="page-break-inside:avoid;margin-bottom:32px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#65a30d,#84cc16);padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
            <span style="color:white;font-weight:700;font-size:16px">FACTURE #${String(index + 1).padStart(3, "0")}</span>
            <span style="color:white;font-size:12px;opacity:0.9">${r.transaction_id ? "✅ Liée" : "⚠️ Non liée"}</span>
          </div>
          <div style="padding:20px">
            <h3 style="margin:0 0 12px;font-size:14px;color:#65a30d">📊 Données extraites par l'IA</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:6px 0;color:#6b7280">Commerçant</td><td style="padding:6px 0;font-weight:600">${r.merchant || "Non détecté"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Date</td><td style="padding:6px 0">${r.date ? new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "Non détectée"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Montant</td><td style="padding:6px 0;font-weight:700;font-size:16px;color:#65a30d">${fmt(r.amount || 0)} ${r.currency || "XOF"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Catégorie</td><td style="padding:6px 0">${r.category || "Non catégorisé"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Paiement</td><td style="padding:6px 0">${r.wallet || "Non précisé"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Type</td><td style="padding:6px 0">${r.type === "income" ? "💚 Revenu" : "🔴 Dépense"}</td></tr>
              ${r.note ? `<tr><td style="padding:6px 0;color:#6b7280">Note</td><td style="padding:6px 0">${r.note}</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#6b7280">Scanné le</td><td style="padding:6px 0">${new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
            </table>
            <h3 style="margin:20px 0 8px;font-size:14px;color:#65a30d">🧾 Facture originale</h3>
            ${imageSection}
          </div>
        </div>`;
      })
      .join("");

    const summaryRows = filtered
      .map(
        (r) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6">${r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6">${r.merchant || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6">${r.category || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6">${r.wallet || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${fmt(r.amount || 0)} ${r.currency || "XOF"}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport d'audit - Mon Jeton</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px;color:#1f2937;background:#fff}
  @media print{body{padding:10px}.receipt-block{page-break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1 style="text-align:center;font-size:24px;margin-bottom:4px">🪙 MON JETON — Rapport d'Audit</h1>
<p style="text-align:center;color:#6b7280;font-size:13px">
  Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
  ${selectedMonth ? ` · Période : ${selectedMonth}` : ""}${search ? ` · Filtre : "${search}"` : ""}
</p>
<div style="text-align:center;margin:24px 0">
  <span style="font-size:36px;font-weight:800;color:#65a30d">${filtered.length}</span>
  <span style="display:block;color:#6b7280;font-size:13px">facture(s)</span>
  <span style="font-size:24px;font-weight:700;color:#1f2937;margin-top:8px;display:block">${fmt(totalAmount)} XOF</span>
  <span style="display:block;color:#6b7280;font-size:13px">montant total</span>
</div>
<h2 style="font-size:18px;margin:32px 0 12px">📋 Récapitulatif</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr style="background:#f9fafb">
    <th style="padding:8px;text-align:left">Date</th><th style="padding:8px;text-align:left">Commerçant</th>
    <th style="padding:8px;text-align:left">Catégorie</th><th style="padding:8px;text-align:left">Paiement</th>
    <th style="padding:8px;text-align:right">Montant</th>
  </tr></thead>
  <tbody>${summaryRows}
    <tr style="font-weight:700;border-top:2px solid #1f2937">
      <td colspan="4" style="padding:8px">TOTAL GÉNÉRAL</td>
      <td style="padding:8px;text-align:right">${fmt(totalAmount)} XOF</td>
    </tr>
  </tbody>
</table>
<h2 style="font-size:18px;margin:40px 0 16px">🧾 Détail des factures</h2>
${receiptPages}
<p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:40px;border-top:1px solid #e5e7eb;padding-top:16px">
  🪙 Mon Jeton — Document confidentiel à usage comptable · ${filtered.length} facture(s) · ${fmt(totalAmount)} XOF
</p>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    win?.addEventListener("load", () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 800);
    });
  };

  return (
    <DashboardLayout title="Mes Reçus">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 text-center"
          >
            <p className="text-xs text-muted-foreground">Total reçus</p>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-4 text-center"
          >
            <p className="text-xs text-muted-foreground">Montant total</p>
            <p className="text-2xl font-bold text-primary">{fmt(totalAmount)} F</p>
          </motion.div>
        </div>

        {/* Search & filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 bg-secondary border-border"
            />
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-secondary border border-border rounded-xl px-3 text-sm text-foreground"
          />
        </div>

        {/* Export */}
        <button
          onClick={exportPDF}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter rapport PDF d'audit
        </button>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Aucun reçu scanné pour l'instant</p>
            <p className="text-xs text-muted-foreground">Scanne une facture depuis l'assistant ou la page Scan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl p-3 flex gap-3 items-center"
              >
                {r.image_base64 ? (
                  <img
                    src={`data:image/jpeg;base64,${r.image_base64}`}
                    alt="reçu"
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {r.merchant || "Reçu scanné"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.category || "?"} · {r.date || "-"}
                  </p>
                  {r.wallet && (
                    <p className="text-[10px] text-muted-foreground/70">{r.wallet}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-primary">{fmt(r.amount || 0)} F</p>
                  <button
                    onClick={() => deleteReceipt(r.id)}
                    className="mt-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Receipts;
