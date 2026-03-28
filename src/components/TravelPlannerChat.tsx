"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "ai/react";
import type { Message } from "ai";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Itinerary } from '@/types';
import ModelBadge from "@/components/ui/ModelBadge";
import { localizeHref, resolveLanguageFromPathname } from "@/lib/i18n/navigation";
import type { ResolvedRegenerationState } from "@/lib/utils/travel-planner-chat";

const REGEN_READY_TAG = "[[REGEN_READY]]";

const stripRegenReadyTag = (text: string) =>
  text.replace(/\s*\[\[REGEN_READY\]\]\s*/g, " ").trim();

const hasRegenReadyTag = (text: string) => text.includes(REGEN_READY_TAG);

export default function TravelPlannerChat({
  itinerary,
  onRegenerate,
  isRegenerating = false,
  initialChatHistory,
  onChatChange,
  resolvedRegeneration,
  onResolvedRegenerationClear,
}: {
  itinerary: Itinerary;
  onRegenerate: (history: { role: string; text: string }[]) => void;
  isRegenerating?: boolean;
  initialChatHistory?: { role: string; text: string }[];
  onChatChange?: (messages: { role: string; text: string }[]) => void;
  resolvedRegeneration?: ResolvedRegenerationState | null;
  onResolvedRegenerationClear?: () => void;
}) {
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);
  const tChat = useTranslations("components.travelPlannerChat");
  const tPlan = useTranslations("app.planner.plan");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const regenerateTriggerMessage = tPlan("regenerateInstruction");
  const suggestionChipsRaw = tChat.raw("suggestionChips");
  const suggestionChips = Array.isArray(suggestionChipsRaw)
    ? suggestionChipsRaw.filter((chip): chip is string => typeof chip === "string")
    : [];
  const [isResolvedHistoryExpanded, setIsResolvedHistoryExpanded] = useState(false);

  const initialMessages: Message[] =
    initialChatHistory && initialChatHistory.length > 0
      ? initialChatHistory.map((h, i) => ({
          id: `hist-${i}`,
          role: h.role === "model" ? "assistant" : "user" as const,
          content: stripRegenReadyTag(h.text),
        }))
      : [
          {
            id: "initial",
            role: "assistant",
            content: tChat("initialAssistantMessage"),
          },
        ];

  const { messages, input, handleInputChange, setInput, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: {
      itinerary,
    },
    initialMessages,
  });

  const latestAssistantMessageIdWithReadyTag = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && hasRegenReadyTag(m.content))?.id;
  const shouldShowResolvedSummary = Boolean(resolvedRegeneration);

  // Auto-scroll to bottom within chat container when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Notify parent when messages change (for persistence)
  const prevMessagesLengthRef = useRef(initialMessages.length);
  useEffect(() => {
    // Only notify if messages changed (not on initial load)
    if (messages.length > prevMessagesLengthRef.current && onChatChange) {
      const formattedMessages = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: m.content,
      }));
      onChatChange(formattedMessages);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, onChatChange]);

  // Convert messages to the format expected by onRegenerate
  const handleRegenerate = () => {
    const formattedHistory = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      text: stripRegenReadyTag(m.content),
    }));
    onRegenerate([
      ...formattedHistory,
      { role: "user", text: regenerateTriggerMessage },
    ]);
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isRegenerating) return;
    onResolvedRegenerationClear?.();
    handleSubmit(e);
  };

  const handleChipClick = (text: string) => {
    setInput(text);
    // Optionally auto-submit? Maybe not, let user edit/confirm.
    // If we want auto submit, we need to hack it or just set input.
    // Let's just set input for now to let user confirm.
  };

  return (
    <div className="mt-8 pt-8 animate-in fade-in duration-700 w-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 px-2">
        <h3 className="text-xl font-serif text-stone-800">
          {tChat("title")}
        </h3>
        <ModelBadge modelName={process.env.NEXT_PUBLIC_CHAT_MODEL_NAME || "gemini-2.5-flash"} />
      </div>
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 sm:p-6 border border-stone-200 shadow-sm space-y-4 w-full min-w-0 overflow-hidden">
        <div ref={chatContainerRef} className="max-h-[300px] overflow-y-auto space-y-4 pr-1 sm:pr-2 custom-scrollbar w-full min-w-0">
          {messages.length === 0 && (
            <p className="text-stone-500 text-sm italic text-center">
              {tChat("emptyState")}
            </p>
          )}
          {shouldShowResolvedSummary && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/40">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    {tChat("appliedSummaryTitle")}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                    {tChat("appliedSummaryDescription")}
                  </p>
                  {resolvedRegeneration?.latestUserMessage && (
                    <p className="mt-3 text-sm text-emerald-950 dark:text-emerald-50">
                      <span className="font-semibold">{tChat("appliedRequestLabel")}</span>{" "}
                      {resolvedRegeneration.latestUserMessage}
                    </p>
                  )}
                  {resolvedRegeneration?.latestAssistantMessage && (
                    <p className="mt-2 text-sm text-emerald-950 dark:text-emerald-50">
                      <span className="font-semibold">{tChat("appliedPlanLabel")}</span>{" "}
                      {resolvedRegeneration.latestAssistantMessage}
                    </p>
                  )}
                  {resolvedRegeneration && resolvedRegeneration.history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsResolvedHistoryExpanded((prev) => !prev)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/80 px-3 py-1.5 text-xs font-bold text-emerald-900 transition-colors hover:bg-white dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
                    >
                      {isResolvedHistoryExpanded ? tChat("hideAppliedHistory") : tChat("showAppliedHistory")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {(!shouldShowResolvedSummary || isResolvedHistoryExpanded) && messages.map((m) => {
            const showRegenerateButton =
              !shouldShowResolvedSummary &&
              m.role === "assistant" &&
              m.id === latestAssistantMessageIdWithReadyTag &&
              !isLoading;

            return (
              <div
                key={m.id}
                className={`flex flex-col gap-2 ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 sm:px-5 py-3 text-sm leading-relaxed shadow-xs break-words overflow-wrap-anywhere ${
                    m.role === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-white border border-stone-100 text-stone-700 rounded-bl-none"
                  }`}
                >
                  {stripRegenReadyTag(m.content)}
                </div>
                {showRegenerateButton && (
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200 transition-all font-bold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {tChat("regenerateButton")}
                  </button>
                )}
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-stone-100 text-stone-500 rounded-2xl rounded-bl-none px-5 py-3 text-sm animate-pulse">
                {tChat("thinking")}
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start">
              <div className="bg-red-50 text-red-600 rounded-2xl rounded-bl-none px-5 py-3 text-sm">
                {tChat.rich("errorWithContact", {
                  contact: (chunks) => (
                    <a
                      href={localizeHref("/contact", language)}
                      className="underline font-medium"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {!isLoading && !isRegenerating && (
          <div className="flex gap-2 overflow-x-auto pb-2 noscrollbar mask-right-fade w-full min-w-0 -mx-1 px-1">
            {suggestionChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="flex-shrink-0 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs text-stone-600 hover:border-primary/50 hover:bg-orange-50 hover:text-primary transition-all whitespace-nowrap shadow-xs"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onFormSubmit} className="flex gap-2 items-center bg-white rounded-full border border-stone-200 px-2 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs w-full min-w-0">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={tChat("inputPlaceholder")}
            disabled={isRegenerating}
            className="flex-1 min-w-0 bg-transparent border-none px-3 sm:px-4 py-1 text-stone-800 text-sm focus:outline-hidden placeholder:text-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
