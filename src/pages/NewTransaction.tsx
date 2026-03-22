import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import VoiceConfirmationDialog, { type ParsedTransaction } from "@/components/voice/VoiceConfirmationDialog";
import AudioLevelVisualizer from "@/components/voice/AudioLevelVisualizer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateAmount, sanitizeNote, validatePayloadSize, MAX_AUDIO_SIZE_BYTES } from "@/lib/security";
import { checkAndCreateNotifications } from "@/lib/notificationService";

const NewTransaction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [walletId, setWalletId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [showRetryVoice, setShowRetryVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Conversational AI states
  const [voiceTransactions, setVoiceTransactions] = useState<ParsedTransaction[] | null>(null);
  const [isSubmittingVoice, setIsSubmittingVoice] = useState(false);

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

  // Auto-start voice if navigated with autoVoice flag
  useEffect(() => {
    const state = location.state as any;
    if (state?.autoVoice && !isRecording && !isProcessing) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => startRecording(), 500);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const filteredCategories = categories.filter(c => c.type === type);

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder !== "undefined") {
      if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
      if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
    }
    return "";
  };

  const startRecording = async () => {
    try {
      setTranscriptText(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);
      const mimeType = getSupportedMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setActiveStream(null);
        const blob = new Blob(chunksRef.current, { type: getSupportedMimeType() || "audio/webm" });
        
        if (!validatePayloadSize(blob, MAX_AUDIO_SIZE_BYTES)) {
          toast({ title: "Audio trop volumineux", description: "Maximum 10 Mo", variant: "destructive" });
          return;
        }
        await processVoice(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone non disponible", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const matchCategoryId = (name: string, txType: string): string => {
    const match = categories.find(c =>
      c.name.toLowerCase() === name.toLowerCase() && c.type === txType
    );
    if (match) return match.id;
    const fuzzy = categories.find(c =>
      c.type === txType && c.name.toLowerCase().includes(name.toLowerCase())
    );
    return fuzzy?.id || "";
  };

  const matchWalletId = (name: string | null): string => {
    if (!name) return "";
    const match = wallets.find(w =>
      w.wallet_name.toLowerCase() === name.toLowerCase()
    );
    if (match) return match.id;
    const fuzzy = wallets.find(w =>
      w.wallet_name.toLowerCase().includes(name.toLowerCase())
    );
    return fuzzy?.id || "";
  };

  const processVoice = async (audioBlob: Blob, retryCount = 0) => {
    setIsProcessing(true);
    try {
      const sttUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`;
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");

      const sttResp = await fetch(sttUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      if (!sttResp.ok) {
        const errBody = await sttResp.json().catch(() => ({}));
        throw new Error(errBody.error || "Transcription échouée");
      }

      const sttData = await sttResp.json();
      const transcript = sttData?.transcript;
      
      if (!transcript?.trim()) {
        setTranscriptText(null);
        toast({
          title: "🎙️ Je n'ai pas entendu",
          description: "Essaie de parler plus fort ou plus près du micro.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Show transcription bubble before AI processing
      setTranscriptText(transcript);

      const parseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-voice`;
      const { data: { session: parseSession } } = await supabase.auth.getSession();
      const parseResp = await fetch(parseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parseSession?.access_token}`,
        },
        body: JSON.stringify({
          transcript,
          categories: categories.map(c => ({ name: c.name, type: c.type, id: c.id })),
          wallets: wallets.map(w => ({ wallet_name: w.wallet_name, id: w.id })),
        }),
      });

      if (!parseResp.ok) {
        const errBody = await parseResp.json().catch(() => ({}));
        throw new Error(errBody.error || "Analyse IA échouée");
      }

      const parseData = await parseResp.json();
      const parsed = parseData?.parsed;

      if (!parsed?.transactions?.length) throw new Error("Aucune transaction détectée");

      const mappedTxs: ParsedTransaction[] = parsed.transactions.map((tx: any) => ({
        amount: tx.amount || 0,
        type: tx.type || "expense",
        category: tx.category || "",
        wallet: tx.wallet || null,
        note: tx.note || "",
        currency: tx.currency || "XOF",
        date: tx.date || null,
        categoryId: matchCategoryId(tx.category || "", tx.type || "expense"),
        walletId: matchWalletId(tx.wallet),
      }));

      setVoiceTransactions(mappedTxs);

    } catch (err: any) {
      console.error("processVoice error:", err);
      if (retryCount < 1 && err?.message !== "Transcription vide") {
        toast({ title: "Réessai en cours..." });
        return processVoice(audioBlob, retryCount + 1);
      }
      toast({ title: "Erreur vocale", description: err?.message || "Veuillez réessayer", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceConfirm = async (transactions: ParsedTransaction[]) => {
    if (!user) return;
    setIsSubmittingVoice(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      for (const tx of transactions) {
        const catId = tx.categoryId || matchCategoryId(tx.category, tx.type);
        const walId = tx.walletId || matchWalletId(tx.wallet);

        let finalAmount = tx.amount;
        let originalAmount: number | null = null;
        let originalCurrency: string | null = null;
        let convertedAmountXof: number | null = null;
        let exchangeRateUsed: number | null = null;
        let exchangeRateSource: string | null = null;

        if (tx.currency && tx.currency !== "XOF") {
          originalAmount = tx.amount;
          originalCurrency = tx.currency;

          try {
            const convResp = await supabase.functions.invoke("convert-currency", {
              body: { amount: tx.amount, from: tx.currency, to: "XOF" },
            });
            if (convResp.data?.convertedAmount) {
              finalAmount = Math.round(convResp.data.convertedAmount);
              convertedAmountXof = finalAmount;
              exchangeRateUsed = convResp.data.rate;
              exchangeRateSource = convResp.data.source || "api";
            }
          } catch {
            toast({ title: `⚠️ Conversion ${tx.currency}→XOF échouée, montant conservé`, variant: "destructive" });
          }
        }

        await supabase.from("transactions").insert({
          user_id: user.id,
          type: tx.type,
          amount: finalAmount,
          note: tx.note,
          date: tx.date || today,
          category_id: catId || null,
          wallet_id: walId || null,
          original_amount: originalAmount,
          original_currency: originalCurrency,
          converted_amount_xof: convertedAmountXof,
          exchange_rate_used: exchangeRateUsed,
          exchange_rate_source: exchangeRateSource,
        });
      }

      toast({ title: `${transactions.length} transaction${transactions.length > 1 ? "s" : ""} enregistrée${transactions.length > 1 ? "s" : ""} ✅` });
      for (const tx of transactions) {
        const catId = tx.categoryId || matchCategoryId(tx.category, tx.type);
        const walId = tx.walletId || matchWalletId(tx.wallet);
        checkAndCreateNotifications(user.id, tx.type, catId || null, walId || null);
      }
      setVoiceTransactions(null);
      setTranscriptText(null);
      navigate("/transactions");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingVoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !user) return;

    const amountCheck = validateAmount(amount);
    if (!amountCheck.valid) {
      toast({ title: amountCheck.error || "Montant invalide", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      amount: amountCheck.value,
      note: sanitizeNote(note),
      date,
      category_id: categoryId,
      wallet_id: walletId || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la transaction", variant: "destructive" });
    } else {
      toast({ title: "Transaction enregistrée ✅" });
      checkAndCreateNotifications(user.id, type, categoryId, walletId || null);
      navigate("/transactions");
    }
  };

  return (
    <DashboardLayout>
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Nouvelle transaction</h1>
      </div>

      {/* Voice Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-4 mb-4 flex items-center gap-4"
      >
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0 ${
            isRecording
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "gradient-primary text-primary-foreground neon-glow"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isProcessing ? "Analyse IA en cours..." : isRecording ? "Écoute en cours..." : "Saisie vocale intelligente"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isRecording
              ? "Parlez librement, ex : « J'ai payé taxi 3000 et restaurant 25000 »"
              : "Détecte plusieurs transactions, devises et montants automatiquement"}
          </p>
        </div>
        <AudioLevelVisualizer stream={activeStream} isActive={isRecording} />
      </motion.div>

      {/* Transcription bubble */}
      <AnimatePresence>
        {transcriptText && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="glass-card rounded-2xl p-3 mb-4 border border-primary/20"
          >
            <p className="text-xs text-muted-foreground mb-1">🎙️ Texte reconnu :</p>
            <p className="text-sm text-foreground font-medium italic">« {transcriptText} »</p>
            {isProcessing && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Analyse par l'IA...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversational AI Confirmation */}
      <AnimatePresence>
        {voiceTransactions && (
          <VoiceConfirmationDialog
            transactions={voiceTransactions}
            categories={categories.map(c => ({ id: c.id, name: c.name, type: c.type }))}
            wallets={wallets.map(w => ({ id: w.id, wallet_name: w.wallet_name }))}
            onConfirm={handleVoiceConfirm}
            onCancel={() => { setVoiceTransactions(null); setTranscriptText(null); }}
            isSubmitting={isSubmittingVoice}
          />
        )}
      </AnimatePresence>

      {/* Manual form */}
      {!voiceTransactions && (
        <>
          <div className="flex gap-1 p-1 glass-card rounded-xl mb-6">
            <button onClick={() => setType("expense")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === "expense" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>
              Dépense
            </button>
            <button onClick={() => setType("income")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${type === "income" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
              Revenu
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Montant (FCFA)</Label>
              <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary border-border text-2xl font-bold h-14" required />
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryId === c.id ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Portefeuille</Label>
              <div className="flex flex-wrap gap-2">
                {wallets.map((w) => (
                  <button key={w.id} type="button" onClick={() => setWalletId(w.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${walletId === w.id ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"}`}>
                    {w.wallet_name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea placeholder="Détails de la transaction..." value={note} onChange={(e) => setNote(e.target.value)} className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border" />
            </div>

            <Button variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>
        </>
      )}
    </DashboardLayout>
  );
};

export default NewTransaction;
