"use client";

import { useCallback, useRef, useState } from "react";

import { regeneratePlan } from "@/app/actions/travel-planner";
import type { Itinerary, PlanMutationErrorCode } from "@/types";
import { replanTripItinerary } from "@/lib/trips/client";
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

function buildTripStyleInstruction(chatHistory: PlannerChatHistoryMessage[]): string {
  const relevantHistory = chatHistory.slice(-8);
  const instruction = relevantHistory
    .map((message) => `${message.role}: ${message.text}`)
    .join("\n")
    .trim();

  return instruction || "旅行プラン全体のスタイルを反映して再構成してください。";
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
      const tripId = planToUse.tripId;
      const tripVersion = planToUse.version;
      const response =
        tripId && typeof tripVersion === "number"
          ? await (async () => {
            const replanned = await replanTripItinerary({
              tripId,
              baseVersion: tripVersion,
              scope: { type: "style" },
              instruction: buildTripStyleInstruction(persistedHistory),
              reason: "user_edit",
              idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
            });

            return {
              ok: true as const,
              data: {
                itinerary: replanned.itinerary,
              },
            };
          })()
          : await regeneratePlan(planToUse, chatHistory);

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
