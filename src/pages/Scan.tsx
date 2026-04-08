import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ScanTypeToggle from "@/components/scan/ScanTypeToggle";
import ScanUploadArea from "@/components/scan/ScanUploadArea";
import ScanResultCard, { type ParsedResult } from "@/components/scan/ScanResultCard";

const FREE_SCAN_LIMIT = 5;

const getScanCount = (): { count: number; month: string } => {
  const now = new Date();
  const key = "scan_counter";
  const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    if (stored.month === currentMonth) return stored;
  } catch {}
  return { count: 0, month: currentMonth };
};

const incrementScanCount = () => {
  const data = getScanCount();
  data.count += 1;
  localStorage.setItem("scan_counter", JSON.stringify(data));
};

const Scan = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<"receipt" | "screenshot">("receipt");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [totalConfirmed, setTotalConfirmed] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scansRemaining, setScansRemaining] = useState(FREE_SCAN_LIMIT);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id),
      supabase.from("wallets").select("*").eq("user_id", user.id),
      supabase.from("receipt_scans").select("parsed_amount, status").eq("user_id", user.id).eq("status", "confirmed"),
      supabase.from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle(),
    ]).then(([catRes, walRes, histRes, subRes]) => {
      setCategories(catRes.data || []);
      setWallets(walRes.data || []);
      const confirmed = histRes.data || [];
      setTotalConfirmed(confirmed.length);
      setTotalAmount(confirmed.reduce((s: number, r: any) => s + (r.parsed_amount || 0), 0));
      setIsPremium(!!subRes.data || isAdmin);
    });

    const scanData = getScanCount();
    setScansRemaining(FREE_SCAN_LIMIT - scanData.count);
  }, [user]);

  const handleFileSelected = (f: File) => {
    setFile(f);
    setResult(null);
    setShowSuccess(false);
    const pdf = f.type === "application/pdf";
    setIsPdf(pdf);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const convertCurrency = async (amount: number, currency: string) => {
    try {
      const resp = await supabase.functions.invoke("convert-currency", {
        body: { amount, from_currency: currency, to_currency: "XOF" },
      });
      if (resp.error) throw resp.error;
      return resp.data;
    } catch (err) {
      console.error("Currency conversion failed:", err);
      return null;
    }
  };

  const analyze = async () => {
    if (!user || !file || !preview) return;

    if (!isPremium) {
      const scanData = getScanCount();
      if (scanData.count >= FREE_SCAN_LIMIT) {
        toast({ title: "Limite atteinte", description: `Vous avez utilisé vos ${FREE_SCAN_LIMIT} scans gratuits ce mois. Passez à PRO pour un accès illimité.`, variant: "destructive" });
        return;
      }
    }

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

      const detectedCurrency = (parsed.currency || "XOF").toUpperCase();
      parsed.currency = detectedCurrency;
      parsed.original_amount = parsed.amount;

      if (detectedCurrency !== "XOF" && parsed.amount) {
        const conversion = await convertCurrency(parsed.amount, detectedCurrency);
        if (conversion) {
          parsed.converted_amount_xof = conversion.converted_amount;
          parsed.exchange_rate_used = conversion.exchange_rate;
          parsed.exchange_rate_source = conversion.source;
        } else {
          parsed.conversion_error = "Impossible de récupérer le taux de change.";
        }
      }

      // Increment scan counter for free users
      if (!isPremium) {
        incrementScanCount();
        setScansRemaining((prev) => prev - 1);
      }

      // Save receipt to receipts table
      try {
        const base64Data = preview.split(",")[1] || "";
        await supabase.from("receipts" as any).insert({
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
          items: null,
          status: "pending",
        });
        toast({ title: "🧾 Reçu sauvegardé", description: "Disponible dans Mes Reçus pour audit" });
      } catch (e) {
        console.error("saveReceiptToDatabase error:", e);
      }

      // Show success animation briefly
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setResult(parsed);
      }, 1200);

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
        parsed_currency: detectedCurrency,
        parsed_original_amount: parsed.original_amount || null,
        parsed_converted_amount_xof: parsed.converted_amount_xof || null,
        parsed_exchange_rate_used: parsed.exchange_rate_used || null,
        parsed_exchange_rate_source: parsed.exchange_rate_source || null,
        status: "pending",
      } as any).select().single();

      if (scanData) setScanId(scanData.id);
    } catch (err: any) {
      toast({ title: "Erreur d'analyse", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (data: ParsedResult) => {
    if (!user || !scanId) return;
    let categoryId: string | null = null;
    if (data.category) {
      const match = categories.find((c) => c.name.toLowerCase() === data.category!.toLowerCase());
      if (match) categoryId = match.id;
    }
    let walletIdVal: string | null = null;
    if (data.wallet) {
      const match = wallets.find((w) => w.wallet_name.toLowerCase() === data.wallet!.toLowerCase());
      if (match) walletIdVal = match.id;
    }
    const needsConversion = data.currency && data.currency !== "XOF";
    const finalAmountXof = needsConversion && data.converted_amount_xof ? data.converted_amount_xof : data.amount || 0;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: data.type || "expense",
      amount: finalAmountXof,
      date: data.date || new Date().toISOString().split("T")[0],
      note: data.merchant ? `Scan: ${data.merchant}` : "Scan",
      category_id: categoryId,
      wallet_id: walletIdVal,
      original_amount: data.original_amount || data.amount || 0,
      original_currency: data.currency || "XOF",
      converted_amount_xof: needsConversion ? finalAmountXof : null,
      exchange_rate_used: data.exchange_rate_used || null,
      exchange_rate_source: data.exchange_rate_source || null,
      conversion_date: needsConversion ? new Date().toISOString().split("T")[0] : null,
    } as any);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("receipt_scans").update({ status: "confirmed" }).eq("id", scanId);
    await refreshReceiptStats();
    toast({ title: "Transaction créée ✅" });
    reset();
  };

  const handleReject = async () => {
    if (scanId) await supabase.from("receipt_scans").update({ status: "rejected" }).eq("id", scanId);
    toast({ title: "Scan rejeté" });
    reset();
    refreshReceiptStats();
  };

  const handleManualEntry = () => {
    navigate("/transactions/new", { state: { date: result?.date || undefined } });
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setResult(null);
    setScanId(null);
    setIsPdf(false);
    setShowSuccess(false);
  };

  const refreshReceiptStats = async () => {
    if (!user) return;
    const { data } = await supabase.from("receipt_scans").select("parsed_amount, status").eq("user_id", user.id).eq("status", "confirmed");
    const confirmed = data || [];
    setTotalConfirmed(confirmed.length);
    setTotalAmount(confirmed.reduce((s: number, r: any) => s + (r.parsed_amount || 0), 0));
  };

  const resultIsEmpty = result && (!result.amount || result.amount === 0);

  return (
    <DashboardLayout title="Scan Intelligent">
      {/* Free tier scan counter */}
      {!isPremium && (
        <div className="glass-card rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {scansRemaining > 0
              ? `📷 ${scansRemaining} scan${scansRemaining > 1 ? "s" : ""} restant${scansRemaining > 1 ? "s" : ""} ce mois`
              : "📷 Limite de scans atteinte ce mois"}
          </span>
          {scansRemaining <= 0 && (
            <Button asChild size="sm" className="gradient-primary text-primary-foreground">
              <a href="/subscribe">Passer à PRO</a>
            </Button>
          )}
        </div>
      )}

      <ScanTypeToggle scanType={scanType} onChangeScanType={setScanType} />

      {!preview ? (
        <ScanUploadArea scanType={scanType} onFileSelected={handleFileSelected} />
      ) : (
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl overflow-hidden">
            {isPdf ? (
              <div className="p-6 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <p className="text-sm font-medium text-foreground">{file?.name}</p>
                <p className="text-xs text-muted-foreground">Fichier PDF prêt pour l'analyse</p>
              </div>
            ) : (
              <img src={preview} alt="Scan" className="w-full max-h-64 object-contain" />
            )}
          </motion.div>

          {!result && !loading && !showSuccess && (
            <Button onClick={analyze} className="w-full gradient-primary text-primary-foreground" disabled={!isPremium && scansRemaining <= 0}>
              {isPdf ? "Analyser le PDF" : "Analyser l'image"}
            </Button>
          )}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Analyse IA en cours...</span>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" initial={{ width: "0%" }} animate={{ width: "90%" }} transition={{ duration: 8, ease: "easeOut" }} />
              </div>
            </motion.div>
          )}

          {/* Success animation */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </motion.div>
                <span className="text-sm font-medium text-foreground">Analyse terminée !</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result: quick summary + card OR empty result fallback */}
          {result && !showSuccess && (
            <>
              {resultIsEmpty ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <span className="font-semibold text-foreground">Détection incomplète</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    L'IA n'a pas pu détecter le montant. Veux-tu l'entrer manuellement ?
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={handleManualEntry} className="flex-1 gradient-primary text-primary-foreground">
                      Entrer manuellement
                    </Button>
                    <Button variant="outline" onClick={reset} className="flex-1 glass">
                      Recommencer
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Quick summary banner */}
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">
                      Détecté : <span className="font-bold">{result.amount?.toLocaleString("fr-FR")} {result.currency || "FCFA"}</span>
                      {result.merchant && <> chez <span className="font-bold">{result.merchant}</span></>}
                    </span>
                  </motion.div>
                  <ScanResultCard result={result} categories={categories} wallets={wallets} onConfirm={handleConfirm} onReject={handleReject} isPremium={isPremium} />
                </>
              )}
            </>
          )}

          {!loading && !showSuccess && (
            <Button variant="ghost" onClick={reset} className="w-full text-muted-foreground">
              Recommencer
            </Button>
          )}
        </div>
      )}

      <Link
        to="/receipts"
        className="w-full glass-card rounded-xl p-3.5 flex items-center justify-between mt-6 border border-primary/20"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧾</span>
          <div>
            <p className="text-sm font-medium text-foreground">Mes reçus</p>
            <p className="text-xs text-muted-foreground">
              {totalConfirmed} confirmé{totalConfirmed > 1 ? "s" : ""} · {totalAmount.toLocaleString("fr-FR")} F total
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </DashboardLayout>
  );
};

export default Scan;
