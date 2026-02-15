import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NewTransaction = () => {
  const navigate = useNavigate();
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const filteredCategories = categories.filter(c => c.type === type);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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

  const processVoice = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Step 1: Transcribe
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");

      const sttResp = await supabase.functions.invoke("speech-to-text", { body: formData });
      if (sttResp.error) throw sttResp.error;

      const transcript = sttResp.data?.transcript;
      if (!transcript) throw new Error("Transcription vide");

      toast({ title: `🎙️ "${transcript}"` });

      // Step 2: Parse with AI
      const parseResp = await supabase.functions.invoke("parse-voice", {
        body: {
          transcript,
          categories: categories.map(c => ({ name: c.name, type: c.type, id: c.id })),
          wallets: wallets.map(w => ({ wallet_name: w.wallet_name, id: w.id })),
        },
      });

      if (parseResp.error) throw parseResp.error;
      const parsed = parseResp.data?.parsed;
      if (!parsed) throw new Error("Parsing échoué");

      // Fill form
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.type) setType(parsed.type);
      if (parsed.note) setNote(parsed.note);

      // Match category by name
      if (parsed.category) {
        const match = categories.find(c =>
          c.name.toLowerCase() === parsed.category.toLowerCase()
        );
        if (match) setCategoryId(match.id);
      }

      // Match wallet by name
      if (parsed.wallet) {
        const match = wallets.find(w =>
          w.wallet_name.toLowerCase() === parsed.wallet.toLowerCase()
        );
        if (match) setWalletId(match.id);
      }

      toast({ title: "Formulaire pré-rempli ✅" });
    } catch (err: any) {
      toast({ title: "Erreur vocale", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !user) return;
    setLoading(true);

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      amount: Number(amount),
      note,
      date,
      category_id: categoryId,
      wallet_id: walletId || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Transaction enregistrée ✅" });
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
        className="glass-card rounded-2xl p-4 mb-6 flex items-center gap-4"
      >
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
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
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {isProcessing ? "Analyse en cours..." : isRecording ? "Écoute en cours..." : "Saisie vocale"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isRecording
              ? "Dites ex: « J'ai dépensé 1500 en taxi »"
              : "Appuyez pour dicter votre transaction"}
          </p>
        </div>
      </motion.div>

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
    </DashboardLayout>
  );
};

export default NewTransaction;
