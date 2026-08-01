"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AssistantChatProps {
  projectId: string;
  projectName?: string;
}

const quickActions = [
  { label: "优化这段剧情", icon: "✨" },
  { label: "帮我写台词", icon: "💬" },
  { label: "镜头语言建议", icon: "🎬" },
  { label: "角色性格分析", icon: "👤" },
  { label: "分镜节奏建议", icon: "📐" },
  { label: "情绪氛围描述", icon: "🎭" },
];

export function AssistantChat({ projectId, projectName }: AssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.post<{ data: { reply: string } }>(
        `/projects/${projectId}/storyboard/assistant`,
        {
          message,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }
      );
      return response.data.data.reply;
    },
    onSuccess: (reply, message) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message, timestamp: new Date() },
        { role: "assistant", content: reply, timestamp: new Date() },
      ]);
    },
    onError: (error: unknown, message) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message, timestamp: new Date() },
        {
          role: "assistant",
          content: `抱歉，发生了错误：${error.message || "请检查 LLM API Key 配置"}`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    setInput("");
    chatMutation.mutate(text);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-anime-purple text-white shadow-lg shadow-anime-purple/30 flex items-center justify-center hover:bg-anime-purple/90 transition-colors"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </motion.button>
      )}

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px] flex flex-col rounded-2xl bg-panel-deep border border-divider shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-panel-mid border-b border-divider">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-anime-purple/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-anime-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">创作助手</h3>
                  <p className="text-[10px] text-text-secondary">{projectName || "AI 助手"}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-anime-purple/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-anime-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <h4 className="font-display text-lg font-semibold text-white mb-2">你好，我是创作助手</h4>
                  <p className="text-xs text-text-secondary mb-6 max-w-[280px]">
                    我可以帮你优化剧情、撰写台词、提供镜头语言建议等。试试下面的快捷操作：
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.label)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-panel-mid border border-divider hover:border-anime-purple/50 text-left transition-all"
                      >
                        <span className="text-sm">{action.icon}</span>
                        <span className="text-xs text-text-secondary">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          msg.role === "user"
                            ? "bg-anime-purple text-white rounded-br-md"
                            : "bg-panel-mid text-text-secondary border border-divider rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/50" : "text-text-disabled"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-panel-mid border border-divider rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-anime-purple/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-anime-purple/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-anime-purple/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-xs text-text-secondary">思考中...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-divider bg-panel-mid">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的问题..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl bg-panel-deep border border-divider px-4 py-2.5 text-sm text-white placeholder:text-text-disabled focus:outline-none focus:border-anime-purple/50 transition-colors"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending}
                  className="rounded-xl px-3"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </Button>
              </div>
              <p className="text-[10px] text-text-disabled mt-1.5 text-center">
                按 Enter 发送 · Shift+Enter 换行
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
