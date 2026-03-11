"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserInput, Itinerary, PartialDayData } from "@/types";
import type { PipelineStepId, ComposePipelineMetadata } from "@/types/itinerary-pipeline";
import { savePlan } from "@/app/actions/travel-planner";
import { saveLocalPlan, notifyPlanChange } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useUserPlans } from "@/context/UserPlansContext";
import type { UserType } from "@/lib/limits/config";

// ============================================
// Types
// ============================================

export interface ComposeStep {
  id: PipelineStepId;
  message: string;
  status: "pending" | "active" | "completed";
}

export interface ComposeLimitExceeded {
  userType: UserType;
  resetAt: Date | null;
  remaining?: number;
}

export interface UseComposeGenerationReturn {
  /** Current steps with their statuses */
  steps: ComposeStep[];
  /** Currently active step ID */
  currentStep: PipelineStepId | null;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Whether generation completed */
  isCompleted: boolean;
  /** Error message if any */
  errorMessage: string;
  /** Limit exceeded info */
  limitExceeded: ComposeLimitExceeded | null;
  /** Pipeline warnings */
  warnings: string[];
  /** Partial day data from streaming narrative render */
  partialDays: Map<number, PartialDayData>;
  /** Total days expected */
  totalDays: number;
  /** Destination preview shown during streaming */
  previewDestination: string;
  /** Description preview shown during streaming */
  previewDescription: string;
  /** Start compose generation */
  generate: (input: UserInput, options?: { isRetry?: boolean }) => Promise<void>;
  /** Reset state */
  reset: () => void;
  /** Clear limit exceeded */
  clearLimitExceeded: () => void;
}

// ============================================
// Step definitions
// ============================================

const COMPOSE_STEP_IDS: PipelineStepId[] = [
  "usage_check",
  "normalize",
  "semantic_plan",
  "place_resolve",
  "feasibility_score",
  "route_optimize",
  "timeline_build",
  "narrative_render",
  "hero_image",
];

// ============================================
// SSE Parser
// ============================================

function parseSSELine(
  line: string
):
  | ({
      type: "progress";
      step: PipelineStepId;
      message: string;
      totalDays?: number;
      destination?: string;
      description?: string;
    } & Record<string, unknown>)
  | ({
      type: "day_complete";
      step?: PipelineStepId;
      day: number;
      dayData: PartialDayData;
      isComplete?: boolean;
      totalDays?: number;
      destination?: string;
      description?: string;
    } & Record<string, unknown>)
  | ({
      type: "complete";
      result: {
        itinerary: Itinerary;
        warnings: string[];
        metadata: ComposePipelineMetadata;
      };
    } & Record<string, unknown>)
  | ({ type: "done" } & Record<string, unknown>)
  | ({ type: "error" } & Record<string, unknown>)
  | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

// ============================================
// Hook
// ============================================

export function useComposeGeneration(): UseComposeGenerationReturn {
  const t = useTranslations("lib.planGeneration.compose");
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { refreshPlans } = useUserPlans();

  const [steps, setSteps] = useState<ComposeStep[]>([]);
  const [currentStep, setCurrentStep] = useState<PipelineStepId | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [limitExceeded, setLimitExceeded] =
    useState<ComposeLimitExceeded | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [partialDays, setPartialDays] = useState<Map<number, PartialDayData>>(new Map());
  const [totalDays, setTotalDays] = useState(0);
  const [previewDestination, setPreviewDestination] = useState("");
  const [previewDescription, setPreviewDescription] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const initSteps = useCallback((): ComposeStep[] => {
    return COMPOSE_STEP_IDS.map((id) => ({
      id,
      message: t(`steps.${id}`),
      status: "pending" as const,
    }));
  }, [t]);

  const generate = useCallback(
    async (input: UserInput, options?: { isRetry?: boolean }) => {
      // Reset state
      const initialSteps = initSteps();
      setSteps(initialSteps);
      setCurrentStep(null);
      setIsGenerating(true);
      setIsCompleted(false);
      setErrorMessage("");
      setLimitExceeded(null);
      setWarnings([]);
      setPartialDays(new Map());
      setTotalDays(0);
      setPreviewDestination("");
      setPreviewDescription("");

      // Abort any previous stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/itinerary/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ input, options }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setErrorMessage(t("errors.requestFailed", { status: response.status }));
          setIsGenerating(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedTerminalEvent = false;

        const processLine = async (line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return false;

          const event = parseSSELine(trimmed);
          if (!event) return false;

          if (event.type === "progress") {
            const stepId = event.step;
            const message = event.message;
            setCurrentStep(stepId);

            if (event.totalDays) {
              setTotalDays(event.totalDays);
            }
            if (event.destination) {
              setPreviewDestination(event.destination);
            }
            if (event.description) {
              setPreviewDescription(event.description);
            }

            setSteps((prev) =>
              prev.map((s) => {
                if (s.id === stepId) {
                  return { ...s, status: "active", message: message || s.message };
                }
                const currentIdx = COMPOSE_STEP_IDS.indexOf(stepId);
                const thisIdx = COMPOSE_STEP_IDS.indexOf(s.id);
                if (thisIdx < currentIdx && s.status !== "completed") {
                  return { ...s, status: "completed" };
                }
                return s;
              })
            );
            return false;
          }

          if (event.type === "day_complete") {
            const dayNum = event.day;
            const dayData = event.dayData;
            if (dayNum && dayData) {
              setPartialDays((prev) => {
                const next = new Map(prev);
                next.set(dayNum, dayData);
                return next;
              });
            }
            if (event.totalDays) {
              setTotalDays(event.totalDays);
            }
            if (event.destination) {
              setPreviewDestination(event.destination);
            }
            if (event.description) {
              setPreviewDescription(event.description);
            }
            return false;
          }

          if (event.type === "complete") {
            receivedTerminalEvent = true;

            // Mark all steps completed
            setSteps((prev) =>
              prev.map((s) => ({ ...s, status: "completed" }))
            );
            setCurrentStep(null);
            setIsGenerating(false);
            setIsCompleted(true);
            setPartialDays(new Map());

            const result = event.result as {
              itinerary: Itinerary;
              warnings: string[];
              metadata: ComposePipelineMetadata;
            };

            setWarnings(result.warnings || []);

            try {
              if (isAuthenticated) {
                const saveResult = await savePlan(input, result.itinerary, false);
                if (saveResult.success && saveResult.plan) {
                  await refreshPlans();
                  router.push(`/plan/id/${saveResult.plan.id}`);
                } else {
                  const localPlan = await saveLocalPlan(input, result.itinerary);
                  notifyPlanChange();
                  router.push(`/plan/local/${localPlan.id}`);
                }
              } else {
                const localPlan = await saveLocalPlan(input, result.itinerary);
                notifyPlanChange();
                router.push(`/plan/local/${localPlan.id}`);
              }
            } catch (saveErr) {
              console.error("[compose] Save failed:", saveErr);
              setErrorMessage(t("errors.saveFailed"));
            }
            return true;
          }

          if (event.type === "error") {
            receivedTerminalEvent = true;
            setCurrentStep(null);
            setIsGenerating(false);
            setPartialDays(new Map());

            if (event.limitExceeded) {
              setLimitExceeded({
                userType: (event.userType as UserType) || "anonymous",
                resetAt: event.resetAt
                  ? new Date(event.resetAt as string)
                  : null,
                remaining: event.remaining as number | undefined,
              });
            } else {
              const failedStep = event.failedStep as string | undefined;
              let msg: string;
              if (failedStep) {
                const stepKey = `errors.stepFailed.${failedStep}` as const;
                try {
                  msg = t(stepKey);
                } catch {
                  try {
                    msg = t("errors.stepFailed.unknown");
                  } catch {
                    msg = t("errors.generic");
                  }
                }
              } else if ((event.message as string)?.includes("timeout") || (event.message as string)?.includes("Timeout")) {
                try {
                  msg = t("errors.timeout");
                } catch {
                  msg = t("errors.generic");
                }
              } else {
                msg = (event.message as string) || t("errors.generic");
              }
              setErrorMessage(msg);
            }
            return true;
          }

          if (event.type === "done") {
            receivedTerminalEvent = true;
            return false;
          }

          return false;
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const shouldStop = await processLine(line);
            if (shouldStop) {
              return;
            }
          }
        }

        if (buffer.trim()) {
          const shouldStop = await processLine(buffer);
          if (shouldStop) {
            return;
          }
        }

        // Stream ended without complete/error
        if (!receivedTerminalEvent) {
          setErrorMessage(t("errors.streamUnexpectedEnd"));
          setIsGenerating(false);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setErrorMessage(t("errors.cancelled"));
        } else {
          setErrorMessage(
            err instanceof Error ? err.message : t("errors.generic")
          );
        }
        setIsGenerating(false);
      }
    },
    [initSteps, isAuthenticated, refreshPlans, router, t]
  );

  const reset = useCallback(() => {
    setSteps([]);
    setCurrentStep(null);
    setIsGenerating(false);
    setIsCompleted(false);
    setErrorMessage("");
    setLimitExceeded(null);
    setWarnings([]);
    setPartialDays(new Map());
    setTotalDays(0);
    setPreviewDestination("");
    setPreviewDescription("");
    abortRef.current?.abort();
  }, []);

  const clearLimitExceeded = useCallback(() => {
    setLimitExceeded(null);
  }, []);

  return {
    steps,
    currentStep,
    isGenerating,
    isCompleted,
    errorMessage,
    limitExceeded,
    warnings,
    partialDays,
    totalDays,
    previewDestination,
    previewDescription,
    generate,
    reset,
    clearLimitExceeded,
  };
}
