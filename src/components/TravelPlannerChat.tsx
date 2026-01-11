"use client";

import { useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { Itinerary } from "@/lib/types";

export default function TravelPlannerChat({
  itinerary,
  onRegenerate,
  isRegenerating = false,
}: {
  itinerary: Itinerary;
  onRegenerate: (history: { role: string; text: string }[]) => void;
  isRegenerating?: boolean;
}) {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: {
      itinerary,
    },
    initialMessages: [
      {
        id: "initial",
        role: "assistant",
        content: "いかがでしたか？プランについて気になるところや、詳しく知りたいことがあれば教えてくださいね！",
      },
    ],
  });

  // Track if user has interacted (sent at least one message)
  const hasInteracted = messages.some((m) => m.role === "user");

  // Auto-scroll to bottom within chat container when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Convert messages to the format expected by onRegenerate
  const handleRegenerate = () => {
    const formattedHistory = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      text: m.content,
    }));
    onRegenerate(formattedHistory);
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isRegenerating) return;
    handleSubmit(e);
  };

  return (
    <div className="mt-8 pt-8 animate-in fade-in duration-700">
      <h3 className="text-xl font-serif text-stone-800 mb-4 px-2">
        Chat with your Planner
      </h3>
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-stone-200 shadow-sm space-y-4">
        <div ref={chatContainerRef} className="max-h-[300px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {messages.length === 0 && (
            <p className="text-stone-500 text-sm italic text-center">
              Ask me to adjust the schedule, suggest restaurants, or explain
              more about a spot.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-xs ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-white border border-stone-100 text-stone-700 rounded-bl-none"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-stone-100 text-stone-500 rounded-2xl rounded-bl-none px-5 py-3 text-sm animate-pulse">
                考え中...
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start">
              <div className="bg-red-50 text-red-600 rounded-2xl rounded-bl-none px-5 py-3 text-sm">
                エラーが発生しました。もう一度お試しください。
                <br />
                問題が解決しない場合は、
                <a
                  href="/contact"
                  className="underline font-medium ml-1"
                >
                  お問い合わせページ
                </a>
                からご連絡ください。
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={onFormSubmit} className="flex gap-2 items-center bg-white rounded-full border border-stone-200 px-2 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="例: もっと安いランチの選択肢はありますか？"
            disabled={isRegenerating}
            className="flex-1 bg-transparent border-none px-4 py-1 text-stone-800 text-sm focus:outline-hidden placeholder:text-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isRegenerating}
            className="p-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>

      {hasInteracted && !isLoading && (
        <div className="mt-4 flex justify-end animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200 transition-all font-bold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            会話の内容でプランを再生成
          </button>
        </div>
      )}
    </div>
  );
}
