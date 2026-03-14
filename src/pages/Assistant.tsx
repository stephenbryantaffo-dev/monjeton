import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Bot, Loader2, Mic, MicOff, Paperclip, Volume2, VolumeX, X, FileText, LogOut, Trash2, PlusCircle } from "lucide-react";
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

const extractTransaction = (content: string): { cleanContent: string; transaction: TransactionData | null } => {
  const regex = /```transaction\s*\n(\{[\s\S]*?\})\s*\n```/;
  const match = content.match(regex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.action === "create_transaction" && parsed.amount) {
        return {
          cleanContent: content.replace(regex, "").trim(),
          transaction: parsed as TransactionData,
        };
      }
    } catch { /* ignore parse errors */ }
  }
  // Also try inline JSON pattern
  const inlineRegex = /\{"action"\s*:\s*"create_transaction"[^}]+\}/;
  const inlineMatch = content.match(inlineRegex);
  if (inlineMatch) {
    try {
      const parsed = JSON.parse(inlineMatch[0]);
      if (parsed.amount) {
        return {
          cleanContent: content.replace(inlineRegex, "").trim(),
          transaction: parsed as TransactionData,
        };
      }
    } catch { /* ignore */ }
  }
  return { cleanContent: content, transaction: null };
};

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Salut ! 👋 Je suis ton coach financier. Pose-moi ta question, envoie un vocal ou une photo de ticket !",
    type: "text",
  },
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Load saved messages on mount
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
    toast({ title: "Historique supprimé", description: "Toutes les conversations ont été effacées." });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Speech Synthesis ---
  const speak = useCallback((text: string, index: number) => {
    if (speakingId === index) {
      speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.1;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(index);
    speechSynthesis.speak(utterance);
  }, [speakingId]);

  // --- File Attachment ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Fichier trop lourd", description: "Max 5 Mo par fichier.", variant: "destructive" });
        continue;
      }
      const base64 = await fileToBase64(file);
      const att: Attachment = {
        name: file.name,
        type: file.type,
        data: base64,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };
      setAttachments(prev => [...prev, att]);
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
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
  };

  const transcribeAndSend = async (audioBlob: Blob) => {
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
      const { transcript } = await resp.json();

      if (!transcript?.trim()) {
        toast({ title: "Audio vide", description: "Je n'ai pas compris, réessaie.", variant: "destructive" });
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

  // --- Send Message ---
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

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

      // Save assistant response
      if (assistantSoFar) {
        await saveMessage("assistant", assistantSoFar);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Connexion perdue avec l'assistant.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Assistant IA">
      <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
        {/* Top action bar */}
        <div className="flex items-center justify-end gap-2 pb-3">
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
              <div className="flex flex-col gap-1 max-w-[80%]">
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
                  const { cleanContent, transaction } = m.role === "assistant"
                    ? extractTransaction(m.content)
                    : { cleanContent: m.content, transaction: null };
                  return (
                    <>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        m.role === "user"
                          ? "gradient-primary text-primary-foreground"
                          : "glass-card text-foreground"
                      }`}>
                        {cleanContent}
                      </div>
                      {transaction && (
                        <button
                          onClick={() => navigate("/transactions/new", {
                            state: {
                              amount: transaction.amount,
                              type: transaction.type,
                              category: transaction.category,
                              note: transaction.note,
                              date: transaction.date,
                              wallet: transaction.wallet,
                            }
                          })}
                          className="self-start flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Créer cette transaction ({transaction.amount.toLocaleString()} FCFA)
                        </button>
                      )}
                      {m.role === "assistant" && cleanContent && i > 0 && (
                        <button
                          onClick={() => speak(cleanContent, i)}
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

        {/* Input bar */}
        <div className="flex gap-2 pb-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.csv,.doc,.docx"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isRecording}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend(); }}
            placeholder={isRecording ? `🔴 Enregistrement... ${Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:${(recordingSeconds % 60).toString().padStart(2, "0")}` : "Pose ta question..."}
            className="bg-secondary border-border"
            disabled={isLoading || isRecording}
          />

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => isRecording && stopRecording()}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            disabled={isLoading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50 ${
              isRecording
                ? "bg-destructive animate-pulse"
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            {isRecording ? (
              <MicOff className="w-4 h-4 text-destructive-foreground" />
            ) : (
              <Mic className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <button
            onClick={handleSend}
            disabled={isLoading || isRecording}
            className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Assistant;
