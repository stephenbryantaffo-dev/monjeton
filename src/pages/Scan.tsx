import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ScanTypeToggle from "@/components/scan/ScanTypeToggle";
import ScanUploadArea from "@/components/scan/ScanUploadArea";
import ScanResultCard, { type ParsedResult } from "@/components/scan/ScanResultCard";
import ScanHistory from "@/components/scan/ScanHistory";

const Scan = () => {
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<"receipt" | "screenshot">("receipt");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const isPremium = true;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id),
      supabase.from("wallets").select("*").eq("user_id", user.id),
      supabase.from("receipt_scans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]).then(([catRes, walRes, histRes]) => {
      setCategories(catRes.data || []);
      setWallets(walRes.data || []);
      setHistory(histRes.data || []);
    });
  }, [user]);

  const handleFileSelected = (f: File) => {
    setFile(f);
    setResult(null);
    const pdf = f.type === "application/pdf";
    setIsPdf(pdf);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const convertCurrency = async (amount: number, currency: string): Promise<{
    converted_amount: number;
    exchange_rate: number;
    source: string;
    date: string;
  } | null> => {
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

      // Currency detection & conversion
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
          parsed.conversion_error = "Impossible de récupérer le taux de change. Veuillez saisir manuellement.";
        }
      }

      setResult(parsed);

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
    const finalAmountXof = needsConversion && data.converted_amount_xof
      ? data.converted_amount_xof
      : data.amount || 0;

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
    toast({ title: "Transaction créée ✅" });
    reset();
    refreshHistory();
  };

  const handleReject = async () => {
    if (scanId) await supabase.from("receipt_scans").update({ status: "rejected" }).eq("id", scanId);
    toast({ title: "Scan rejeté" });
    reset();
    refreshHistory();
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setResult(null);
    setScanId(null);
    setIsPdf(false);
  };

  const refreshHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("receipt_scans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  };

  return (
    <DashboardLayout title="Scan Intelligent">
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

          {!result && !loading && (
            <Button onClick={analyze} className="w-full gradient-primary text-primary-foreground">
              {isPdf ? "Analyser le PDF" : "Analyser l'image"}
            </Button>
          )}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Analyse IA en cours...</span>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {result && (
            <ScanResultCard
              result={result}
              categories={categories}
              wallets={wallets}
              onConfirm={handleConfirm}
              onReject={handleReject}
              isPremium={isPremium}
            />
          )}

          {!loading && (
            <Button variant="ghost" onClick={reset} className="w-full text-muted-foreground">
              Recommencer
            </Button>
          )}
        </div>
      )}

      <ScanHistory scans={history} />
    </DashboardLayout>
  );
};

export default Scan;
