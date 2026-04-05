import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Bot, Loader2, Mic, MicOff, Paperclip, Volume2, VolumeX, X, FileText, LogOut, Trash2, Target, Users } from "lucide-react";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Attachment = {
  name: string;
  type: string;
  data: string;
  preview?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  type: "text" | "audio";
  audioUrl?: string;
  attachments?: Attachment[];
};

type TransactionData = {
  action: "create_transaction";
  amount: number;
  type: string;
  category: string;
  note: string;
  date: string;
  wallet: string;
};

type DebtData = {
  action: "create_debt" | "update_debt";
  debt_type?: "i_owe" | "owed_to_me";
  person_name: string;
  amount?: number;
  amount_paid?: number;
  remaining?: number;
  due_date?: string | null;
  note?: string;
};

type TontinePaymentData = {
  action: "record_tontine_payment";
  tontine_id: string;
  tontine_name: string;
  member_name: string;
  amount: number;
  cycle_id: string;
};

type SavingsGoalData = {
  action: "create_savings_goal";
  name: string;
  target_amount: number;
  deadline?: string | null;
};

const cleanMessageContent = (content: string): string => {
  return content
    .replace(/```transaction[\s\S]*?```/g, "")
    .replace(/```debt[\s\S]*?```/g, "")
    .replace(/```tontine_action[\s\S]*?```/g, "")
    .replace(/```savings_action[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{"action"\s*:\s*"(?:create_transaction|update_transaction|create_debt|update_debt|record_tontine_payment|create_savings_goal)"[^}]*\}/g, "")
    .trim();
};

const extractTransaction = (content: string): { cleanContent: string; transaction: TransactionData | null } => {
  const regex = /```transaction\s*\n?(\{[\s\S]*?\})\s*\n?```/;
  const match = content.match(regex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.action === "create_transaction" && parsed.amount) {
        return { cleanContent: content.replace(regex, "").trim(), transaction: parsed as TransactionData };
      }
    } catch { /* ignore */ }
  }
  const inlineRegex = /\{"action"\s*:\s*"create_transaction"[^}]+\}/;
  const inlineMatch = content.match(inlineRegex);
  if (inlineMatch) {
    try {
      const parsed = JSON.parse(inlineMatch[0]);
      if (parsed.amount) {
        return { cleanContent: content.replace(inlineRegex, "").trim(), transaction: parsed as TransactionData };
      }
    } catch { /* ignore */ }
  }
  return { cleanContent: content, transaction: null };
};

const extractDebt = (content: string): { cleanContent: string; debt: DebtData | null } => {
  const regex = /```debt\s*\n?(\{[\s\S]*?\})\s*\n?```/;
  const match = content.match(regex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.action && parsed.person_name) {
        return { cleanContent: content.replace(regex, "").trim(), debt: parsed as DebtData };
      }
    } catch { /* ignore */ }
  }
  return { cleanContent: content, debt: null };
};

const extractTontineAction = (content: string): { cleanContent: string; tontinePayment: TontinePaymentData | null } => {
  const regex = /```tontine_action\s*\n?(\{[\s\S]*?\})\s*\n?```/;
  const match = content.match(regex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.action === "record_tontine_payment" && parsed.member_name) {
        return { cleanContent: content.replace(regex, "").trim(), tontinePayment: parsed as TontinePaymentData };
      }
    } catch { /* ignore */ }
  }
  return { cleanContent: content, tontinePayment: null };
};

const extractSavingsAction = (content: string): { cleanContent: string; savingsGoal: SavingsGoalData | null } => {
  const regex = /```savings_action\s*\n?(\{[\s\S]*?\})\s*\n?```/;
  const match = content.match(regex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.action === "create_savings_goal" && parsed.name) {
        return { cleanContent: content.replace(regex, "").trim(), savingsGoal: parsed as SavingsGoalData };
      }
    } catch { /* ignore */ }
  }
  return { cleanContent: content, savingsGoal: null };
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bonne après-midi";
  return "Bonsoir";
};

const initialMessages: Message[] = [{
  role: "assistant",
  content: `${getGreeting()} ! 👋\n\nDis-moi juste ce que tu as dépensé ou reçu aujourd'hui. Même en nouchi, je comprends tout ! 😄\n\nExemples :\n🗣️ "Garba 500"\n🗣️ "Taxi 2000 Wave"\n🗣️ "Ahmed a cotisé 7000"\n🗣️ "Je veux économiser 100000"`,
  type: "text",
}];

const QUICK_ACTIONS = [
  { emoji: "🛒", label: "Marché", text: "J'ai dépensé au marché " },
  { emoji: "🚕", label: "Transport", text: "Transport " },
  { emoji: "🍛", label: "Repas", text: "Repas " },
  { emoji: "📱", label: "Recharge", text: "Recharge téléphone " },
  { emoji: "💸", label: "Envoi argent", text: "J'ai envoyé " },
  { emoji: "💰", label: "Reçu argent", text: "J'ai reçu " },
  { emoji: "🤝", label: "Tontine", text: "Qui n'a pas payé la tontine ?" },
  { emoji: "🎯", label: "Épargne", text: "Je veux économiser " },
];

const Assistant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [continuousMode, setContinuousMode] = useState(false);
  const [confirmedCards, setConfirmedCards] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const continuousModeRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => { continuousModeRef.current = continuousMode; }, [continuousMode]);

  useEffect(() => {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("assistant_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const restored: Message[] = [
        initialMessages[0],
        ...data.map((m) => ({
          role: m.message_role as "user" | "assistant",
          content: m.content,
          type: "text" as const,
        })),
      ];
      setMessages(restored);
    }
  };

  const saveMessage = async (role: string, content: string) => {
    if (!user) return;
    await supabase.from("assistant_messages").insert({
      user_id: user.id,
      message_role: role,
      content,
    });
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("assistant_messages").delete().eq("user_id", user.id);
    setMessages(initialMessages);
    setConfirmedCards(new Set());
    toast({ title: "Historique supprimé", description: "Toutes les conversations ont été effacées." });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const HALLUCINATIONS = [
    "merci", "merci.", "sous-titres", "sous-titrage",
    "transcription", "music", "musique", "♪",
    "thank you", "thanks for watching", "you",
    ".", " ", "...", "bonjour.", "bonsoir.",
  ];

  const isHallucination = (text: string): boolean => {
    const c = text.toLowerCase().trim();
    if (c.length < 4) return true;
    if (HALLUCINATIONS.some(h => c === h || c === h + ".")) return true;
    const words = c.split(" ");
    if (words.length > 4) {
      const uniqueWords = new Set(words);
      if (uniqueWords.size / words.length < 0.4) return true;
    }
    return false;
  };

  // --- Speech Synthesis ---
  const speak = useCallback((text: string, index: number) => {
    if (speakingId === index) {
      speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    if (!window.speechSynthesis) {
      toast({ title: "Non supporté", description: "Lecture vocale non disponible sur ce navigateur", variant: "destructive" });
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.05;
    const loadVoice = () => {
      const voices = speechSynthesis.getVoices();
      const fr = voices.find(v => v.lang === "fr-FR" || v.lang.startsWith("fr"));
      if (fr) utterance.voice = fr;
    };
    if (speechSynthesis.getVoices().length > 0) loadVoice();
    else speechSynthesis.onvoiceschanged = loadVoice;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = (e) => {
      setSpeakingId(null);
      if (e.error !== "interrupted" && e.error !== "canceled") {
        toast({ title: "Lecture impossible", variant: "destructive" });
      }
    };
    setSpeakingId(index);
    speechSynthesis.speak(utterance);
  }, [speakingId, toast]);

  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.05;
    const voices = speechSynthesis.getVoices();
    const fr = voices.find(v => v.lang === "fr-FR" || v.lang.startsWith("fr"));
    if (fr) utterance.voice = fr;
    speechSynthesis.speak(utterance);
  }, []);

  // --- Image Compression ---
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const MAX_DIM = 1920;
          if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  // --- File Attachment ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "Fichier trop lourd", description: "Maximum 20 Mo par fichier.", variant: "destructive" });
        continue;
      }
      let base64: string;
      let finalType = file.type;
      if (file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
        toast({ title: "📸 Optimisation en cours...", description: "L'image est compressée pour l'envoi" });
        base64 = await compressImage(file);
        finalType = "image/jpeg";
      } else {
        base64 = await fileToBase64(file);
      }
      setAttachments(prev => [...prev, {
        name: file.name,
        type: finalType,
        data: base64,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // --- Voice Recording ---
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        if (blob.size < 5000) {
          toast({ title: "Enregistrement trop court", description: "Maintiens le bouton et parle clairement", variant: "destructive" });
          return;
        }
        await transcribeAndSend(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch {
      toast({ title: "Micro inaccessible", description: "Autorise l'accès au micro.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    const tooShort = recordingSeconds < 2;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      if (tooShort) {
        toast({ title: "Trop court", description: "Maintiens le bouton et parle pendant au moins 2 secondes", variant: "destructive" });
      }
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
  };

  const transcribeAndSend = async (audioBlob: Blob) => {
    if (audioBlob.size < 3000) {
      toast({ title: "Enregistrement trop court", description: "Maintiens le bouton plus longtemps", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const audioUrl = URL.createObjectURL(audioBlob);
    const userMsg: Message = { role: "user", content: "🎤 Message vocal...", type: "audio", audioUrl };
    setMessages(prev => [...prev, userMsg]);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const sttUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`;
      const { data: { session: sttSession } } = await supabase.auth.getSession();
      const resp = await fetch(sttUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${sttSession?.access_token}` },
        body: formData,
      });
      if (!resp.ok) throw new Error("Transcription failed");
      const sttData = await resp.json();
      const transcript = sttData?.transcript;
      if (sttData?.empty === true || !transcript?.trim() || isHallucination(transcript)) {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: "🎤 Je n'ai rien entendu. Parle directement dans le micro et réessaie." }
            : m
        ));
        setIsLoading(false);
        return;
      }
      setMessages(prev =>
        prev.map((m, i) => i === prev.length - 1 ? { ...m, content: transcript } : m)
      );
      await saveMessage("user", transcript);
      await sendToChat(transcript, prev => prev);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de transcrire l'audio.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  // --- Action Handlers ---
  const handleQuickSave = async (transaction: TransactionData) => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id);
      const cat = cats?.find(c =>
        c.name.toLowerCase().includes(transaction.category.toLowerCase())
      );
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: transaction.type === "income" ? "income" : "expense",
        amount: transaction.amount,
        note: transaction.note || transaction.category,
        date: transaction.date || today,
        category_id: cat?.id || null,
      });
      const confirmText = `✅ C'est noté ! ${transaction.amount.toLocaleString()} FCFA enregistré.`;
      const confirmMsg: Message = { role: "assistant", content: confirmText, type: "text" };
      setMessages(prev => [...prev, confirmMsg]);
      await saveMessage("assistant", confirmMsg.content);
      toast({ title: "✅ Transaction enregistrée !" });
      speakText(confirmText);
    } catch {
      toast({ title: "Erreur d'enregistrement", variant: "destructive" });
    }
  };

  const handleQuickDebt = async (debt: DebtData) => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split("T")[0];

      if (debt.action === "create_debt") {
        const { error } = await supabase.from("debts").insert({
          user_id: user.id,
          person_name: debt.person_name,
          type: debt.debt_type === "owed_to_me" ? "owed_to_me" : "i_owe",
          amount: debt.amount || 0,
          due_date: debt.due_date || null,
          note: debt.note || "",
          status: "pending",
        });
        if (error) {
          toast({ title: "Erreur Supabase", description: error.message, variant: "destructive" });
          return;
        }
        if (debt.debt_type === "owed_to_me" && debt.amount_paid && debt.amount_paid > 0) {
          await supabase.from("transactions").insert({
            user_id: user.id,
            type: "income",
            amount: debt.amount_paid,
            note: `Remboursement partiel de ${debt.person_name}`,
            date: today,
          });
        }
      }

      if (debt.action === "update_debt") {
        const { data: existing } = await supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)
          .ilike("person_name", `%${debt.person_name}%`)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        if (existing) {
          const newAmount = Math.max(0, Number(existing.amount) - (debt.amount_paid || 0));
          await supabase.from("debts").update({
            amount: newAmount,
            status: newAmount <= 0 ? "paid" : "pending",
          }).eq("id", existing.id);
        }

        if (debt.amount_paid && debt.amount_paid > 0) {
          await supabase.from("transactions").insert({
            user_id: user.id,
            type: "income",
            amount: debt.amount_paid,
            note: `Remboursement de ${debt.person_name}`,
            date: today,
          });
        }
      }

      const confirmText = debt.action === "create_debt"
        ? `✅ Dette enregistrée pour ${debt.person_name} — ${(debt.amount || 0).toLocaleString()} FCFA`
        : `✅ Mis à jour ! ${debt.amount_paid?.toLocaleString()} FCFA reçu de ${debt.person_name}`;
      const confirmMsg: Message = { role: "assistant", content: confirmText, type: "text" };
      setMessages(prev => [...prev, confirmMsg]);
      await saveMessage("assistant", confirmMsg.content);
      toast({ title: "✅ Dette enregistrée !" });
      speakText(confirmText);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la dette", variant: "destructive" });
    }
  };

  const handleTontinePayment = async (payment: TontinePaymentData) => {
    if (!user) return;
    try {
      // Find the member by name in the tontine
      const { data: members } = await supabase
        .from("tontine_members" as any)
        .select("id, name")
        .eq("tontine_id", payment.tontine_id)
        .ilike("name", `%${payment.member_name}%`);

      const member = (members as any)?.[0];
      if (!member) {
        toast({ title: `Membre "${payment.member_name}" introuvable`, variant: "destructive" });
        return;
      }

      // Insert payment
      const { error } = await supabase.from("tontine_payments" as any).insert({
        cycle_id: payment.cycle_id,
        member_id: member.id,
        amount_paid: payment.amount,
        payment_date: new Date().toISOString().split("T")[0],
        note: `Cotisation via assistant`,
      });

      if (error) {
        toast({ title: "Erreur d'enregistrement", description: (error as any).message, variant: "destructive" });
        return;
      }

      // Update cycle total_collected
      const { data: cycle } = await supabase
        .from("tontine_cycles" as any)
        .select("total_collected")
        .eq("id", payment.cycle_id)
        .maybeSingle();

      if (cycle) {
        await supabase.from("tontine_cycles" as any)
          .update({ total_collected: Number((cycle as any).total_collected) + payment.amount })
          .eq("id", payment.cycle_id);
      }

      // Count remaining unpaid members
      const { data: allMembers } = await supabase
        .from("tontine_members" as any)
        .select("id")
        .eq("tontine_id", payment.tontine_id);

      const { data: payments } = await supabase
        .from("tontine_payments" as any)
        .select("member_id")
        .eq("cycle_id", payment.cycle_id);

      const paidIds = new Set((payments as any[] || []).map((p: any) => p.member_id));
      const remaining = (allMembers as any[] || []).filter((m: any) => !paidIds.has(m.id)).length;

      const confirmText = `C'est noté. ${payment.member_name} a payé ${payment.amount.toLocaleString()} francs. Il reste ${remaining} membre${remaining > 1 ? "s" : ""} à payer ce mois-ci.`;
      const confirmMsg: Message = { role: "assistant", content: `✅ ${confirmText}`, type: "text" };
      setMessages(prev => [...prev, confirmMsg]);
      await saveMessage("assistant", confirmMsg.content);
      toast({ title: "✅ Cotisation enregistrée !" });
      speakText(confirmText);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la cotisation", variant: "destructive" });
    }
  };

  const handleCreateSavingsGoal = async (goal: SavingsGoalData) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        name: goal.name,
        target_amount: goal.target_amount,
        deadline: goal.deadline || null,
        current_amount: 0,
      });

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }

      const confirmText = `Objectif "${goal.name}" créé ! ${goal.target_amount.toLocaleString()} francs à atteindre${goal.deadline ? ` avant le ${new Date(goal.deadline).toLocaleDateString("fr-FR")}` : ""}. Tu peux suivre ta progression dans Épargne.`;
      const confirmMsg: Message = { role: "assistant", content: `🎯 ${confirmText}`, type: "text" };
      setMessages(prev => [...prev, confirmMsg]);
      await saveMessage("assistant", confirmMsg.content);
      toast({ title: "🎯 Objectif d'épargne créé !" });
      speakText(confirmText);
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer l'objectif", variant: "destructive" });
    }
  };

  // --- Handle update_transaction action ---
  const handleAssistantAction = async (rawContent: string) => {
    const updateMatch = rawContent.match(/```transaction\s*\n?([\s\S]*?)\n?```/);
    if (!updateMatch) return;
    let action: any;
    try { action = JSON.parse(updateMatch[1].trim()); } catch { return; }
    if (!user || !action?.action) return;

    if (action.action === "update_transaction") {
      const amount = Number(action.amount) || 0;
      const date = String(action.date || "");
      const catName = String(action.category || "").trim();

      const { data: cat } = await supabase.from("categories").select("id, name").eq("user_id", user.id).ilike("name", catName).maybeSingle();
      if (!cat) { toast({ title: `Catégorie "${catName}" introuvable`, variant: "destructive" }); return; }

      let query = supabase.from("transactions").select("id, amount, note, merchant_name").eq("user_id", user.id);
      if (date) query = query.eq("date", date);
      if (amount > 0) query = query.gte("amount", amount * 0.85).lte("amount", amount * 1.15);

      const { data: txList } = await query.limit(1);
      const tx = txList?.[0];
      if (!tx) { toast({ title: "Transaction introuvable", variant: "destructive" }); return; }

      const { error } = await supabase.from("transactions").update({ category_id: cat.id }).eq("id", tx.id);
      if (error) { toast({ title: "Erreur Supabase", variant: "destructive" }); return; }

      const label = tx.merchant_name || tx.note || "Transaction";
      const confirmText = `✅ Catégorie mise à jour !\n📦 ${label} — ${Number(tx.amount).toLocaleString()} FCFA\n📂 Déplacé vers : ${cat.name}`;
      setMessages(prev => [...prev, { role: "assistant", content: confirmText, type: "text" }]);
      await saveMessage("assistant", confirmText);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isLoading) return;
    const userMsg: Message = {
      role: "user",
      content: text || (attachments.length > 0 ? "📎 Fichier envoyé" : ""),
      type: "text",
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);
    await saveMessage("user", userMsg.content);
    await sendToChat(userMsg.content, () => messages, currentAttachments);
  };

  const sendToChat = async (
    latestContent: string,
    _getMessages: (prev: Message[]) => Message[],
    fileAttachments?: Attachment[]
  ) => {
    try {
      const allMessages = [...messages];
      allMessages.push({ role: "user", content: latestContent, type: "text" });
      const body: any = {
        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
      };
      const atts = fileAttachments || attachments;
      if (atts.length > 0) {
        body.attachments = atts.map(a => ({ name: a.name, type: a.type, data: a.data }));
      }
      const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const { data: { session: chatSession } } = await supabase.auth.getSession();
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${chatSession?.access_token}`,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.error || "Impossible de contacter l'assistant.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!resp.body) throw new Error("No stream body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > initialMessages.length) {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
                }
                return [...prev, { role: "assistant", content: snapshot, type: "text" }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev =>
                prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m))
              );
            }
          } catch { /* ignore */ }
        }
      }
      // Save raw, clean display, execute actions
      if (assistantSoFar) {
        await saveMessage("assistant", assistantSoFar);

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return prev;
        });

        // Execute update_transaction action if present
        handleAssistantAction(assistantSoFar);

        if (continuousModeRef.current) {
          setMessages(prev => {
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].role === "assistant") {
              const clean = cleanMessageContent(prev[lastIdx].content);
              if (clean) {
                setTimeout(() => speak(clean, lastIdx), 200);
              }
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Connexion perdue avec l'assistant.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContinuousMode = () => {
    const next = !continuousMode;
    setContinuousMode(next);
    if (next) {
      toast({ title: "🎙️ Mode conversation activé", description: "Parle, l'assistant répondra et écoutera en boucle." });
      startRecording();
    } else {
      speechSynthesis.cancel();
      setSpeakingId(null);
      if (isRecording) stopRecording();
    }
  };

  // --- Render Action Cards ---
  const renderActionCards = (content: string, messageIndex: number) => {
    const cards: JSX.Element[] = [];

    // Transaction card
    const { transaction } = extractTransaction(content);
    if (transaction) {
      cards.push(
        <div key="tx" className="mt-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            ✅ Transaction détectée
          </p>
          <div className="text-sm text-foreground space-y-0.5">
            <p>💰 <strong>{transaction.amount.toLocaleString()} FCFA</strong></p>
            <p>📁 {transaction.category}</p>
            {transaction.note && <p>📝 {transaction.note}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirmedCards.has(messageIndex)) return;
                setConfirmedCards(prev => new Set(prev).add(messageIndex));
                handleQuickSave(transaction);
              }}
              disabled={confirmedCards.has(messageIndex)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                confirmedCards.has(messageIndex)
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {confirmedCards.has(messageIndex) ? "✅ Enregistré" : "✅ Oui, enregistrer"}
            </button>
            <button
              onClick={() => {
                setMessages(prev => prev.map((msg, idx) =>
                  idx === messageIndex ? { ...msg, content: extractTransaction(msg.content).cleanContent } : msg
                ));
              }}
              className="flex-1 py-2 rounded-xl bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-colors"
            >
              ❌ Non
            </button>
          </div>
        </div>
      );
    }

    // Debt card
    const { debt } = extractDebt(content);
    if (debt) {
      cards.push(
        <div key="debt" className="mt-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            {debt.action === "update_debt" ? "📊 Mise à jour dette" :
             debt.debt_type === "owed_to_me" ? "💚 Créance détectée" : "📝 Dette détectée"}
          </p>
          <div className="text-sm text-foreground space-y-1">
            <p>👤 <strong>{debt.person_name}</strong></p>
            {debt.amount != null && <p>💰 Montant : <strong>{debt.amount.toLocaleString()} FCFA</strong></p>}
            {debt.amount_paid != null && <p>✅ Payé : <strong>{debt.amount_paid.toLocaleString()} FCFA</strong></p>}
            {debt.remaining != null && <p>⏳ Reste : <strong>{debt.remaining.toLocaleString()} FCFA</strong></p>}
            {debt.due_date && <p>📅 Échéance : <strong>{new Date(debt.due_date).toLocaleDateString("fr-FR")}</strong></p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirmedCards.has(messageIndex + 1000)) return;
                setConfirmedCards(prev => new Set(prev).add(messageIndex + 1000));
                handleQuickDebt(debt);
              }}
              disabled={confirmedCards.has(messageIndex + 1000)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                confirmedCards.has(messageIndex + 1000)
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {confirmedCards.has(messageIndex + 1000) ? "✅ Confirmé" : "✅ Confirmer"}
            </button>
            <button
              onClick={() => {
                setMessages(prev => prev.map((msg, idx) =>
                  idx === messageIndex ? { ...msg, content: extractDebt(extractTransaction(msg.content).cleanContent).cleanContent } : msg
                ));
              }}
              className="flex-1 py-2 rounded-xl bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-colors"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      );
    }

    // Tontine payment card
    const { tontinePayment } = extractTontineAction(content);
    if (tontinePayment) {
      cards.push(
        <div key="tontine" className="mt-2 rounded-2xl border border-accent/30 bg-accent/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-foreground" />
            <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wide">
              💰 Paiement Tontine détecté
            </p>
          </div>
          <div className="text-sm text-foreground space-y-1">
            <p>👤 Membre : <strong>{tontinePayment.member_name}</strong></p>
            <p>💰 Montant : <strong>{tontinePayment.amount.toLocaleString()} FCFA</strong></p>
            <p>🤝 Tontine : <strong>{tontinePayment.tontine_name}</strong></p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirmedCards.has(messageIndex + 2000)) return;
                setConfirmedCards(prev => new Set(prev).add(messageIndex + 2000));
                handleTontinePayment(tontinePayment);
              }}
              disabled={confirmedCards.has(messageIndex + 2000)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                confirmedCards.has(messageIndex + 2000)
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {confirmedCards.has(messageIndex + 2000) ? "✅ Enregistré" : "✅ Confirmer"}
            </button>
            <button
              onClick={() => {
                setMessages(prev => prev.map((msg, idx) =>
                  idx === messageIndex ? { ...msg, content: extractTontineAction(msg.content).cleanContent } : msg
                ));
              }}
              className="flex-1 py-2 rounded-xl bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-colors"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      );
    }

    // Savings goal card
    const { savingsGoal } = extractSavingsAction(content);
    if (savingsGoal) {
      cards.push(
        <div key="savings" className="mt-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              🎯 Objectif d'épargne détecté
            </p>
          </div>
          <div className="text-sm text-foreground space-y-1">
            <p>📌 Nom : <strong>{savingsGoal.name}</strong></p>
            <p>💰 Objectif : <strong>{savingsGoal.target_amount.toLocaleString()} FCFA</strong></p>
            {savingsGoal.deadline && (
              <p>📅 Avant le : <strong>{new Date(savingsGoal.deadline).toLocaleDateString("fr-FR")}</strong></p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirmedCards.has(messageIndex + 3000)) return;
                setConfirmedCards(prev => new Set(prev).add(messageIndex + 3000));
                handleCreateSavingsGoal(savingsGoal);
              }}
              disabled={confirmedCards.has(messageIndex + 3000)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                confirmedCards.has(messageIndex + 3000)
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {confirmedCards.has(messageIndex + 3000) ? "🎯 Créé" : "✅ Créer l'objectif"}
            </button>
            <button
              onClick={() => {
                setMessages(prev => prev.map((msg, idx) =>
                  idx === messageIndex ? { ...msg, content: extractSavingsAction(msg.content).cleanContent } : msg
                ));
              }}
              className="flex-1 py-2 rounded-xl bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-colors"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      );
    }

    return cards;
  };

  return (
    <DashboardLayout title="Assistant IA">
      <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
        {/* Top action bar */}
        <div className="flex items-center justify-end gap-2 pb-3">
          <button
            onClick={toggleContinuousMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              continuousMode
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{continuousMode ? "Conversation ON" : "Conversation"}</span>
          </button>
          <ConfirmDeleteDialog
            onConfirm={clearHistory}
            title="Supprimer l'historique"
            description="Tout l'historique de discussion sera supprimé définitivement. Continuer ?"
          >
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-destructive hover:bg-secondary/80 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>
          </ConfirmDeleteDialog>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Quitter</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]">
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {m.attachments.map((att, j) => (
                      <div key={j} className="rounded-lg overflow-hidden">
                        {att.preview ? (
                          <img src={att.preview} alt={att.name} className="w-20 h-20 object-cover rounded-lg" />
                        ) : (
                          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg px-2 py-1 text-xs">
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {m.type === "audio" && m.audioUrl && (
                  <audio src={m.audioUrl} controls className="h-8 w-48" />
                )}
                {(() => {
                  const displayContent = cleanMessageContent(m.content);
                  return (
                    <>
                      {i === 0 && m.role === "assistant" ? (
                        <BorderRotate className="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap text-foreground" animationSpeed={14}>
                          {displayContent}
                        </BorderRotate>
                      ) : (
                        <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          m.role === "user"
                            ? "gradient-primary text-primary-foreground"
                            : "glass-card text-foreground"
                        }`}>
                          {displayContent}
                        </div>
                      )}
                      {m.role === "assistant" && renderActionCards(m.content, i)}
                      {m.role === "assistant" && displayContent && i > 0 && (
                        <button
                          onClick={() => speak(displayContent, i)}
                          className="self-start flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {speakingId === i ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          {speakingId === i ? "Stop" : "Écouter"}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="glass-card rounded-2xl px-4 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Attachment preview bar */}
        {attachments.length > 0 && (
          <div className="flex gap-2 pb-2 overflow-x-auto">
            {attachments.map((att, i) => (
              <div key={i} className="relative flex-shrink-0">
                {att.preview ? (
                  <img src={att.preview} alt={att.name} className="w-16 h-16 object-cover rounded-lg border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-border flex flex-col items-center justify-center bg-secondary/30 gap-1">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground truncate max-w-[56px] px-1">{att.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick action buttons */}
        {messages.length <= 3 && !isLoading && (
          <div className="pb-3">
            <p className="text-xs text-muted-foreground mb-2 text-center">
              Appuie sur un bouton ou tape directement 👇
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(a.text);
                    inputRef.current?.focus();
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary hover:bg-primary/10 hover:border-primary/30 border border-border transition-all"
                >
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.csv,.doc,.docx"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="space-y-2 pb-2">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isRecording}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
              }}
              placeholder={
                isRecording
                  ? `🔴 Écoute... ${(recordingSeconds % 60).toString().padStart(2, "0")}s`
                  : "Tape ou parle..."
              }
              className="bg-secondary border-border flex-1"
              disabled={isLoading || isRecording}
            />
            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <button
                onClick={() => isRecording ? stopRecording() : startRecording()}
                disabled={isLoading}
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50 shadow-lg ${
                  isRecording
                    ? "bg-destructive animate-pulse shadow-destructive/40"
                    : "gradient-primary neon-glow"
                }`}
              >
                {isRecording
                  ? <MicOff className="w-5 h-5 text-white" />
                  : <Mic className="w-5 h-5 text-primary-foreground" />
                }
              </button>
            )}
          </div>
          {!isRecording && !input && (
            <p className="text-center text-xs text-muted-foreground">
              🎤 Appuie sur le micro et parle directement
            </p>
          )}
          {isRecording && (
            <p className="text-center text-xs text-destructive font-medium animate-pulse">
              🔴 Je t'écoute... Appuie à nouveau pour envoyer
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Assistant;
