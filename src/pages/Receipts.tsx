import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, Search, Trash2, Plus, Camera, Image as ImageIcon,
  X, ArrowLeft, Edit2, Link as LinkIcon, Archive, CheckCircle2, Loader2,
  ChevronDown, BarChart3, Store, Tag,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface Receipt {
  id: string;
  user_id: string;
  image_base64: string | null;
  image_path: string | null;
  total_amount: number | null;
  currency: string | null;
  merchant_name: string | null;
  receipt_date: string | null;
  category: string | null;
  type: string | null;
  wallet: string | null;
  raw_data: any;
  items: ReceiptItem[] | null;
  transaction_id: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

const statusFilters = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "confirmed", label: "Confirmés" },
  { key: "archived", label: "Archivés" },
];

const statusBadge: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-[hsl(45,96%,58%)]/20 text-[hsl(45,96%,58%)]" },
  confirmed: { label: "Confirmé", color: "bg-primary/20 text-primary" },
  archived: { label: "Archivé", color: "bg-muted text-muted-foreground" },
};

const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

const Receipts = () => {
  const { user } = useAuth();
  const { formatAmount } = usePrivacy();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Edit state
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editing, setEditing] = useState(false);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Link to transaction
  const [transactions, setTransactions] = useState<any[]>([]);
  const [linkTxOpen, setLinkTxOpen] = useState(false);

  // Image zoom
  const [zoomOpen, setZoomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"gallery" | "accounting">("gallery");

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
    setReceipts((data as unknown as Receipt[]) || []);
    setLoading(false);
  };

  const deleteReceipt = async (id: string) => {
    const receipt = receipts.find(r => r.id === id);
    if (receipt?.image_path) {
      await supabase.storage.from("receipts").remove([receipt.image_path]);
    }
    await supabase.from("receipts").delete().eq("id", id);
    setReceipts(prev => prev.filter(r => r.id !== id));
    if (selectedReceipt?.id === id) { setDetailOpen(false); setSelectedReceipt(null); }
    toast({ title: "Reçu supprimé" });
  };

  const archiveReceipt = async (id: string) => {
    await supabase.from("receipts").update({ status: "archived" } as any).eq("id", id);
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, status: "archived" } : r));
    if (selectedReceipt?.id === id) setSelectedReceipt(prev => prev ? { ...prev, status: "archived" } : null);
    toast({ title: "Reçu archivé" });
  };

  const saveEdit = async () => {
    if (!selectedReceipt) return;
    const updates: any = {
      merchant_name: editMerchant || null,
      total_amount: editAmount ? Number(editAmount) : null,
      receipt_date: editDate || null,
    };
    await supabase.from("receipts").update(updates).eq("id", selectedReceipt.id);
    setReceipts(prev => prev.map(r => r.id === selectedReceipt.id ? { ...r, ...updates } : r));
    setSelectedReceipt(prev => prev ? { ...prev, ...updates } : null);
    setEditing(false);
    toast({ title: "Reçu mis à jour ✅" });
  };

  // Scan flow
  const handleFileSelected = (f: File) => {
    setScanFile(f);
    setAddMenuOpen(false);
    const reader = new FileReader();
    reader.onload = () => {
      setScanPreview(reader.result as string);
      setScanning(true);
    };
    reader.readAsDataURL(f);
  };

  const analyzeScan = async () => {
    if (!user || !scanFile || !scanPreview) return;
    setAnalyzing(true);
    try {
      const path = `${user.id}/${Date.now()}.jpg`;
      await supabase.storage.from("receipts").upload(path, scanFile);

      const base64 = scanPreview.split(",")[1];
      const resp = await supabase.functions.invoke("scan-receipt", {
        body: { image: base64, scanType: "receipt", mimeType: scanFile.type },
      });
      if (resp.error) throw resp.error;
      const parsed = resp.data?.parsed || {};

      const base64Data = scanPreview.split(",")[1] || "";
      const { data: newReceipt } = await supabase.from("receipts").insert({
        user_id: user.id,
        image_base64: base64Data.length > 500000 ? base64Data.slice(0, 500000) : base64Data,
        image_path: path,
        total_amount: parsed.amount || null,
        currency: parsed.currency || "XOF",
        merchant_name: parsed.merchant || null,
        receipt_date: parsed.date || new Date().toISOString().split("T")[0],
        category: parsed.category || null,
        type: parsed.type || "expense",
        wallet: parsed.wallet || null,
        raw_data: parsed,
        items: parsed.items || null,
        status: "pending",
      } as any).select().single();

      if (newReceipt) {
        setReceipts(prev => [newReceipt as unknown as Receipt, ...prev]);
        toast({ title: "🧾 Reçu analysé et sauvegardé !" });
        setSelectedReceipt(newReceipt as unknown as Receipt);
        setEditMerchant((newReceipt as any).merchant_name || "");
        setEditAmount(String((newReceipt as any).total_amount || ""));
        setEditDate((newReceipt as any).receipt_date || "");
        setEditing(true);
        setDetailOpen(true);
      }
      setScanning(false);
      setScanPreview(null);
      setScanFile(null);
    } catch (err: any) {
      toast({ title: "Erreur d'analyse", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  // Link to transaction
  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase.from("transactions")
      .select("id, note, amount, date, categories(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50);
    setTransactions(data || []);
    setLinkTxOpen(true);
  };

  const linkTransaction = async (txId: string) => {
    if (!selectedReceipt) return;
    await supabase.from("receipts").update({ transaction_id: txId, status: "confirmed" } as any).eq("id", selectedReceipt.id);
    setReceipts(prev => prev.map(r => r.id === selectedReceipt.id ? { ...r, transaction_id: txId, status: "confirmed" } : r));
    setSelectedReceipt(prev => prev ? { ...prev, transaction_id: txId, status: "confirmed" } : null);
    setLinkTxOpen(false);
    toast({ title: "Reçu lié à la transaction ✅" });
  };

  const createTxFromReceipt = async () => {
    if (!user || !selectedReceipt) return;
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: selectedReceipt.type || "expense",
      amount: selectedReceipt.total_amount || 0,
      date: selectedReceipt.receipt_date || new Date().toISOString().split("T")[0],
      note: selectedReceipt.merchant_name ? `Scan: ${selectedReceipt.merchant_name}` : "Scan",
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("receipts").update({ status: "confirmed" } as any).eq("id", selectedReceipt.id);
    setReceipts(prev => prev.map(r => r.id === selectedReceipt.id ? { ...r, status: "confirmed" } : r));
    setSelectedReceipt(prev => prev ? { ...prev, status: "confirmed" } : null);
    toast({ title: "Transaction créée depuis le reçu ✅" });
  };

  // Filtering
  const filtered = receipts.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchMerchant = r.merchant_name?.toLowerCase().includes(s);
      const matchAmount = String(r.total_amount || "").includes(s);
      if (!matchMerchant && !matchAmount) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  // Export PDF
  const exportPDF = () => {
    const receiptPages = filtered.map((r, i) => {
      const img = r.image_base64
        ? `<img src="data:image/jpeg;base64,${r.image_base64}" style="max-width:100%;max-height:400px;border-radius:12px" />`
        : `<div style="padding:40px;color:#9ca3af;text-align:center">📄 Pas d'image</div>`;
      const itemsSection = r.items && Array.isArray(r.items) && r.items.length > 0
        ? `<h4 style="margin:12px 0 4px;font-size:13px;color:#65a30d">Articles détectés</h4>
           <table style="width:100%;font-size:12px;border-collapse:collapse">
             <tr style="background:#f9fafb"><th style="padding:4px;text-align:left">Article</th><th style="padding:4px;text-align:center">Qté</th><th style="padding:4px;text-align:right">Prix</th></tr>
             ${(r.items as ReceiptItem[]).map(it => `<tr><td style="padding:4px">${it.name}</td><td style="padding:4px;text-align:center">${it.quantity}</td><td style="padding:4px;text-align:right">${fmt(it.price)} F</td></tr>`).join("")}
           </table>`
        : "";
      return `<div style="page-break-inside:avoid;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#65a30d,#84cc16);padding:12px 16px;display:flex;justify-content:space-between">
          <span style="color:white;font-weight:700">#${String(i + 1).padStart(3, "0")}</span>
          <span style="color:white;font-size:12px">${(statusBadge[r.status] || statusBadge.pending).label}</span>
        </div>
        <div style="padding:16px">
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:4px 0;color:#6b7280">Commerçant</td><td style="padding:4px 0;font-weight:600">${r.merchant_name || "-"}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280">Date</td><td style="padding:4px 0">${r.receipt_date ? new Date(r.receipt_date).toLocaleDateString("fr-FR") : "-"}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280">Montant</td><td style="padding:4px 0;font-weight:700;color:#65a30d">${fmt(r.total_amount || 0)} ${r.currency || "XOF"}</td></tr>
          </table>
          ${itemsSection}
          <div style="margin-top:12px;text-align:center">${img}</div>
        </div>
      </div>`;
    }).join("");

    const csvRows = filtered.map(r =>
      `<tr><td style="padding:6px;border-bottom:1px solid #f3f4f6">${r.receipt_date || "-"}</td>
       <td style="padding:6px;border-bottom:1px solid #f3f4f6">${r.merchant_name || "-"}</td>
       <td style="padding:6px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${fmt(r.total_amount || 0)} F</td>
       <td style="padding:6px;border-bottom:1px solid #f3f4f6">${(statusBadge[r.status] || statusBadge.pending).label}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçus - Mon Jeton</title>
<style>body{font-family:-apple-system,sans-serif;margin:0;padding:30px;color:#1f2937}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<h1 style="text-align:center;font-size:22px">🪙 MON JETON — Mes Reçus</h1>
<p style="text-align:center;color:#6b7280;font-size:12px">Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
<div style="text-align:center;margin:20px 0"><span style="font-size:32px;font-weight:800;color:#65a30d">${filtered.length}</span> reçu(s) · <span style="font-size:20px;font-weight:700">${fmt(totalAmount)} XOF</span></div>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
<thead><tr style="background:#f9fafb"><th style="padding:6px;text-align:left">Date</th><th style="padding:6px;text-align:left">Commerçant</th><th style="padding:6px;text-align:right">Montant</th><th style="padding:6px">Statut</th></tr></thead>
<tbody>${csvRows}<tr style="font-weight:700;border-top:2px solid #1f2937"><td colspan="2" style="padding:6px">TOTAL</td><td style="padding:6px;text-align:right">${fmt(totalAmount)} F</td><td></td></tr></tbody></table>
${receiptPages}
<p style="text-align:center;color:#9ca3af;font-size:10px;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:30px">Mon Jeton — Confidentiel</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    win?.addEventListener("load", () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 800); });
  };

  const exportCSV = () => {
    const header = "Date,Commerçant,Montant,Devise,Statut\n";
    const rows = filtered.map(r =>
      `${r.receipt_date || ""},${(r.merchant_name || "").replace(/,/g, " ")},${r.total_amount || 0},${r.currency || "XOF"},${r.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recus_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "CSV exporté ✅" });
  };

  const openDetail = (r: Receipt) => {
    setSelectedReceipt(r);
    setEditMerchant(r.merchant_name || "");
    setEditAmount(String(r.total_amount || ""));
    setEditDate(r.receipt_date || "");
    setEditing(false);
    setDetailOpen(true);
  };

  return (
    <DashboardLayout title="Mes Reçus">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />

      {/* Scan overlay */}
      <AnimatePresence>
        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-6">
            <button onClick={() => { setScanning(false); setScanPreview(null); setScanFile(null); }} className="absolute top-6 right-6 text-muted-foreground">
              <X className="w-6 h-6" />
            </button>
            {scanPreview && (
              <img src={scanPreview} alt="preview" className="max-h-[50vh] rounded-2xl mb-6 object-contain" />
            )}
            {analyzing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Analyse IA en cours...</p>
              </div>
            ) : (
              <Button onClick={analyzeScan} className="gradient-primary text-primary-foreground px-8">
                Analyser ce reçu
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Total reçus</p>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Montant total</p>
            <p className="text-2xl font-bold text-primary">{formatAmount(totalAmount)} F</p>
          </motion.div>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === f.key ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par marchand ou montant..." className="pl-9 bg-secondary border-border" />
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <Button onClick={exportPDF} variant="outline" className="flex-1 glass" size="sm">
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button onClick={exportCSV} variant="outline" className="flex-1 glass" size="sm">
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>

        {/* Receipt grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Aucun reçu</p>
            <p className="text-xs text-muted-foreground">Scanne un reçu avec le bouton +</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openDetail(r)}
                className="cursor-pointer"
              >
                <BorderRotate className="overflow-hidden" animationSpeed={18}>
                  {/* Thumbnail */}
                  <div className="h-28 bg-secondary flex items-center justify-center overflow-hidden">
                    {r.image_base64 ? (
                      <img src={`data:image/jpeg;base64,${r.image_base64}`} alt="reçu" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-semibold text-foreground truncate">{r.merchant_name || "Reçu scanné"}</p>
                    <p className="text-sm font-bold text-primary">{formatAmount(r.total_amount || 0)} F</p>
                    <p className="text-[10px] text-muted-foreground">{r.receipt_date ? new Date(r.receipt_date).toLocaleDateString("fr-FR") : "-"}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${(statusBadge[r.status] || statusBadge.pending).color}`}>
                        {(statusBadge[r.status] || statusBadge.pending).label}
                      </span>
                      {r.transaction_id && <span className="text-[10px] text-primary">✅ Lié</span>}
                    </div>
                  </div>
                </BorderRotate>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* FAB + button */}
      <div className="fixed bottom-24 right-5 z-40">
        <AnimatePresence>
          {addMenuOpen && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-3 space-y-2">
              <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-2 glass rounded-full px-4 py-2.5 text-sm font-medium text-foreground shadow-lg w-full">
                <Camera className="w-4 h-4 text-primary" /> Prendre une photo
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 glass rounded-full px-4 py-2.5 text-sm font-medium text-foreground shadow-lg w-full">
                <ImageIcon className="w-4 h-4 text-primary" /> Depuis la galerie
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setAddMenuOpen(v => !v)}
          className="w-14 h-14 rounded-full gradient-primary neon-glow shadow-lg flex items-center justify-center"
        >
          <Plus className={`w-6 h-6 text-primary-foreground transition-transform ${addMenuOpen ? "rotate-45" : ""}`} />
        </button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedReceipt && (
            <div className="space-y-4">
              {/* Image with zoom */}
              {selectedReceipt.image_base64 ? (
                <div className="relative rounded-xl overflow-hidden cursor-pointer" onClick={() => setZoomOpen(true)}>
                  <img src={`data:image/jpeg;base64,${selectedReceipt.image_base64}`} alt="reçu" className="w-full max-h-64 object-contain bg-secondary rounded-xl" />
                  <div className="absolute bottom-2 right-2 bg-background/80 rounded-full px-2 py-1 text-[10px] text-muted-foreground">Tap pour agrandir</div>
                </div>
              ) : (
                <div className="h-32 bg-secondary rounded-xl flex items-center justify-center">
                  <FileText className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}

              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${(statusBadge[selectedReceipt.status] || statusBadge.pending).color}`}>
                  {(statusBadge[selectedReceipt.status] || statusBadge.pending).label}
                </span>
                <button onClick={() => setEditing(v => !v)} className="text-xs text-primary flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> {editing ? "Annuler" : "Modifier"}
                </button>
              </div>

              {/* Editable fields */}
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Commerçant</label>
                    <Input value={editMerchant} onChange={e => setEditMerchant(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Montant</label>
                    <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Date</label>
                    <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <Button onClick={saveEdit} className="w-full gradient-primary text-primary-foreground">Enregistrer</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-xs text-muted-foreground">Commerçant</span><span className="text-sm font-medium text-foreground">{selectedReceipt.merchant_name || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-muted-foreground">Montant</span><span className="text-sm font-bold text-primary">{formatAmount(selectedReceipt.total_amount || 0)} {selectedReceipt.currency || "XOF"}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-muted-foreground">Date</span><span className="text-sm text-foreground">{selectedReceipt.receipt_date ? new Date(selectedReceipt.receipt_date).toLocaleDateString("fr-FR") : "-"}</span></div>
                  {selectedReceipt.category && <div className="flex justify-between"><span className="text-xs text-muted-foreground">Catégorie</span><span className="text-sm text-foreground">{selectedReceipt.category}</span></div>}
                </div>
              )}

              {/* Items */}
              {selectedReceipt.items && Array.isArray(selectedReceipt.items) && selectedReceipt.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Articles détectés</h4>
                  <div className="space-y-1">
                    {(selectedReceipt.items as ReceiptItem[]).map((it, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-foreground">{it.name} ×{it.quantity}</span>
                        <span className="text-muted-foreground">{fmt(it.price)} F</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {!selectedReceipt.transaction_id && (
                  <>
                    <Button onClick={fetchTransactions} variant="outline" className="w-full glass" size="sm">
                      <LinkIcon className="w-4 h-4 mr-1" /> Lier à une transaction
                    </Button>
                    <Button onClick={createTxFromReceipt} className="w-full gradient-primary text-primary-foreground" size="sm">
                      <Plus className="w-4 h-4 mr-1" /> Créer une transaction
                    </Button>
                  </>
                )}
                {selectedReceipt.transaction_id && (
                  <p className="text-xs text-primary text-center">✅ Lié à une transaction</p>
                )}
                {selectedReceipt.status !== "archived" && (
                  <Button onClick={() => archiveReceipt(selectedReceipt.id)} variant="outline" className="w-full glass" size="sm">
                    <Archive className="w-4 h-4 mr-1" /> Archiver
                  </Button>
                )}
                <ConfirmDeleteDialog onConfirm={() => deleteReceipt(selectedReceipt.id)} title="Supprimer ce reçu ?" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Link to transaction dialog */}
      <Dialog open={linkTxOpen} onOpenChange={setLinkTxOpen}>
        <DialogContent className="glass-card border-border max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lier à une transaction</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {transactions.map(tx => (
              <button
                key={tx.id}
                onClick={() => linkTransaction(tx.id)}
                className="w-full glass rounded-xl p-3 text-left flex items-center justify-between hover:bg-secondary/60 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.note || (tx.categories as any)?.name || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                <span className="text-sm font-bold text-foreground">{formatAmount(tx.amount)} F</span>
              </button>
            ))}
            {transactions.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Aucune transaction</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen image zoom */}
      <AnimatePresence>
        {zoomOpen && selectedReceipt?.image_base64 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
            onClick={() => setZoomOpen(false)}
          >
            <button className="absolute top-6 right-6 text-muted-foreground"><X className="w-6 h-6" /></button>
            <img
              src={`data:image/jpeg;base64,${selectedReceipt.image_base64}`}
              alt="reçu zoom"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Receipts;
