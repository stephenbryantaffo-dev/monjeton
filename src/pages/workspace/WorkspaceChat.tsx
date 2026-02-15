import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import AiSuggestionCard from "@/components/workspace/AiSuggestionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_display_name: string;
  sender_role: string;
  message_type: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

interface AiSuggestion {
  amount: number;
  currency: string;
  converted_amount_xof: number | null;
  exchange_rate: number | null;
  exchange_rate_source: string | null;
  date: string;
  merchant: string;
  type: string;
  category: string;
  wallet: string;
}

const roleBadgeColor: Record<string, string> = {
  owner: "bg-primary/20 text-primary",
  admin: "bg-accent/20 text-accent",
  accountant: "bg-yellow-500/20 text-yellow-400",
  member: "bg-secondary text-secondary-foreground",
  viewer: "bg-muted text-muted-foreground",
};

const WorkspaceChat = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { activeMember } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ocrLoading, setOcrLoading] = useState<string | null>(null); // messageId being analyzed
  const [suggestions, setSuggestions] = useState<Record<string, AiSuggestion>>({}); // messageId -> suggestion
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch general room
  useEffect(() => {
    if (!workspaceId) return;
    const fetchRoom = async () => {
      const { data } = await supabase
        .from("workspace_chat_rooms")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("type", "general")
        .single();
      if (data) setRoomId(data.id);
    };
    fetchRoom();
  }, [workspaceId]);

  // Fetch messages + subscribe
  useEffect(() => {
    if (!roomId || !workspaceId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("workspace_chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "workspace_chat_messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, workspaceId]);

  const sendMessage = async () => {
    if (!input.trim() || !roomId || !user || !activeMember || !workspaceId) return;
    setSending(true);
    const { error } = await supabase.from("workspace_chat_messages").insert({
      room_id: roomId,
      workspace_id: workspaceId,
      sender_id: user.id,
      sender_display_name: activeMember.display_name,
      sender_role: activeMember.role,
      content: input.trim(),
      message_type: "text",
    });
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setInput("");
    setSending(false);
  };

  const runOcr = async (fileUrl: string, messageId: string) => {
    setOcrLoading(messageId);
    try {
      // Fetch image as base64
      const resp = await fetch(fileUrl);
      const blob = await resp.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });

      const mimeType = blob.type || "image/jpeg";

      // Call scan-receipt edge function
      const { data: scanData, error: scanErr } = await supabase.functions.invoke("scan-receipt", {
        body: { image: base64, scanType: "screenshot", mimeType },
      });

      if (scanErr) throw new Error(scanErr.message);

      const parsed = scanData?.parsed;
      if (!parsed?.amount) {
        toast({ title: "OCR", description: "Aucun montant détecté sur cette image.", variant: "destructive" });
        return;
      }

      // Convert currency if not XOF
      let converted_amount_xof: number | null = null;
      let exchange_rate: number | null = null;
      let exchange_rate_source: string | null = null;

      const currency = (parsed.currency || "XOF").toUpperCase();
      if (currency !== "XOF") {
        const { data: convData, error: convErr } = await supabase.functions.invoke("convert-currency", {
          body: { amount: parsed.amount, from_currency: currency, to_currency: "XOF" },
        });
        if (!convErr && convData) {
          converted_amount_xof = convData.converted_amount;
          exchange_rate = convData.exchange_rate;
          exchange_rate_source = convData.source;
        }
      }

      const suggestion: AiSuggestion = {
        amount: parsed.amount,
        currency,
        converted_amount_xof,
        exchange_rate,
        exchange_rate_source,
        date: parsed.date || new Date().toISOString().split("T")[0],
        merchant: parsed.merchant || "",
        type: parsed.type || "expense",
        category: parsed.category || "",
        wallet: parsed.wallet || "",
      };

      setSuggestions(prev => ({ ...prev, [messageId]: suggestion }));

      // Send AI suggestion system message
      if (roomId && user && activeMember && workspaceId) {
        const displayAmt = converted_amount_xof ?? parsed.amount;
        await supabase.from("workspace_chat_messages").insert({
          room_id: roomId,
          workspace_id: workspaceId,
          sender_id: user.id,
          sender_display_name: "🤖 Assistant IA",
          sender_role: "system",
          content: JSON.stringify(suggestion),
          message_type: "ai_suggestion",
        });
      }
    } catch (e: any) {
      toast({ title: "Erreur OCR", description: e.message, variant: "destructive" });
    } finally {
      setOcrLoading(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId || !user || !activeMember || !workspaceId) return;
    const path = `${workspaceId}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("chat-files").upload(path, file);
    if (uploadErr) { toast({ title: "Erreur upload", description: uploadErr.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);

    const { data: msgData } = await supabase.from("workspace_chat_messages").insert({
      room_id: roomId,
      workspace_id: workspaceId,
      sender_id: user.id,
      sender_display_name: activeMember.display_name,
      sender_role: activeMember.role,
      content: null,
      message_type: "file",
      file_url: urlData.publicUrl,
      file_name: file.name,
    }).select("id").single();

    // Auto-trigger OCR for image files
    if (file.type.startsWith("image/") && msgData?.id) {
      runOcr(urlData.publicUrl, msgData.id);
    }

    e.target.value = "";
  };

  const isImageFile = (url: string | null) =>
    url ? /\.(jpg|jpeg|png|gif|webp)$/i.test(url) : false;

  const parseAiSuggestion = (content: string | null): AiSuggestion | null => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  return (
    <WorkspaceLayout title="Chat">
      <div className="flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">Aucun message. Commencez la conversation ! 💬</p>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            const isAiSuggestion = msg.message_type === "ai_suggestion";

            if (isAiSuggestion) {
              const suggestion = parseAiSuggestion(msg.content);
              if (!suggestion || !workspaceId || !user) return null;
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <AiSuggestionCard
                    suggestion={suggestion}
                    workspaceId={workspaceId}
                    userId={user.id}
                  />
                </div>
              );
            }

            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5", isMe ? "bg-primary/20 rounded-tr-md" : "glass-card rounded-tl-md")}>
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{msg.sender_display_name}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize", roleBadgeColor[msg.sender_role] || "bg-muted text-muted-foreground")}>
                        {msg.sender_role}
                      </span>
                    </div>
                  )}
                  {msg.message_type === "file" && msg.file_url ? (
                    <div>
                      {isImageFile(msg.file_url) ? (
                        <div className="space-y-2">
                          <img src={msg.file_url} alt={msg.file_name || "image"} className="max-w-full rounded-lg" />
                          {/* OCR button for images not yet analyzed */}
                          {ocrLoading === msg.id ? (
                            <div className="flex items-center gap-2 text-primary text-xs">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Analyse OCR en cours...
                            </div>
                          ) : !suggestions[msg.id] ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-primary/30 text-primary"
                              onClick={() => runOcr(msg.file_url!, msg.id)}
                            >
                              <Bot className="w-3 h-3 mr-1" /> Analyser ce reçu
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <a href={msg.file_url} target="_blank" rel="noopener" className="text-primary underline text-sm">
                          📎 {msg.file_name || "Fichier"}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 pt-2">
          <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileRef.current?.click()}>
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Écrire un message..."
            className="bg-secondary/50 rounded-xl"
          />
          <Button size="icon" disabled={!input.trim() || sending} onClick={sendMessage} className="shrink-0 gradient-primary rounded-xl">
            <Send className="w-4 h-4 text-primary-foreground" />
          </Button>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default WorkspaceChat;
