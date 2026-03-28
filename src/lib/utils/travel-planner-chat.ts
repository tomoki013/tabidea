export type PlannerChatHistoryMessage = {
  role: string;
  text: string;
};

export type ResolvedRegenerationState = {
  history: PlannerChatHistoryMessage[];
  latestUserMessage: string | null;
  latestAssistantMessage: string | null;
};

export function buildResolvedRegenerationState(
  history: PlannerChatHistoryMessage[]
): ResolvedRegenerationState {
  const latestUserMessage =
    [...history].reverse().find((message) => message.role === "user" && message.text.trim())?.text.trim() ?? null;
  const latestAssistantMessage =
    [...history].reverse().find((message) => message.role === "model" && message.text.trim())?.text.trim() ?? null;

  return {
    history,
    latestUserMessage,
    latestAssistantMessage,
  };
}
