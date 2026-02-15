import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Check, X, Loader2 } from "lucide-react";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<"receipt" | "screenshot">("receipt");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!user || !file || !preview) return;
    setLoading(true);

    try {
      // Upload to storage
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      // Call scan-receipt edge function
      const base64 = preview.split(",")[1];
      const resp = await supabase.functions.invoke("scan-receipt", {
        body: { image: base64, scanType, mimeType: file.type },
      });

      if (resp.error) throw resp.error;
      const parsed: ParsedResult = resp.data?.parsed || {};
      setResult(parsed);

      // Save scan record
      const { data: scanData } = await supabase.from("receipt_scans").insert({
        user_id: user.id,
        scan_type: scanType,
        image_url: urlData.publicUrl,
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
    if (!user || !result || !scanId) return;
    // Create transaction from parsed result
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: result.type || "expense",
      amount: result.amount || 0,
      date: result.date || new Date().toISOString().split("T")[0],
      note: result.merchant ? `Scan: ${result.merchant}` : "Scan",
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
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full glass flex items-center justify-center">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {scanType === "receipt"
              ? "Prenez en photo votre ticket de caisse"
              : "Uploadez votre capture d'écran Mobile Money"}
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
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <img src={preview} alt="Scan" className="w-full max-h-64 object-contain" />
          </div>

          {!result && !loading && (
            <Button onClick={analyze} className="w-full gradient-primary text-primary-foreground">
              Analyser l'image
            </Button>
          )}

          {loading && (
            <div className="glass-card rounded-2xl p-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Analyse en cours...</span>
            </div>
          )}

          {result && (
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Résultat</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.amount && (
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
              </div>
              <div className="flex gap-3">
                <Button onClick={confirm} className="flex-1 gradient-primary text-primary-foreground">
                  <Check className="w-4 h-4 mr-2" /> Confirmer
                </Button>
                <Button onClick={reject} variant="outline" className="flex-1 glass">
                  <X className="w-4 h-4 mr-2" /> Rejeter
                </Button>
              </div>
            </div>
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

export default Scan;
