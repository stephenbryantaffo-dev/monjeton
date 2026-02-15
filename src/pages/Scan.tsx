import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Check, X, Loader2, Edit3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ParsedResult {
  amount?: number;
  date?: string;
  merchant?: string;
  type?: string;
  category?: string;
  wallet?: string;
}

const Scan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<"receipt" | "screenshot">("receipt");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editResult, setEditResult] = useState<ParsedResult>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id),
      supabase.from("wallets").select("*").eq("user_id", user.id),
    ]).then(([catRes, walRes]) => {
      setCategories(catRes.data || []);
      setWallets(walRes.data || []);
    });
  }, [user]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setEditMode(false);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!user || !file || !preview) return;
    setLoading(true);

    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      const base64 = preview.split(",")[1];
      const resp = await supabase.functions.invoke("scan-receipt", {
        body: { image: base64, scanType, mimeType: file.type },
      });

      if (resp.error) throw resp.error;
      const parsed: ParsedResult = resp.data?.parsed || {};
      setResult(parsed);
      setEditResult(parsed);

      const { data: scanData } = await supabase.from("receipt_scans").insert({
        user_id: user.id,
        scan_type: scanType,
        image_url: urlData.publicUrl,
        extracted_text: resp.data?.raw || null,
        parsed_amount: parsed.amount || null,
        parsed_date: parsed.date || null,
        parsed_merchant: parsed.merchant || null,
        parsed_type: parsed.type || null,
        parsed_category: parsed.category || null,
        parsed_wallet: parsed.wallet || null,
        status: "pending",
      }).select().single();

      if (scanData) setScanId(scanData.id);
    } catch (err: any) {
      toast({ title: "Erreur d'analyse", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!user || !scanId) return;
    const data = editMode ? editResult : result;
    if (!data) return;

    // Match category
    let categoryId: string | null = null;
    if (data.category) {
      const match = categories.find(c => c.name.toLowerCase() === data.category!.toLowerCase());
      if (match) categoryId = match.id;
    }

    // Match wallet
    let walletIdVal: string | null = null;
    if (data.wallet) {
      const match = wallets.find(w => w.wallet_name.toLowerCase() === data.wallet!.toLowerCase());
      if (match) walletIdVal = match.id;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: data.type || "expense",
      amount: data.amount || 0,
      date: data.date || new Date().toISOString().split("T")[0],
      note: data.merchant ? `Scan: ${data.merchant}` : "Scan",
      category_id: categoryId,
      wallet_id: walletIdVal,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("receipt_scans").update({ status: "confirmed" }).eq("id", scanId);
    toast({ title: "Transaction créée ✅" });
    reset();
  };

  const reject = async () => {
    if (scanId) await supabase.from("receipt_scans").update({ status: "rejected" }).eq("id", scanId);
    toast({ title: "Scan rejeté" });
    reset();
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setResult(null);
    setScanId(null);
    setEditMode(false);
    setEditResult({});
  };

  return (
    <DashboardLayout title="Scanner">
      {/* Scan type toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setScanType("receipt")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            scanType === "receipt" ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
          }`}
        >
          🧾 Ticket de caisse
        </button>
        <button
          onClick={() => setScanType("screenshot")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            scanType === "screenshot" ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
          }`}
        >
          📱 Mobile Money
        </button>
      </div>

      {!preview ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full glass flex items-center justify-center">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {scanType === "receipt"
              ? "Prenez en photo votre ticket de caisse"
              : "Uploadez votre capture d'écran Mobile Money (Wave, Orange, MTN, Moov)"}
          </p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          <div className="flex gap-3">
            <Button onClick={() => fileRef.current?.click()} className="gradient-primary text-primary-foreground">
              <Camera className="w-4 h-4 mr-2" /> Photo
            </Button>
            <Button
              variant="outline"
              className="glass"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.removeAttribute("capture");
                  fileRef.current.click();
                  fileRef.current.setAttribute("capture", "environment");
                }
              }}
            >
              <Upload className="w-4 h-4 mr-2" /> Galerie
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl overflow-hidden">
            <img src={preview} alt="Scan" className="w-full max-h-64 object-contain" />
          </motion.div>

          {!result && !loading && (
            <Button onClick={analyze} className="w-full gradient-primary text-primary-foreground">
              Analyser l'image
            </Button>
          )}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Analyse IA en cours...</span>
            </motion.div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Résultat</h3>
                <button onClick={() => setEditMode(!editMode)} className="text-primary text-xs flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> {editMode ? "Aperçu" : "Modifier"}
                </button>
              </div>

              {editMode ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Montant (FCFA)</Label>
                    <Input type="number" value={editResult.amount || ""} onChange={e => setEditResult({ ...editResult, amount: Number(e.target.value) })} className="glass" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Commerçant</Label>
                    <Input value={editResult.merchant || ""} onChange={e => setEditResult({ ...editResult, merchant: e.target.value })} className="glass" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input type="date" value={editResult.date || ""} onChange={e => setEditResult({ ...editResult, date: e.target.value })} className="glass" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditResult({ ...editResult, type: "expense" })}
                        className={`flex-1 py-1.5 rounded-lg text-xs ${editResult.type === "expense" ? "bg-destructive text-destructive-foreground" : "glass text-muted-foreground"}`}>
                        Dépense
                      </button>
                      <button type="button" onClick={() => setEditResult({ ...editResult, type: "income" })}
                        className={`flex-1 py-1.5 rounded-lg text-xs ${editResult.type === "income" ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                        Revenu
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Catégorie</Label>
                    <select
                      value={editResult.category || ""}
                      onChange={e => setEditResult({ ...editResult, category: e.target.value })}
                      className="w-full rounded-lg bg-background/50 border border-border p-2 text-foreground text-sm"
                    >
                      <option value="">Choisir</option>
                      {categories.filter(c => c.type === (editResult.type || "expense")).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Portefeuille</Label>
                    <select
                      value={editResult.wallet || ""}
                      onChange={e => setEditResult({ ...editResult, wallet: e.target.value })}
                      className="w-full rounded-lg bg-background/50 border border-border p-2 text-foreground text-sm"
                    >
                      <option value="">Aucun</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.wallet_name}>{w.wallet_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.amount != null && (
                    <div className="glass rounded-xl p-3">
                      <p className="text-muted-foreground text-xs">Montant</p>
                      <p className="font-bold text-foreground">{result.amount.toLocaleString("fr-FR")} F</p>
                    </div>
                  )}
                  {result.merchant && (
                    <div className="glass rounded-xl p-3">
                      <p className="text-muted-foreground text-xs">Commerçant</p>
                      <p className="font-bold text-foreground">{result.merchant}</p>
                    </div>
                  )}
                  {result.date && (
                    <div className="glass rounded-xl p-3">
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-bold text-foreground">{result.date}</p>
                    </div>
                  )}
                  {result.type && (
                    <div className="glass rounded-xl p-3">
                      <p className="text-muted-foreground text-xs">Type</p>
                      <p className="font-bold text-foreground">{result.type === "expense" ? "Dépense" : "Revenu"}</p>
                    </div>
                  )}
                  {result.category && (
                    <div className="glass rounded-xl p-3">
                      <p className="text-muted-foreground text-xs">Catégorie</p>
                      <p className="font-bold text-foreground">{result.category}</p>
                    </div>
                  )}
                  {result.wallet && (
                    <div className="glass rounded-xl p-3">
                      <p className="text-muted-foreground text-xs">Portefeuille</p>
                      <p className="font-bold text-foreground">{result.wallet}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={confirm} className="flex-1 gradient-primary text-primary-foreground">
                  <Check className="w-4 h-4 mr-2" /> Confirmer
                </Button>
                <Button onClick={reject} variant="outline" className="flex-1 glass">
                  <X className="w-4 h-4 mr-2" /> Rejeter
                </Button>
              </div>
            </motion.div>
          )}

          {!loading && (
            <Button variant="ghost" onClick={reset} className="w-full text-muted-foreground">
              Recommencer
            </Button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

const Label = ({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={`text-xs text-muted-foreground ${className || ""}`} {...props}>{children}</label>
);

export default Scan;
