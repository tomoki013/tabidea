"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserInput, Itinerary } from "@/types";
import type { PipelineStepId, ComposePipelineMetadata } from "@/types/compose-pipeline";
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
): { type: string; [key: string]: unknown } | null {
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const event = parseSSELine(trimmed);
            if (!event) continue;

            if (event.type === "progress") {
              const stepId = event.step as PipelineStepId;
              const message = event.message as string;
              setCurrentStep(stepId);
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
            } else if (event.type === "complete") {
              // Mark all steps completed
              setSteps((prev) =>
                prev.map((s) => ({ ...s, status: "completed" }))
              );
              setCurrentStep(null);
              setIsGenerating(false);
              setIsCompleted(true);

              const result = event.result as {
                itinerary: Itinerary;
                warnings: string[];
                metadata: ComposePipelineMetadata;
              };

              setWarnings(result.warnings || []);

              // Save the plan
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
              return;
            } else if (event.type === "error") {
              setCurrentStep(null);
              setIsGenerating(false);

              if (event.limitExceeded) {
                setLimitExceeded({
                  userType: (event.userType as UserType) || "anonymous",
                  resetAt: event.resetAt
                    ? new Date(event.resetAt as string)
                    : null,
                  remaining: event.remaining as number | undefined,
                });
              } else {
                setErrorMessage(
                  (event.message as string) || t("errors.generic")
                );
              }
              return;
            }
          }
        }

        // Stream ended without complete/error
        if (!isCompleted) {
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
    [initSteps, isAuthenticated, refreshPlans, router, t, isCompleted]
  );

  const reset = useCallback(() => {
    setSteps([]);
    setCurrentStep(null);
    setIsGenerating(false);
    setIsCompleted(false);
    setErrorMessage("");
    setLimitExceeded(null);
    setWarnings([]);
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
    generate,
    reset,
    clearLimitExceeded,
  };
}
