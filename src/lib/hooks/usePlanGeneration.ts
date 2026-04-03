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
  GenerationFailureUi,
  GenerationOriginSurface,
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
const STREAM_RESUME_BACKOFF_MS = 750;
const AUTO_RETRYABLE_RESUME_LIMIT = 3;
const DETAILED_ERROR_MAP: Record<string, string> = {
  'draft_generate:draft_generation_timeout': 'errors.generationCodes.draft_generate:draft_generation_timeout',
  'draft_generate:draft_generation_invalid_output': 'errors.generationCodes.draft_generate:draft_generation_invalid_output',
  'draft_generate:draft_generation_provider_error': 'errors.generationCodes.draft_generate:draft_generation_provider_error',
  'draft_generate:draft_generation_strategy_exhausted': 'errors.generationCodes.draft_generate:draft_generation_strategy_exhausted',
  'draft_generate:draft_generation_contract_mismatch': 'errors.generationCodes.draft_generate:draft_generation_contract_mismatch',
  'draft_generate:draft_generation_outline_contract_mismatch': 'errors.generationCodes.draft_generate:draft_generation_outline_contract_mismatch',
  'draft_generate:draft_generation_constrained_contract_mismatch': 'errors.generationCodes.draft_generate:draft_generation_constrained_contract_mismatch',
  'draft_generate:draft_generation_missing_meal': 'errors.generationCodes.draft_generate:draft_generation_missing_meal',
  'draft_generate:draft_generation_insufficient_stops': 'errors.generationCodes.draft_generate:draft_generation_insufficient_stops',
  'draft_generate:missing_afternoon_activity': 'errors.generationCodes.draft_generate:missing_afternoon_activity',
  'draft_generate:activity_only_until_midday': 'errors.generationCodes.draft_generate:activity_only_until_midday',
  'draft_generate:insufficient_day_coverage': 'errors.generationCodes.draft_generate:insufficient_day_coverage',
  'narrative_polish:narrative_generation_timeout': 'errors.generationCodes.narrative_polish:narrative_generation_timeout',
  'narrative_polish:narrative_generation_invalid_output': 'errors.generationCodes.narrative_polish:narrative_generation_invalid_output',
  'narrative_polish:narrative_generation_provider_error': 'errors.generationCodes.narrative_polish:narrative_generation_provider_error',
  'selective_verify:high_unverified_ratio': 'errors.generationCodes.selective_verify:high_unverified_ratio',
  'finalize:finalize_incomplete_session_contract': 'errors.generationCodes.finalize_incomplete_session_contract',
  'finalize:finalize_empty_itinerary': 'errors.generationCodes.finalize_empty_itinerary',
  'finalize:finalize_incomplete_itinerary_days': 'errors.generationCodes.finalize_incomplete_itinerary_days',
  'finalize:finalize_activity_only_until_midday': 'errors.generationCodes.finalize_activity_only_until_midday',
  'draft_generate:draft_generate_incomplete_day_set': 'errors.generationCodes.draft_generate_incomplete_day_set',
  'draft_format:draft_format_incomplete_day_set': 'errors.generationCodes.draft_format_incomplete_day_set',
  'timeline_construct:timeline_construct_incomplete_day_set': 'errors.generationCodes.timeline_construct_incomplete_day_set',
};

const KNOWN_GENERATION_ERROR_CODES = new Set([
  'draft_generation_timeout',
  'draft_generation_invalid_output',
  'draft_generation_missing_meal',
  'draft_generation_insufficient_stops',
  'draft_generation_provider_error',
  'draft_generation_strategy_exhausted',
  'draft_generation_contract_mismatch',
  'draft_generation_outline_contract_mismatch',
  'draft_generation_constrained_contract_mismatch',
  'missing_afternoon_activity',
  'activity_only_until_midday',
  'insufficient_day_coverage',
  'narrative_generation_timeout',
  'narrative_generation_invalid_output',
  'narrative_generation_provider_error',
  'finalize_incomplete_session_contract',
  'finalize_empty_itinerary',
  'finalize_incomplete_itinerary_days',
  'finalize_activity_only_until_midday',
  'draft_generate_incomplete_day_set',
  'draft_format_incomplete_day_set',
  'timeline_construct_incomplete_day_set',
  'high_unverified_ratio',
  'run_processor_unexpected_error',
]);

const NON_RETRYABLE_ERROR_CODES = new Set([
  'draft_generation_missing_meal',
  'draft_generation_insufficient_stops',
  'draft_generation_strategy_exhausted',
  'missing_afternoon_activity',
  'activity_only_until_midday',
  'insufficient_day_coverage',
  'finalize_incomplete_session_contract',
  'finalize_empty_itinerary',
  'finalize_incomplete_itinerary_days',
  'finalize_activity_only_until_midday',
  'run_processor_unexpected_error',
]);

const MODAL_BLOCKING_ERROR_CODES = new Set(NON_RETRYABLE_ERROR_CODES);

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
  processUrl?: string | null;
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
    | "run.day.started"
    | "run.day.completed"
    | "run.retryable_failed"
    | "run.core_ready"
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
  nextDayIndex?: number | null;
  dayIndex?: number | null;
  dayAttempt?: number | null;
  outlineAttempt?: number | null;
  chunkAttempt?: number | null;
  completedDayCount?: number | null;
  strategy?: string | null;
  substage?: string | null;
  attempt?: number | null;
  plannerStrategy?: string | null;
}

interface ResumeRunErrorResponse {
  error?: string;
}

interface PlanGenerationFailureState {
  message: string;
  ui: GenerationFailureUi;
  kind: string;
  canRetry: boolean;
  resumeRunId: string | null;
  originSurface: GenerationOriginSurface | null;
}

function resolvePauseAttempt(event: AgentRunEvent): number | null {
  if (typeof event.chunkAttempt === "number") return event.chunkAttempt;
  if (typeof event.outlineAttempt === "number") return event.outlineAttempt;
  if (typeof event.dayAttempt === "number") return event.dayAttempt;
  return null;
}

function buildPauseStatusMessage(
  t: ReturnType<typeof useTranslations>,
  event: AgentRunEvent,
): string {
  const attempt = resolvePauseAttempt(event);
  if (typeof event.nextDayIndex === "number" && typeof attempt === "number" && attempt >= 3) {
    return t("pause.dayRetrying", { day: event.nextDayIndex });
  }

  switch (event.pauseReason) {
    case "recovery_required":
      return t("pause.recovery_required");
    case "runtime_budget_exhausted":
      return t("pause.runtime_budget_exhausted");
    case "verify_budget_exhausted":
      return t("pause.verify_budget_exhausted");
    default:
      return t("pause.waiting");
  }
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
  const [failureUi, setFailureUi] = useState<GenerationFailureUi | null>(null);
  const [failureKind, setFailureKind] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [resumeRunId, setResumeRunId] = useState<string | null>(null);
  const [originSurface, setOriginSurface] = useState<GenerationOriginSurface | null>(null);
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
        pauseStatusText: "",
      });
    },
    [overlay],
  );

  const clearFailure = useCallback(() => {
    setErrorMessage("");
    setFailureUi(null);
    setFailureKind(null);
    setCanRetry(false);
    setResumeRunId(null);
    setOriginSurface(null);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSteps([]);
    setCurrentStep(null);
    setIsGenerating(false);
    setIsCompleted(false);
    clearFailure();
    setLimitExceeded(null);
    setWarnings([]);
    stepsRef.current = [];
    setPartialDays(new Map());
    setTotalDays(0);
    setPreviewDestination("");
    setPreviewDescription("");
    overlay.hideOverlay();
  }, [clearFailure, overlay]);

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

      if (message?.startsWith("errors.")) {
        return message;
      }

      const detailedErrorKey = normalizedErrorCode && failedPassId
        ? DETAILED_ERROR_MAP[`${failedPassId}:${normalizedErrorCode}`]
        : undefined;

      if (detailedErrorKey) {
        try {
          return t(detailedErrorKey as Parameters<typeof t>[0]);
        } catch {
          // Fall through to generic code-based lookup.
        }
      }

      if (normalizedErrorCode && KNOWN_GENERATION_ERROR_CODES.has(normalizedErrorCode)) {
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

      if (/draft_generation_missing_meal/i.test(message)) {
        return t("errors.generationCodes.draft_generate:draft_generation_missing_meal");
      }

      if (/draft_generation_insufficient_stops/i.test(message)) {
        return t("errors.generationCodes.draft_generate:draft_generation_insufficient_stops");
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

      if (/Cannot build itinerary from incomplete run state/i.test(message)) {
        return t("errors.generationCodes.finalize_incomplete_session_contract");
      }

      if (normalizedErrorCode) {
        return message && message !== normalizedErrorCode
          ? message
          : resolveStepErrorMessage(failedPassId, t("errors.generic"));
      }

      return message;
    },
    [resolveStepErrorMessage, t],
  );

  const classifyFailurePresentation = useCallback(
    ({
      errorCode,
      retryable,
      rawMessage,
      rootCause,
      failedPassId,
      runId,
      fallbackOriginSurface,
    }: {
      errorCode?: string;
      retryable?: boolean;
      rawMessage?: string;
      rootCause?: string;
      failedPassId?: string;
      runId?: string;
      fallbackOriginSurface?: GenerationOriginSurface;
    }): PlanGenerationFailureState => {
      const message = mapUserFacingError({
        rawMessage,
        errorCode,
        rootCause,
        failedPassId,
      });
      const normalizedErrorCode = errorCode?.trim() ?? "";
      const normalizedMessage = rawMessage?.trim() ?? "";
      const explicitRetryable = typeof retryable === "boolean" ? retryable : undefined;
      const retryableByCode = !NON_RETRYABLE_ERROR_CODES.has(normalizedErrorCode);
      const canResume = explicitRetryable ?? retryableByCode;
      const shouldUseModal = !canResume
        || MODAL_BLOCKING_ERROR_CODES.has(normalizedErrorCode)
        || /strategy_exhausted|finalize_/i.test(normalizedMessage);

      return {
        message,
        ui: shouldUseModal ? "modal" : "banner",
        kind: normalizedErrorCode || failedPassId || "unknown_failure",
        canRetry: canResume,
        resumeRunId: canResume ? (runId ?? null) : null,
        originSurface: fallbackOriginSurface ?? null,
      };
    },
    [mapUserFacingError],
  );

  const applyFailureState = useCallback((failure: PlanGenerationFailureState) => {
    setErrorMessage(failure.message);
    setFailureUi(failure.ui);
    setFailureKind(failure.kind);
    setCanRetry(failure.canRetry);
    setResumeRunId(failure.resumeRunId);
    setOriginSurface(failure.originSurface);
    setIsGenerating(false);
    overlay.hideOverlay();
  }, [overlay]);

  const mapUserFacingWarnings = useCallback((passId: string, passWarnings: string[]) => {
    if (passId !== "selective_verify") {
      return passWarnings;
    }

    return passWarnings.flatMap((warning) => {
      if (warning === "warning_code:places_quota_exceeded") {
        return [t("warnings.placeVerificationLimited")];
      }
      if (warning === "high_unverified_ratio") {
        return [t("errors.generationCodes.high_unverified_ratio")];
      }
      return [];
    });
  }, [t]);

  const appendWarnings = useCallback((nextWarnings: string[]) => {
    if (nextWarnings.length === 0) {
      return;
    }

    setWarnings((prev) => {
      const merged = new Set(prev);
      for (const warning of nextWarnings) {
        merged.add(warning);
      }
      return [...merged];
    });
  }, []);

  const generate = useCallback(
    async (
      input: UserInput,
      options?: { isRetry?: boolean; originSurface?: GenerationOriginSurface },
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      const initialSteps = initSteps();
      stepsRef.current = initialSteps;
      setSteps(initialSteps);
      setIsGenerating(true);
      setIsCompleted(false);
      clearFailure();
      setOriginSurface(options?.originSurface ?? null);
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
        const createOrResumeRun = async (retry = false): Promise<CreateRunResponse> => {
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
              options: {
                ...options,
                isRetry: retry || options?.isRetry,
              },
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
              throw new Error(payload?.error ?? "limit_exceeded");
            }
            throw new Error(payload?.error ?? `Run creation failed: ${runRes.status}`);
          }

          return runRes.json() as Promise<CreateRunResponse>;
        };

        const resumeSameRun = async (runId: string): Promise<CreateRunResponse> => {
          const resumeRes = await fetch(`/api/agent/runs/${runId}/resume`, {
            method: "POST",
            signal,
          });

          if (!resumeRes.ok) {
            const payload = await resumeRes.json().catch(() => null) as ResumeRunErrorResponse | null;
            throw new Error(payload?.error ?? `Run resume failed: ${resumeRes.status}`);
          }

          return resumeRes.json() as Promise<CreateRunResponse>;
        };

        const processRun = async (run: CreateRunResponse): Promise<void> => {
          if (!run.processUrl) {
            return;
          }

          const processRes = await fetch(run.processUrl, {
            method: "POST",
            signal,
          });

          if (!processRes.ok) {
            const payload = await processRes.json().catch(() => null) as { error?: string } | null;
            throw new Error(payload?.error ?? `Process failed: ${processRes.status}`);
          }
        };

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

        let run = await createOrResumeRun(Boolean(options?.isRetry));
        let streamFailure: {
          rawMessage?: string;
          errorCode?: string;
          rootCause?: string;
          failedPassId?: string;
          retryable?: boolean;
          runId: string;
        } | null = null;
        let finishedTripId: string | null = run.tripId ?? null;
        let finishedTripVersion: number | null = null;
        let lastSeq: number | null = null;
        let finished = false;
        let autoResumeAttempts = 0;

        while (!signal.aborted && !finished) {
          await processRun(run);

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
          let resumeRequiresRunCreate = false;

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
                  appendWarnings(nextWarnings);
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
                  pauseStatusText: "",
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
                  appendWarnings(nextWarnings);
                }
                break;

              case "itinerary.updated":
                finishedTripId = event.tripId ?? finishedTripId;
                finishedTripVersion = typeof event.tripVersion === "number" ? event.tripVersion : finishedTripVersion;
                break;

              case "run.core_ready":
                finishedTripId = event.tripId ?? finishedTripId;
                finishedTripVersion = typeof event.tripVersion === "number" ? event.tripVersion : finishedTripVersion;
                break;

              case "run.retryable_failed":
                overlay.syncProgress({
                  pauseStatusText: buildPauseStatusMessage(t, {
                    event: "run.paused",
                    runId: event.runId,
                    seq: event.seq,
                    timestamp: event.timestamp,
                    pauseReason: "recovery_required",
                    nextDayIndex: event.nextDayIndex,
                    dayAttempt: event.dayAttempt,
                  }),
                });
                break;

              case "run.day.started":
                if (typeof event.dayIndex === "number") {
                  setTotalDays((prev) => Math.max(prev, event.dayIndex));
                }
                break;

              case "run.day.completed":
                if (typeof event.completedDayCount === "number") {
                  setTotalDays((prev) => Math.max(prev, event.completedDayCount));
                }
                break;

              case "run.paused":
                overlay.syncProgress({
                  pauseStatusText: buildPauseStatusMessage(t, event),
                });
                resumeRequiresRunCreate = event.state === "failed_retryable" || event.retryable === true;
                paused = true;
                return "stop";

              case "run.finished":
                finishedTripId = event.tripId ?? finishedTripId;
                finishedTripVersion = typeof event.tripVersion === "number" ? event.tripVersion : finishedTripVersion;
                finished = true;
                return "stop";

              case "run.failed":
                streamFailure = {
                  rawMessage: event.error,
                  errorCode: event.errorCode,
                  rootCause: event.rootCause,
                  failedPassId: event.passId,
                  retryable: event.retryable,
                  runId: event.runId,
                };
                return "stop";

              default:
                break;
            }
          }, { signal });

          if (streamFailure) {
            if (streamFailure.retryable && autoResumeAttempts < AUTO_RETRYABLE_RESUME_LIMIT) {
              autoResumeAttempts += 1;
              overlay.syncProgress({
                pauseStatusText: buildPauseStatusMessage(t, {
                  event: "run.paused",
                  runId: streamFailure.runId,
                  seq: lastSeq ?? 0,
                  timestamp: new Date().toISOString(),
                  pauseReason: "recovery_required",
                }),
              });
              await waitForResumeBackoff(signal);
              const previousRunId = run.runId;
              try {
                run = await resumeSameRun(run.runId);
              } catch {
                run = await createOrResumeRun(true);
              }
              if (run.runId !== previousRunId) {
                lastSeq = null;
                finishedTripId = run.tripId ?? null;
                finishedTripVersion = null;
              }
              streamFailure = null;
              continue;
            }

            applyFailureState(classifyFailurePresentation({
              ...streamFailure,
              fallbackOriginSurface: options?.originSurface ?? null,
            }));
            return;
          }

          if (finished) {
            break;
          }

          if (paused) {
            await waitForResumeBackoff(signal);
            if (resumeRequiresRunCreate) {
              const previousRunId = run.runId;
              try {
                run = await resumeSameRun(run.runId);
              } catch {
                run = await createOrResumeRun(true);
              }
              if (run.runId !== previousRunId) {
                lastSeq = null;
                finishedTripId = run.tripId ?? null;
                finishedTripVersion = null;
              }
            }
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
          pauseStatusText: "",
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
        if (rawMessage === "limit_exceeded") {
          return;
        }
        applyFailureState(classifyFailurePresentation({
          rawMessage,
          fallbackOriginSurface: options?.originSurface ?? null,
        }));
      }
    },
    [
      advanceStep,
      initSteps,
      mapUserFacingWarnings,
      clearFailure,
      classifyFailurePresentation,
      applyFailureState,
      appendWarnings,
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
    failureUi,
    failureKind,
    canRetry,
    resumeRunId,
    originSurface,
    limitExceeded,
    warnings,
    partialDays,
    totalDays,
    previewDestination,
    previewDescription,
    generate,
    reset,
    clearFailure,
    clearLimitExceeded,
  };
}
