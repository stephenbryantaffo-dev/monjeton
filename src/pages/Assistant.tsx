import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";

type Message = { role: "user" | "assistant"; content: string };

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Salut ! 👋 Je suis ton coach financier IA. Pose-moi tes questions sur tes finances, je t'aiderai à mieux gérer ton argent.",
  },
];

const Assistant = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      { role: "assistant", content: "🔒 Fonctionnalité premium. Abonne-toi pour débloquer l'assistant IA." },
    ]);
    setInput("");
  };

  return (
    <DashboardLayout title="Assistant IA">
      <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "gradient-primary text-primary-foreground"
                  : "glass-card text-foreground"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pb-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pose ta question..."
            className="bg-secondary border-border"
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Assistant;
