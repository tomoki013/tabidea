"use client";

import { useCallback, useRef, useState } from "react";

import { regeneratePlan } from "@/app/actions/travel-planner";
import type { Itinerary, PlanMutationErrorCode } from "@/types";
import {
  buildResolvedRegenerationState,
  type PlannerChatHistoryMessage,
  type ResolvedRegenerationState,
} from "@/lib/utils/travel-planner-chat";

type RegenerationMode = "immediate" | "deferred";
type RegenerationStatus = "idle" | "regenerating" | "success" | "updating";

interface PendingRegeneration {
  itinerary: Itinerary;
  history: PlannerChatHistoryMessage[];
}

export interface UsePlanRegenerationOptions {
  getCurrentPlan: () => Itinerary | null;
  regenerateInstruction: string;
  initialHistory?: PlannerChatHistoryMessage[];
  mode?: RegenerationMode;
  mapError?: (code?: PlanMutationErrorCode | null) => string;
  onApply: (payload: PendingRegeneration) => Promise<void> | void;
}

export interface UsePlanRegenerationReturn {
  status: RegenerationStatus;
  error: string | null;
  chatHistoryToKeep: PlannerChatHistoryMessage[];
  resolvedRegeneration: ResolvedRegenerationState | null;
  chatSessionKey: number;
  setChatHistoryToKeep: (history: PlannerChatHistoryMessage[]) => void;
  clearError: () => void;
  clearResolvedRegeneration: () => void;
  handleRegenerate: (
    chatHistory: PlannerChatHistoryMessage[],
    overridePlan?: Itinerary,
  ) => Promise<void>;
  completeSuccess: () => Promise<void>;
}

function stripRegenerateInstruction(
  chatHistory: PlannerChatHistoryMessage[],
  regenerateInstruction: string,
): PlannerChatHistoryMessage[] {
  if (
    chatHistory.length > 0 &&
    chatHistory[chatHistory.length - 1]?.role === "user" &&
    chatHistory[chatHistory.length - 1]?.text === regenerateInstruction
  ) {
    return chatHistory.slice(0, -1);
  }

  return chatHistory;
}

export function usePlanRegeneration({
  getCurrentPlan,
  regenerateInstruction,
  initialHistory = [],
  mode = "immediate",
  mapError,
  onApply,
}: UsePlanRegenerationOptions): UsePlanRegenerationReturn {
  const [status, setStatus] = useState<RegenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [chatHistoryToKeep, setChatHistoryToKeepState] = useState<PlannerChatHistoryMessage[]>(initialHistory);
  const [resolvedRegeneration, setResolvedRegeneration] = useState<ResolvedRegenerationState | null>(null);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const pendingRef = useRef<PendingRegeneration | null>(null);

  const setChatHistoryToKeep = useCallback((history: PlannerChatHistoryMessage[]) => {
    setChatHistoryToKeepState(history);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResolvedRegeneration = useCallback(() => {
    setResolvedRegeneration(null);
  }, []);

  const applyResolvedRegeneration = useCallback(async (payload: PendingRegeneration) => {
    await onApply(payload);
    setChatHistoryToKeepState(payload.history);
    setResolvedRegeneration(buildResolvedRegenerationState(payload.history));
    setChatSessionKey((prev) => prev + 1);
  }, [onApply]);

  const completeSuccess = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) {
      setStatus("idle");
      return;
    }

    setStatus("updating");
    await applyResolvedRegeneration(pending);
    pendingRef.current = null;
    setStatus("idle");
  }, [applyResolvedRegeneration]);

  const handleRegenerate = useCallback(async (
    chatHistory: PlannerChatHistoryMessage[],
    overridePlan?: Itinerary,
  ) => {
    const planToUse = overridePlan || getCurrentPlan();
    if (!planToUse) return;

    const persistedHistory = stripRegenerateInstruction(chatHistory, regenerateInstruction);

    setError(null);
    setResolvedRegeneration(null);
    setChatHistoryToKeepState(persistedHistory);
    setStatus("regenerating");

    try {
      const response = await regeneratePlan(planToUse, chatHistory);
      if (!response.ok) {
        setError(mapError ? mapError(response.error) : response.error);
        setStatus("idle");
        return;
      }

      const payload: PendingRegeneration = {
        itinerary: response.data.itinerary,
        history: persistedHistory,
      };

      if (mode === "deferred") {
        pendingRef.current = payload;
        setStatus("success");
        return;
      }

      await applyResolvedRegeneration(payload);
      setStatus("idle");
    } catch (mutationError) {
      const fallbackCode = "regenerate_failed" as const;
      const nextError =
        mutationError instanceof Error
          ? mutationError.message
          : fallbackCode;
      setError(mapError ? mapError(nextError as PlanMutationErrorCode) : nextError);
      setStatus("idle");
    }
  }, [
    applyResolvedRegeneration,
    getCurrentPlan,
    mapError,
    mode,
    regenerateInstruction,
  ]);

  return {
    status,
    error,
    chatHistoryToKeep,
    resolvedRegeneration,
    chatSessionKey,
    setChatHistoryToKeep,
    clearError,
    clearResolvedRegeneration,
    handleRegenerate,
    completeSuccess,
  };
}
