"use client";

/**
 * usePlanGeneration — v4 パイプラインのクライアントフック
 *
 * セッションベースの pass 逐次実行 + narrative SSE ストリーミング。
 * UseComposeGenerationReturn と同一インターフェースを返すため、
 * 既存の ComposeLoadingAnimation / StreamingResultView がそのまま動作する。
 */

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserInput, Itinerary, PartialDayData } from "@/types";
import type { PipelineStepId } from "@/types/itinerary-pipeline";
import type {
  ComposeStep,
  ComposeLimitExceeded,
  UseComposeGenerationReturn,
} from "./useComposeGeneration";
import { savePlanViaApi } from "@/lib/plans/save-plan-client";
import { saveLocalPlan, notifyPlanChange } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useUserPlans } from "@/context/UserPlansContext";
import { readSSEStream } from "@/lib/utils/sse-reader";
import type { UserType } from "@/lib/limits/config";

// ============================================
// v4 Pass → v3 PipelineStepId mapping
// ============================================

/**
 * v4 のパス実行を v3 の UI ステップにマッピングする。
 * ComposeLoadingAnimation の STAGE_GROUPS と互換。
 */
const SESSION_STATE_TO_STEP: Record<string, PipelineStepId> = {
  created:                "usage_check",
  normalized:             "semantic_plan",
  draft_generated:        "feasibility_score",
  draft_scored:           "route_optimize",
  draft_repaired_partial: "route_optimize",
  verification_partial:   "place_resolve",
  timeline_ready:         "timeline_build",
  narrative_partial:      "narrative_render",
  completed:              "narrative_render",
};

const V4_STEP_IDS: PipelineStepId[] = [
  "usage_check",
  "normalize",
  "semantic_plan",
  "feasibility_score",
  "route_optimize",
  "place_resolve",
  "timeline_build",
  "narrative_render",
];

// ============================================
// SSE Event types
// ============================================

interface V4StreamEvent {
  type: "progress" | "day_complete" | "complete" | "error" | "done";
  step?: string;
  message?: string;
  totalDays?: number;
  destination?: string;
  description?: string;
  day?: number;
  dayData?: PartialDayData;
  isComplete?: boolean;
  session?: { id: string; state: string };
}

interface RunResponse {
  passId: string;
  outcome: string;
  newState: string;
  warnings: string[];
  durationMs: number;
  session: { id: string; state: string; updatedAt: string };
}

interface PreflightResponse {
  ok: boolean;
  allowed?: boolean;
  userType?: string;
  remaining?: number;
  resetAt?: string | null;
  metadata?: {
    modelName: string;
    narrativeModelName: string;
    modelTier: "flash" | "pro";
    provider: string;
  };
  error?: string;
  limitExceeded?: boolean;
}

// ============================================
// Hook
// ============================================

export function usePlanGeneration(): UseComposeGenerationReturn {
  const t = useTranslations("lib.planGeneration.compose");
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { refreshPlans } = useUserPlans();

  const [steps, setSteps] = useState<ComposeStep[]>([]);
  const [currentStep, setCurrentStep] = useState<PipelineStepId | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [limitExceeded, setLimitExceeded] = useState<ComposeLimitExceeded | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [partialDays, setPartialDays] = useState<Map<number, PartialDayData>>(new Map());
  const [totalDays, setTotalDays] = useState(0);
  const [previewDestination, setPreviewDestination] = useState("");
  const [previewDescription, setPreviewDescription] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // ---- Helpers ----

  const persistGeneratedItinerary = useCallback(
    async (input: UserInput, itinerary: Itinerary) => {
      if (isAuthenticated) {
        const saveResult = await savePlanViaApi(input, itinerary, false);
        if (saveResult.success && saveResult.plan) {
          router.push(`/plan/id/${saveResult.plan.id}`);
          void refreshPlans();
          return;
        }
      }
      const localPlan = await saveLocalPlan(input, itinerary);
      router.push(`/plan/local/${localPlan.id}`);
      notifyPlanChange();
    },
    [isAuthenticated, refreshPlans, router],
  );

  const initSteps = useCallback((): ComposeStep[] => {
    return V4_STEP_IDS.map((id) => ({
      id,
      message: t(`steps.${id}`),
      status: "pending" as const,
    }));
  }, [t]);

  const advanceStep = useCallback(
    (stepId: PipelineStepId, message?: string) => {
      setCurrentStep(stepId);
      setSteps((prev) =>
        prev.map((s) => {
          if (s.id === stepId) {
            return { ...s, status: "active", message: message || s.message };
          }
          const currentIdx = V4_STEP_IDS.indexOf(stepId);
          const thisIdx = V4_STEP_IDS.indexOf(s.id);
          if (thisIdx < currentIdx && s.status !== "completed") {
            return { ...s, status: "completed" };
          }
          return s;
        }),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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
  }, []);

  const clearLimitExceeded = useCallback(() => {
    setLimitExceeded(null);
  }, []);

  // ---- Main Generate ----

  const generate = useCallback(
    async (input: UserInput, options?: { isRetry?: boolean }) => {
      // Reset
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      setSteps(initSteps());
      setIsGenerating(true);
      setIsCompleted(false);
      setErrorMessage("");
      setLimitExceeded(null);
      setWarnings([]);
      setPartialDays(new Map());
      setTotalDays(0);
      setPreviewDestination("");
      setPreviewDescription("");

      try {
        // ---- 1. Preflight (usage check) ----
        advanceStep("usage_check");

        const preflightRes = await fetch("/api/itinerary/plan/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
          signal,
        });

        if (!preflightRes.ok) {
          const payload = await preflightRes.json().catch(() => null) as PreflightResponse | null;
          if (payload?.limitExceeded) {
            setLimitExceeded({
              userType: (payload.userType ?? "free") as UserType,
              resetAt: payload.resetAt ? new Date(payload.resetAt) : null,
              remaining: payload.remaining,
            });
            setIsGenerating(false);
            return;
          }
          throw new Error(payload?.error ?? `Preflight failed: ${preflightRes.status}`);
        }

        const preflight = await preflightRes.json() as PreflightResponse;
        if (!preflight.allowed) {
          if (preflight.limitExceeded) {
            setLimitExceeded({
              userType: (preflight.userType ?? "free") as UserType,
              resetAt: preflight.resetAt ? new Date(preflight.resetAt) : null,
              remaining: preflight.remaining,
            });
            setIsGenerating(false);
            return;
          }
          throw new Error("Generation not allowed");
        }

        // ---- 2. Create session ----
        advanceStep("normalize");

        const sessionRes = await fetch("/api/plan-generation/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
          signal,
        });

        if (!sessionRes.ok) {
          const payload = await sessionRes.json().catch(() => null);
          throw new Error(payload?.error ?? `Session creation failed: ${sessionRes.status}`);
        }

        const { sessionId } = await sessionRes.json() as { sessionId: string };

        // ---- 3. Pass loop (normalize → timeline_construct) ----
        let sessionState = "created";
        const maxIterations = 20; // safety cap (repair loop can iterate)

        for (let i = 0; i < maxIterations; i++) {
          if (signal.aborted) break;
          if (sessionState === "timeline_ready" || sessionState === "completed" || sessionState === "failed") {
            break;
          }

          const runRes = await fetch(`/api/plan-generation/session/${sessionId}/run`, {
            method: "POST",
            signal,
          });

          if (!runRes.ok) {
            // Budget exceeded — try to resume from last checkpoint
            if (runRes.status === 408) {
              const resumeRes = await fetch(
                `/api/plan-generation/session/${sessionId}/resume`,
                { method: "POST", signal },
              );
              if (resumeRes.ok) {
                const resumeData = await resumeRes.json() as { resumedState: string };
                sessionState = resumeData.resumedState;
                continue;
              }
            }
            const payload = await runRes.json().catch(() => null);
            throw new Error(payload?.error ?? `Pass execution failed: ${runRes.status}`);
          }

          const runData = await runRes.json() as RunResponse;
          sessionState = runData.newState;

          // Update UI step based on new session state
          const stepId = SESSION_STATE_TO_STEP[sessionState];
          if (stepId) {
            advanceStep(stepId);
          }

          // Update preview data when draft is generated
          if (runData.passId === "draft_generate" && runData.outcome === "completed") {
            // Fetch session to get destination info
            const sessionInfoRes = await fetch(`/api/plan-generation/session/${sessionId}`, { signal });
            if (sessionInfoRes.ok) {
              const sessionInfo = await sessionInfoRes.json();
              if (sessionInfo.draftPlan) {
                setPreviewDestination(sessionInfo.draftPlan.destination ?? "");
                setPreviewDescription(sessionInfo.draftPlan.description ?? "");
                setTotalDays(sessionInfo.draftPlan.days?.length ?? 0);
              }
            }
          }

          // Collect warnings
          if (runData.warnings.length > 0) {
            setWarnings((prev) => [...prev, ...runData.warnings]);
          }

          // Handle failures
          if (runData.outcome === "failed_terminal") {
            throw new Error(runData.warnings[0] ?? "Pipeline failed");
          }
        }

        if (sessionState === "failed") {
          throw new Error("Pipeline failed during pass execution");
        }

        // ---- 4. Stream narrative polish (SSE) ----
        if (sessionState === "timeline_ready") {
          advanceStep("narrative_render");

          const streamRes = await fetch(`/api/plan-generation/session/${sessionId}/stream`, {
            method: "POST",
            signal,
          });

          if (!streamRes.ok) {
            const payload = await streamRes.json().catch(() => null);
            throw new Error(payload?.error ?? `Stream failed: ${streamRes.status}`);
          }

          let streamError: string | null = null;

          await readSSEStream<V4StreamEvent>(streamRes, (event) => {
            switch (event.type) {
              case "progress":
                if (event.totalDays) setTotalDays(event.totalDays);
                if (event.destination) setPreviewDestination(event.destination);
                if (event.description) setPreviewDescription(event.description);
                break;

              case "day_complete":
                if (event.day != null && event.dayData) {
                  setPartialDays((prev) => {
                    const next = new Map(prev);
                    next.set(event.day!, event.dayData!);
                    return next;
                  });
                }
                break;

              case "complete":
                // Session is now completed
                break;

              case "error":
                streamError = event.message ?? "Narrative streaming failed";
                break;

              case "done":
                return "stop";
            }
          }, { signal });

          if (streamError) {
            throw new Error(streamError);
          }
        }

        // ---- 5. Finalize (get Itinerary) ----
        const finalizeRes = await fetch(`/api/plan-generation/session/${sessionId}/finalize`, {
          method: "POST",
          signal,
        });

        if (!finalizeRes.ok) {
          const payload = await finalizeRes.json().catch(() => null);
          throw new Error(payload?.error ?? `Finalize failed: ${finalizeRes.status}`);
        }

        const { itinerary } = await finalizeRes.json() as { itinerary: Itinerary };

        // Mark all steps complete
        setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" as const })));
        setIsCompleted(true);
        setIsGenerating(false);

        // Persist and navigate
        await persistGeneratedItinerary(input, itinerary);
      } catch (err) {
        if (signal.aborted) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        setErrorMessage(message);
        setIsGenerating(false);
      }
    },
    [advanceStep, initSteps, persistGeneratedItinerary],
  );

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
