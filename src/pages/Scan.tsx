import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Camera, Upload, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ScanHistory from "@/components/scan/ScanHistory";
import ScanResultCard, { type ParsedResult } from "@/components/scan/ScanResultCard";
import { MultiReceiptValidator } from "@/components/scan/MultiReceiptValidator";
import { ScanProgress } from "@/components/scan/ScanProgress";
import { useActiveCurrency } from "@/lib/currencyStore";

const FREE_SCAN_LIMIT = 5;

interface DetectedTransaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  type: 'expense' | 'income';
  category_suggestion: string;
  note: string;
  confidence: number;
  raw_text: string;
  issues: string;
}

interface MultiScanResult {
  document_type: string;
  total_detected: number;
  transactions: DetectedTransaction[];
  global_confidence: number;
  warnings: string[];
}

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
  const activeCurrency = useActiveCurrency();
  const [totalConfirmed, setTotalConfirmed] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [scansRemaining, setScansRemaining] = useState(FREE_SCAN_LIMIT);
  const [history, setHistory] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<ParsedResult | null>(null);
  const [multiScanResult, setMultiScanResult] = useState<MultiScanResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanStoragePath, setScanStoragePath] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("receipt_scans")
      .select("id,scan_type,parsed_amount,parsed_merchant,parsed_category,parsed_date,parsed_currency,image_url,status,created_at,storage_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  }, [user]);

  const refreshReceiptStats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("receipt_scans")
      .select("parsed_amount, status")
      .eq("user_id", user.id)
      .eq("status", "confirmed");
    const confirmed = data || [];
    setTotalConfirmed(confirmed.length);
    setTotalAmount(confirmed.reduce((s: number, r: any) => s + (r.parsed_amount || 0), 0));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("receipt_scans").select("parsed_amount, status").eq("user_id", user.id).eq("status", "confirmed"),
      supabase.from("subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabase.from("categories").select("id, name, type").eq("user_id", user.id),
      supabase.from("wallets").select("id, wallet_name").eq("user_id", user.id),
    ]).then(([histRes, subRes, catRes, walRes]) => {
      const confirmed = histRes.data || [];
      setTotalConfirmed(confirmed.length);
      setTotalAmount(confirmed.reduce((s: number, r: any) => s + (r.parsed_amount || 0), 0));
      setIsPremium(!!subRes.data || isAdmin);
      setCategories(catRes.data || []);
      setWallets(walRes.data || []);
    });
    fetchHistory();
    const scanData = getScanCount();
    setScansRemaining(FREE_SCAN_LIMIT - scanData.count);
  }, [user, fetchHistory, isAdmin]);

  const scanImage = async (file: File) => {
    if (!user) return;

    if (!isPremium) {
      const scanData = getScanCount();
      if (scanData.count >= FREE_SCAN_LIMIT) {
        toast({
          title: "Limite atteinte",
          description: `Vous avez utilisé vos ${FREE_SCAN_LIMIT} scans gratuits ce mois. Passez à PRO pour un accès illimité.`,
          variant: "destructive",
        });
        return;
      }
    }

    setScanning(true);
    setScanResult(null);
    setMultiScanResult(null);

    try {
      let processedFile: File = file;
      if (file.size > 4 * 1024 * 1024) {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
        canvas.width = bitmap.width * ratio;
        canvas.height = bitmap.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>(resolve =>
          canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85)
        );
        processedFile = new File([blob], 'compressed.jpg', { type: 'image/jpeg' });
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(processedFile);
      });

      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-receipts`;

      console.log('[Scan request]', {
        imageSize: base64?.length,
        mediaType: processedFile.type,
        currency: activeCurrency,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: processedFile.type,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur scan (HTTP ${res.status})`);
      }

      const result: MultiScanResult = await res.json();
      const txs = result.transactions || [];

      if (txs.length === 0) {
        toast({
          title: 'Aucune transaction détectée',
          description: 'Essaie avec une image plus nette',
          variant: 'destructive',
        });
        return;
      }

      if (!isPremium) {
        incrementScanCount();
        setScansRemaining((prev) => prev - 1);
      }

      // Routage automatique : 1 tx => ScanResultCard, 2+ => MultiReceiptValidator
      if (txs.length === 1) {
        const tx = txs[0];
        setScanResult({
          amount: tx.amount,
          date: tx.date,
          merchant: tx.merchant,
          type: tx.type,
          category: tx.category_suggestion,
          currency: tx.currency,
        });
        toast({
          title: 'Reçu analysé 🎯',
          description: 'Vérifie et valide les informations',
        });
      } else {
        setMultiScanResult(result);
        toast({
          title: `${txs.length} transactions détectées 🎯`,
          description: 'Sélectionne et valide ce que tu veux enregistrer',
        });
      }
    } catch (e: any) {
      const m = (e?.message || e?.error || '').toLowerCase();
      let desc = "Une erreur est survenue. Réessaie.";

      if (m.includes('rate') || m.includes('limit')) {
        desc = "Trop de scans en peu de temps. Attends 5 minutes.";
      } else if (m.includes('image') || m.includes('media')) {
        desc = "Image illisible. Vérifie qu'elle est bien éclairée et nette.";
      } else if (m.includes('currency') || m.includes('xof') || m.includes('eur')) {
        desc = "Problème de devise. Vérifie ta devise préférée dans Settings.";
      } else if (m.includes('anthropic') || m.includes('ai service') || m.includes('claude')) {
        desc = "Service IA temporairement indisponible. Réessaie dans 1 minute.";
      } else if (m.includes('auth') || m.includes('token')) {
        desc = "Session expirée. Reconnecte-toi.";
      } else if (m.includes('network') || m.includes('failed to fetch')) {
        desc = "Problème de connexion. Vérifie ton réseau.";
      } else if (e?.message) {
        desc = e.message;
      }

      toast({
        title: "Scan échoué",
        description: desc,
        variant: "destructive",
        duration: 6000,
      });

      console.error('[Scan error]', e);
    } finally {
      setScanning(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await scanImage(f);
    e.target.value = "";
  };

  const findCategoryId = (name?: string | null, type: 'expense' | 'income' = 'expense') => {
    if (!name) return null;
    const match = categories.find(
      (c) => c.name?.toLowerCase() === name.toLowerCase() && (!c.type || c.type === type)
    ) || categories.find((c) => c.name?.toLowerCase() === name.toLowerCase());
    return match?.id ?? null;
  };

  const findWalletId = (name?: string | null) => {
    if (!name) return null;
    const match = wallets.find((w) => w.wallet_name?.toLowerCase() === name.toLowerCase());
    return match?.id ?? null;
  };

  const handleConfirm = async (data: ParsedResult) => {
    if (!user) return;
    try {
      const type = data.type === 'income' ? 'income' : 'expense';
      const amount = data.converted_amount_xof ?? data.amount ?? 0;
      const catId = findCategoryId(data.category, type);
      const walletId = findWalletId(data.wallet);

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        amount,
        type,
        date: data.date || new Date().toISOString().slice(0, 10),
        note: data.merchant || 'Reçu scanné',
        category_id: catId,
        wallet_id: walletId,
      } as any);

      if (error) throw error;

      await supabase.from('receipt_scans').insert({
        user_id: user.id,
        scan_type: 'photo',
        parsed_merchant: data.merchant,
        parsed_amount: amount,
        parsed_date: data.date,
        parsed_category: data.category,
        parsed_currency: data.currency,
        status: 'confirmed',
      });

      toast({ title: 'Transaction enregistrée ✅' });
      setScanResult(null);
      setImagePreview(null);
      await Promise.all([fetchHistory(), refreshReceiptStats()]);
    } catch (e: any) {
      toast({
        title: 'Erreur enregistrement',
        description: e?.message,
        variant: 'destructive',
      });
    }
  };

  const handleReject = () => {
    setScanResult(null);
    setImagePreview(null);
  };

  const handleMultiClose = () => {
    setMultiScanResult(null);
    setImagePreview(null);
  };

  const handleMultiValidated = async (_count: number) => {
    setMultiScanResult(null);
    setImagePreview(null);
    await Promise.all([fetchHistory(), refreshReceiptStats()]);
  };

  // Mode multi-scan : on prend tout l'écran (Screen géré par MultiReceiptValidator)
  if (multiScanResult) {
    return (
      <DashboardLayout title="Valider les transactions">
        <MultiReceiptValidator
          scanResult={multiScanResult}
          imagePreview={imagePreview}
          onClose={handleMultiClose}
          onValidated={handleMultiValidated}
        />
      </DashboardLayout>
    );
  }

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

      {scanResult ? (
        <ScanResultCard
          result={scanResult}
          categories={categories}
          wallets={wallets}
          onConfirm={handleConfirm}
          onReject={handleReject}
          isPremium={true}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-6 flex flex-col items-center gap-5"
        >
          <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>

          <div className="text-center space-y-1.5 max-w-md">
            <h3 className="text-foreground font-semibold text-base">Scan Intelligent</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Prends ou importe une photo d'un reçu, d'une facture ou d'un
              historique Mobile Money. L'IA détecte automatiquement une ou plusieurs transactions.
            </p>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
            disabled={scanning || (!isPremium && scansRemaining <= 0)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
            disabled={scanning || (!isPremium && scansRemaining <= 0)}
          />

          {scanning ? (
            <ScanProgress isAnalyzing={scanning} />
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => cameraRef.current?.click()}
                disabled={!isPremium && scansRemaining <= 0}
                className="gradient-primary text-primary-foreground"
              >
                <Camera className="w-4 h-4 mr-2" /> Photo
              </Button>
              <Button
                variant="outline"
                className="glass"
                onClick={() => galleryRef.current?.click()}
                disabled={!isPremium && scansRemaining <= 0}
              >
                <Upload className="w-4 h-4 mr-2" /> Galerie
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            💡 Photo bien éclairée et à plat = meilleurs résultats
          </p>
        </motion.div>
      )}

      <ScanHistory scans={history} onRefresh={fetchHistory} />

      <Link
        to="/receipts"
        className="w-full glass-card rounded-xl p-3.5 flex items-center justify-between mt-6 border border-primary/20"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧾</span>
          <div>
            <p className="text-sm font-medium text-foreground">Mes reçus</p>
            <p className="text-xs text-muted-foreground">
              {totalConfirmed} confirmé{totalConfirmed > 1 ? "s" : ""} · {totalAmount.toLocaleString("fr-FR")} total
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </DashboardLayout>
  );
};

export default Scan;
