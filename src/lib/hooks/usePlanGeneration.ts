"use client";

/**
 * usePlanGeneration — run/event ベースの itinerary 生成クライアントフック
 *
 * 新しい `/api/agent/runs` + SSE stream + `/api/trips/:tripId` を使い、
 * 既存の ComposeLoadingAnimation / StreamingResultView 契約を維持する。
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
} from "@/lib/plan-generation/client-contract";
import { savePlanViaApi } from "@/lib/plans/save-plan-client";
import { saveLocalPlan, notifyPlanChange } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { usePlanGenerationOverlay } from "@/context/PlanGenerationOverlayContext";
import { useUserPlans } from "@/context/UserPlansContext";
import { readSSEStream } from "@/lib/utils/sse-reader";
import type { UserType } from "@/lib/limits/config";
import { fetchTripItinerary } from "@/lib/trips/client";
import {
  advanceComposeSteps,
  buildInitialComposeSteps,
  completeComposeSteps,
} from "@/lib/plan-generation/progress";

const SESSION_STATE_TO_STEP: Record<string, PipelineStepId> = {
  created: "normalize",
  normalized: "semantic_plan",
  draft_generated: "feasibility_score",
  draft_formatted: "feasibility_score",
  draft_scored: "route_optimize",
  draft_repaired_partial: "route_optimize",
  verification_partial: "place_resolve",
  timeline_ready: "timeline_build",
  narrative_partial: "narrative_render",
  completed: "narrative_render",
};

const PASS_TO_FAILED_STEP: Record<string, string> = {
  normalize: "unknown",
  draft_generate: "semantic_plan",
  draft_format: "feasibility_score",
  rule_score: "unknown",
  local_repair: "semantic_plan",
  selective_verify: "place_resolve",
  timeline_construct: "unknown",
  narrative_polish: "narrative_render",
};

const USER_FACING_WARNING_PASSES = new Set(["selective_verify", "narrative_polish", "timeline_construct"]);
const PASS_TO_ACTIVE_STEP: Partial<Record<string, PipelineStepId>> = {
  normalize: "normalize",
  draft_generate: "semantic_plan",
  draft_format: "feasibility_score",
  rule_score: "feasibility_score",
  local_repair: "route_optimize",
  selective_verify: "place_resolve",
  timeline_construct: "timeline_build",
  narrative_polish: "narrative_render",
};

const SUCCESS_DISPLAY_MS = 2000;
const STREAM_RESUME_BACKOFF_MS = 250;

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
  degraded?: boolean;
}

interface CreateRunResponse {
  runId: string;
  threadId?: string | null;
  tripId?: string | null;
  status: string;
  streamUrl: string;
}

interface CreateRunErrorResponse {
  error?: string;
  limitExceeded?: boolean;
  userType?: string;
  remaining?: number;
  resetAt?: string | null;
}

interface AgentRunEvent {
  event:
    | "run.started"
    | "run.progress"
    | "assistant.delta"
    | "tool.call.started"
    | "tool.call.finished"
    | "tool.call.failed"
    | "plan.draft.created"
    | "plan.block.verified"
    | "plan.block.flagged"
    | "itinerary.updated"
    | "run.paused"
    | "run.finished"
    | "run.failed";
  runId: string;
  seq: number;
  timestamp: string;
  phase?: string;
  state?: string;
  passId?: string;
  outcome?: string;
  warnings?: string[];
  destination?: string;
  description?: string;
  totalDays?: number;
  day?: number;
  dayData?: PartialDayData;
  isComplete?: boolean;
  tripId?: string;
  tripVersion?: number;
  completionLevel?: string;
  error?: string;
  errorCode?: string;
  rootCause?: string;
  invalidFieldPath?: string;
  retryable?: boolean;
  nextPassId?: string | null;
  nextSubstage?: string | null;
  pauseReason?: string | null;
}

export function usePlanGeneration(): UseComposeGenerationReturn {
  const t = useTranslations("lib.planGeneration.compose");
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { refreshPlans } = useUserPlans();
  const overlay = usePlanGenerationOverlay();

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
  const stepsRef = useRef<ComposeStep[]>([]);

  const waitForSuccessDisplay = useCallback(
    async (signal: AbortSignal) => {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(resolve, SUCCESS_DISPLAY_MS);

        const handleAbort = () => {
          window.clearTimeout(timeoutId);
          reject(new DOMException("Aborted", "AbortError"));
        };

        if (signal.aborted) {
          handleAbort();
          return;
        }

        signal.addEventListener("abort", handleAbort, { once: true });
      });
    },
    [],
  );

  const waitForResumeBackoff = useCallback(
    async (signal: AbortSignal) => {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(resolve, STREAM_RESUME_BACKOFF_MS);

        const handleAbort = () => {
          window.clearTimeout(timeoutId);
          reject(new DOMException("Aborted", "AbortError"));
        };

        if (signal.aborted) {
          handleAbort();
          return;
        }

        signal.addEventListener("abort", handleAbort, { once: true });
      });
    },
    [],
  );

  const resolveGeneratedItineraryTarget = useCallback(
    async (input: UserInput, itinerary: Itinerary) => {
      if (isAuthenticated) {
        const saveResult = await savePlanViaApi(input, itinerary, false);
        if (saveResult.success && saveResult.plan) {
          return {
            targetHref: `/plan/id/${saveResult.plan.id}`,
            onNavigated: () => {
              void refreshPlans();
            },
          };
        }
      }

      const localPlan = await saveLocalPlan(input, itinerary);
      return {
        targetHref: `/plan/local/${localPlan.id}`,
        onNavigated: () => {
          notifyPlanChange();
        },
      };
    },
    [isAuthenticated, refreshPlans],
  );

  const initSteps = useCallback((): ComposeStep[] => {
    return buildInitialComposeSteps((id) => t(`steps.${id}`));
  }, [t]);

  const advanceStep = useCallback(
    (stepId: PipelineStepId, message?: string) => {
      const nextSteps = advanceComposeSteps(stepsRef.current, stepId, message);
      stepsRef.current = nextSteps;
      setCurrentStep(stepId);
      setSteps(nextSteps);
      overlay.syncProgress({
        currentStep: stepId,
        steps: nextSteps,
      });
    },
    [overlay],
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
    stepsRef.current = [];
    setPartialDays(new Map());
    setTotalDays(0);
    setPreviewDestination("");
    setPreviewDescription("");
    overlay.hideOverlay();
  }, [overlay]);

  const clearLimitExceeded = useCallback(() => {
    setLimitExceeded(null);
  }, []);

  const resolveStepErrorMessage = useCallback(
    (failedPassId?: string, fallbackMessage?: string) => {
      const stepKey = failedPassId ? PASS_TO_FAILED_STEP[failedPassId] : undefined;
      if (stepKey) {
        try {
          return t(`errors.stepFailed.${stepKey}` as Parameters<typeof t>[0]);
        } catch {
          return t("errors.stepFailed.unknown");
        }
      }
      return fallbackMessage ?? t("errors.generic");
    },
    [t],
  );

  const mapUserFacingError = useCallback(
    ({
      rawMessage,
      errorCode,
      rootCause,
      failedPassId,
    }: {
      rawMessage?: string;
      errorCode?: string;
      rootCause?: string;
      failedPassId?: string;
    }) => {
      const message = rawMessage?.trim();
      const normalizedErrorCode = errorCode?.trim();

      if (normalizedErrorCode) {
        try {
          return t(`errors.generationCodes.${normalizedErrorCode}` as Parameters<typeof t>[0]);
        } catch {
          // Fall through to pass-based or raw message handling.
        }
      }

      if (rootCause === "invalid_structured_output" && failedPassId === "draft_generate") {
        return t("errors.generationCodes.draft_generation_invalid_output");
      }

      if (!message) {
        return resolveStepErrorMessage(failedPassId, t("errors.generic"));
      }

      if (/runtime_budget_exhausted|generation_timed_out/i.test(message)) {
        return resolveStepErrorMessage(failedPassId, t("errors.generic"));
      }

      if (/draft_generation_timeout/i.test(message)) {
        return t("errors.generationCodes.draft_generation_timeout");
      }

      if (/draft_generation_invalid_output/i.test(message)) {
        return t("errors.generationCodes.draft_generation_invalid_output");
      }

      if (/draft_generation_provider_error/i.test(message)) {
        return t("errors.generationCodes.draft_generation_provider_error");
      }

      if (/narrative_generation_timeout/i.test(message)) {
        return t("errors.generationCodes.narrative_generation_timeout");
      }

      return message;
    },
    [resolveStepErrorMessage, t],
  );

  const mapUserFacingWarnings = useCallback((passId: string, passWarnings: string[]) => {
    if (passId !== "selective_verify") {
      return passWarnings;
    }

    return passWarnings.flatMap((warning) => {
      if (warning === "warning_code:places_quota_exceeded") {
        return [t("warnings.placeVerificationLimited")];
      }
      return [];
    });
  }, [t]);

  const generate = useCallback(
    async (input: UserInput, options?: { isRetry?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      const initialSteps = initSteps();
      stepsRef.current = initialSteps;
      setSteps(initialSteps);
      setIsGenerating(true);
      setIsCompleted(false);
      setErrorMessage("");
      setLimitExceeded(null);
      setWarnings([]);
      setPartialDays(new Map());
      setTotalDays(0);
      setPreviewDestination("");
      setPreviewDescription("");
      overlay.showGenerating({
        steps: initialSteps,
        currentStep: null,
        totalDays: 0,
      });

      try {
        advanceStep("usage_check");

        const preflightRes = await fetch("/api/itinerary/plan/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, options }),
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
            overlay.hideOverlay();
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
            overlay.hideOverlay();
            return;
          }
          throw new Error("Generation not allowed");
        }

        advanceStep("normalize");

        const runRes = await fetch("/api/agent/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "create",
            executionMode: "draft_with_selective_verify",
            constraints: {
              runtimeProfile: "netlify_free_30s",
              costProfile: "safe",
            },
            input,
            idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
            options,
          }),
          signal,
        });

        if (!runRes.ok) {
          const payload = await runRes.json().catch(() => null) as CreateRunErrorResponse | null;
          if (payload?.limitExceeded) {
            setLimitExceeded({
              userType: (payload.userType ?? "free") as UserType,
              resetAt: payload.resetAt ? new Date(payload.resetAt) : null,
              remaining: payload.remaining,
            });
            setIsGenerating(false);
            overlay.hideOverlay();
            return;
          }
          throw new Error(payload?.error ?? `Run creation failed: ${runRes.status}`);
        }

        const run = await runRes.json() as CreateRunResponse;
        let streamError: string | null = null;
        let finishedTripId: string | null = run.tripId ?? null;
        let finishedTripVersion: number | null = null;
        let lastSeq: number | null = null;
        let finished = false;

        while (!signal.aborted && !finished) {
          const streamHeaders = new Headers();
          if (lastSeq !== null) {
            streamHeaders.set("last-event-id", String(lastSeq));
          }

          const streamRes = await fetch(run.streamUrl, {
            method: "GET",
            headers: streamHeaders,
            signal,
          });

          if (!streamRes.ok) {
            const payload = await streamRes.json().catch(() => null) as { error?: string } | null;
            throw new Error(payload?.error ?? `Stream failed: ${streamRes.status}`);
          }

          let paused = false;

          await readSSEStream<AgentRunEvent>(streamRes, (event) => {
            lastSeq = typeof event.seq === "number" ? event.seq : lastSeq;

            switch (event.event) {
              case "run.progress": {
                if (event.phase === "pass_started" && event.passId) {
                  const stepId = PASS_TO_ACTIVE_STEP[event.passId];
                  if (stepId) {
                    advanceStep(stepId);
                  }
                } else if (event.phase === "narrative_streaming" || event.phase === "narrative_completed") {
                  advanceStep("narrative_render");
                } else if (event.state) {
                  const mappedStep = SESSION_STATE_TO_STEP[event.state];
                  if (mappedStep) {
                    advanceStep(mappedStep);
                  }
                }

                if (
                  event.passId
                  && Array.isArray(event.warnings)
                  && USER_FACING_WARNING_PASSES.has(event.passId)
                ) {
                  const nextWarnings = mapUserFacingWarnings(event.passId, event.warnings);
                  if (nextWarnings.length > 0) {
                    setWarnings((prev) => [...prev, ...nextWarnings]);
                  }
                }
                break;
              }

              case "plan.draft.created":
                if (typeof event.totalDays === "number") {
                  setTotalDays(event.totalDays);
                }
                if (event.destination) {
                  setPreviewDestination(event.destination);
                }
                if (event.description) {
                  setPreviewDescription(event.description);
                }
                overlay.syncProgress({
                  totalDays: typeof event.totalDays === "number" ? event.totalDays : undefined,
                  previewDestination: event.destination,
                  previewDescription: event.description,
                });
                break;

              case "assistant.delta":
                advanceStep("narrative_render");
                if (typeof event.day === "number" && event.dayData) {
                  const day = event.day;
                  const dayData = event.dayData;
                  setPartialDays((prev) => {
                    const next = new Map(prev);
                    next.set(day, dayData);
                    return next;
                  });
                  setTotalDays((prev) => Math.max(prev, day));
                }
                break;

              case "tool.call.failed":
                if (Array.isArray(event.warnings) && event.warnings.length > 0) {
                  const nextWarnings = mapUserFacingWarnings("selective_verify", event.warnings);
                  if (nextWarnings.length > 0) {
                    setWarnings((prev) => [...prev, ...nextWarnings]);
                  }
                }
                break;

              case "itinerary.updated":
                finishedTripId = event.tripId ?? finishedTripId;
                finishedTripVersion = typeof event.tripVersion === "number" ? event.tripVersion : finishedTripVersion;
                break;

              case "run.paused":
                paused = true;
                return "stop";

              case "run.finished":
                finishedTripId = event.tripId ?? finishedTripId;
                finishedTripVersion = typeof event.tripVersion === "number" ? event.tripVersion : finishedTripVersion;
                finished = true;
                return "stop";

              case "run.failed":
                streamError = mapUserFacingError({
                  rawMessage: event.error,
                  errorCode: event.errorCode,
                  rootCause: event.rootCause,
                  failedPassId: event.passId,
                });
                return "stop";

              default:
                break;
            }
          }, { signal });

          if (streamError) {
            throw new Error(streamError);
          }

          if (finished) {
            break;
          }

          if (paused) {
            await waitForResumeBackoff(signal);
            continue;
          }

          throw new Error(t("errors.generic"));
        }

        if (!finishedTripId) {
          throw new Error(t("errors.generic"));
        }

        const itinerary = await fetchTripItinerary(
          finishedTripId,
          finishedTripVersion ?? undefined,
        );

        const completedSteps = completeComposeSteps(stepsRef.current);
        stepsRef.current = completedSteps;
        setSteps(completedSteps);
        setIsCompleted(true);
        setIsGenerating(false);
        overlay.syncProgress({
          currentStep: null,
          steps: completedSteps,
        });

        const { targetHref, onNavigated } = await resolveGeneratedItineraryTarget(
          input,
          itinerary,
        );

        overlay.showSuccess();
        await waitForSuccessDisplay(signal);
        overlay.showUpdating(targetHref);
        router.push(targetHref);
        onNavigated();
      } catch (err) {
        if (signal.aborted) return;

        const rawMessage = err instanceof Error ? err.message : "";
        const message = mapUserFacingError({ rawMessage });
        setErrorMessage(message);
        setIsGenerating(false);
        overlay.hideOverlay();
      }
    },
    [
      advanceStep,
      initSteps,
      mapUserFacingWarnings,
      mapUserFacingError,
      overlay,
      resolveGeneratedItineraryTarget,
      router,
      t,
      waitForResumeBackoff,
      waitForSuccessDisplay,
    ],
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
