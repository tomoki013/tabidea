"use client";

/**
 * usePlanGeneration — run/event ベースの itinerary 生成クライアントフック
 *
 * 新パイプライン `/api/v1/plan-runs` + SSE events + `/api/v1/trips/:tripId` を使い、
 * 既存の ComposeLoadingAnimation / StreamingResultView 契約を維持する。
 * 設計書: design/tabidea_plan_generation_redesign_20260404.md
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
import type { UserType } from "@/lib/limits/config";
import { fetchTripItinerary } from "@/lib/trips/client";
import {
  advanceComposeSteps,
  buildInitialComposeSteps,
  completeComposeSteps,
} from "@/lib/plan-generation/progress";

// 新パイプライン: coarse PlanRunState → PipelineStepId マッピング
const SESSION_STATE_TO_STEP: Record<string, PipelineStepId> = {
  created: "normalize",
  running: "normalize",
  paused: "timeline_build",
  completed: "narrative_render",
  failed: "narrative_render",
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
  // 新パイプライン
  normalize_request: "normalize",
  plan_frame_build: "semantic_plan",
  draft_validate: "route_optimize",
  draft_repair_local: "route_optimize",
  timeline_finalize: "timeline_build",
  completion_gate: "timeline_build",
  persist_completed_trip: "narrative_render",
};

const PASS_TO_ACTIVE_STEP: Partial<Record<string, PipelineStepId>> = {
  // 旧パイプライン
  normalize: "normalize",
  draft_generate: "semantic_plan",
  draft_format: "feasibility_score",
  rule_score: "feasibility_score",
  local_repair: "route_optimize",
  selective_verify: "place_resolve",
  timeline_construct: "timeline_build",
  narrative_polish: "narrative_render",
  // 新パイプライン
  normalize_request: "normalize",
  plan_frame_build: "semantic_plan",
  draft_generate_v2: "semantic_plan",
  draft_validate: "route_optimize",
  draft_repair_local: "route_optimize",
  timeline_finalize: "timeline_build",
  completion_gate: "timeline_build",
  persist_completed_trip: "narrative_render",
};

const SUCCESS_DISPLAY_MS = 2000;
const STREAM_RESUME_BACKOFF_MS = 750;
const AUTO_RESUME_SLICE_LIMIT = 6;
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
  'plan_run_resume_internal_error',
  'internal_error',
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
  'plan_run_resume_internal_error',
  'internal_error',
]);

const MODAL_BLOCKING_ERROR_CODES = new Set(NON_RETRYABLE_ERROR_CODES);

interface CreateRunResponse {
  runId: string;
  accessToken?: string | null;
  statusUrl?: string;
  resumeUrl?: string;
  resultUrl?: string;
  state?: string;
  stateVersion?: number;
  currentPassId?: string | null;
  resumeHint?: {
    mode?: "auto" | "manual" | "none";
    reason?: string | null;
    retryAfterMs?: number | null;
  } | null;
  execution?: {
    status?: "idle" | "running";
    leaseExpiresAt?: string | null;
    sliceId?: string | null;
  } | null;
}

interface CreateRunErrorResponse {
  error?: string;
  limitExceeded?: boolean;
  userType?: string;
  remaining?: number;
  resetAt?: string | null;
}

interface RunFailurePayload {
  passId?: string | null;
  errorCode?: string | null;
  message?: string | null;
  rootCause?: string | null;
  invalidFieldPath?: string | null;
  retryable?: boolean | null;
}

interface ResumeErrorResponse {
  error?: string;
  message?: string | null;
  stage?: string | null;
  retryable?: boolean | null;
  failure?: RunFailurePayload | null;
  recoveredState?: string | null;
}

interface RunStatusResponse {
  runId: string;
  state: string;
  stateVersion?: number;
  executionStatus?: "advanced" | "already_running" | "terminal";
  currentPassId?: string | null;
  lastCompletedPassId?: string | null;
  completedTripId?: string | null;
  completedTripVersion?: number | null;
  failure?: RunFailurePayload | null;
  resumeHint?: {
    mode?: "auto" | "manual" | "none";
    reason?: string | null;
    retryAfterMs?: number | null;
  } | null;
  execution?: {
    status?: "idle" | "running";
    leaseExpiresAt?: string | null;
    sliceId?: string | null;
  } | null;
  pauseContext?: {
    pauseReason?: string | null;
    nextDayNumber?: number | null;
    resumePassId?: string | null;
  } | null;
}

interface RunResultResponse {
  state?: string;
  tripId?: string;
  tripVersion?: number;
  itinerary?: import('@/types').Itinerary;
  failure?: RunFailurePayload | null;
  pauseContext?: RunStatusResponse["pauseContext"] | null;
  resumeHint?: RunStatusResponse["resumeHint"] | null;
  execution?: RunStatusResponse["execution"] | null;
  currentPassId?: string | null;
}

interface PlanGenerationFailureState {
  message: string;
  ui: GenerationFailureUi;
  kind: string;
  canRetry: boolean;
  resumeRunId: string | null;
  originSurface: GenerationOriginSurface | null;
}

function buildPauseStatusMessage(
  t: ReturnType<typeof useTranslations>,
  event: {
    pauseReason?: string | null;
    nextDayIndex?: number | null;
    dayAttempt?: number | null;
    outlineAttempt?: number | null;
    chunkAttempt?: number | null;
  },
): string {
  const attempt = typeof event.chunkAttempt === "number"
    ? event.chunkAttempt
    : typeof event.outlineAttempt === "number"
      ? event.outlineAttempt
      : typeof event.dayAttempt === "number"
        ? event.dayAttempt
        : null;
  if (typeof event.nextDayIndex === "number" && typeof attempt === "number" && attempt >= 3) {
    return t("pause.dayRetrying", { day: event.nextDayIndex });
  }

  switch (event.pauseReason) {
    case "recovery_required":
      return t("pause.recovery_required");
    case "runtime_budget_exhausted":
      return t("pause.runtime_budget_exhausted");
    case "day_unit_boundary":
      return t("pause.waiting");
    case "infrastructure_interrupted":
      return t("pause.recovery_required");
    case "verify_budget_exhausted":
      return t("pause.verify_budget_exhausted");
    default:
      return t("pause.waiting");
  }
}

class PlanGenerationRequestError extends Error {
  errorCode?: string;
  retryable?: boolean;
  rootCause?: string;
  failedPassId?: string;

  constructor(message: string, options?: {
    errorCode?: string;
    retryable?: boolean;
    rootCause?: string;
    failedPassId?: string;
  }) {
    super(message);
    this.name = 'PlanGenerationRequestError';
    this.errorCode = options?.errorCode;
    this.retryable = options?.retryable;
    this.rootCause = options?.rootCause;
    this.failedPassId = options?.failedPassId;
  }
}

function buildPausedFailureState(
  t: ReturnType<typeof useTranslations>,
  runId: string,
  options?: {
    pauseReason?: string | null;
    nextDayNumber?: number | null;
    originSurface?: GenerationOriginSurface;
  },
): PlanGenerationFailureState {
  return {
    message: buildPauseStatusMessage(t, {
      pauseReason: options?.pauseReason ?? "runtime_budget_exhausted",
      nextDayIndex: options?.nextDayNumber ?? null,
    }),
    ui: "banner",
    kind: "run_paused",
    canRetry: true,
    resumeRunId: runId,
    originSurface: options?.originSurface ?? null,
  };
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
  const resumeAccessTokenRef = useRef<string | null>(null);
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
    resumeAccessTokenRef.current = null;
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

      if (/plan_run_resume_internal_error|internal_error/i.test(message)) {
        return t("errors.generationCodes.run_processor_unexpected_error");
      }

      // New pipeline: classify raw server messages into user-facing categories.
      // Never leak raw messages (JSON blobs, stack traces, internal Japanese) to the UI.
      if (/JSON parsing failed|Type validation failed|Unterminated string|invalid_enum_value/i.test(message ?? '')) {
        return t("errors.generationCodes.pipeline_ai_output_error");
      }
      if (/aborted due to timeout|operation.*aborted|AbortError|timed out|DEADLINE_EXCEEDED/i.test(message ?? '')) {
        return t("errors.generationCodes.pipeline_timeout");
      }
      if (/日数が一致しません|frame の日数.*が要求日数/i.test(message ?? '')) {
        return t("errors.generationCodes.pipeline_day_count_mismatch");
      }
      if (/meal block がありません|blocks がありません|timeline が存在|都市数が一致|都市順が一致|title がありません|gate failed/i.test(message ?? '')) {
        return t("errors.generationCodes.pipeline_gate_failed");
      }

      return resolveStepErrorMessage(failedPassId, t("errors.generic"));
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
        || /plan_run_resume_internal_error|internal_error/i.test(normalizedMessage)
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

  const buildRunUrl = useCallback((runId: string, path?: string, accessToken?: string | null) => {
    const basePath = path
      ? `/api/v1/plan-runs/${runId}/${path}`
      : `/api/v1/plan-runs/${runId}`;
    if (!accessToken) {
      return basePath;
    }
    return `${basePath}?access_token=${encodeURIComponent(accessToken)}`;
  }, []);

  const fetchRunStatus = useCallback(
    async (runId: string, accessToken?: string | null): Promise<RunStatusResponse> => {
      const res = await fetch(buildRunUrl(runId, undefined, accessToken));
      const payload = await res.json().catch(() => null) as RunStatusResponse | null;
      if (!res.ok || !payload) {
        throw new Error(t("errors.streamUnexpectedEnd"));
      }
      return payload;
    },
    [buildRunUrl, t],
  );

  const resumeRun = useCallback(
    async (runId: string, accessToken?: string | null): Promise<RunStatusResponse> => {
      const res = await fetch(buildRunUrl(runId, "resume", accessToken), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await res.json().catch(() => null) as (RunStatusResponse & ResumeErrorResponse) | null;
      if (!res.ok) {
        throw new PlanGenerationRequestError(
          payload?.failure?.message
            ?? payload?.message
            ?? t("errors.streamUnexpectedEnd"),
          {
            errorCode: payload?.failure?.errorCode
              ?? payload?.error
              ?? 'internal_error',
            retryable: payload?.failure?.retryable
              ?? payload?.retryable
              ?? false,
            rootCause: payload?.failure?.rootCause
              ?? payload?.stage
              ?? undefined,
            failedPassId: payload?.failure?.passId ?? undefined,
          },
        );
      }
      if (!payload) {
        throw new PlanGenerationRequestError(t("errors.streamUnexpectedEnd"), {
          errorCode: 'internal_error',
          retryable: false,
        });
      }
      return payload;
    },
    [buildRunUrl, t],
  );

  const syncProgressFromStatus = useCallback((status: RunStatusResponse) => {
    const pauseStatusText = status.pauseContext
      ? buildPauseStatusMessage(t, {
        pauseReason: status.pauseContext.pauseReason ?? undefined,
        nextDayIndex: status.pauseContext.nextDayNumber ?? undefined,
      })
      : "";
    const mappedStep = status.currentPassId
      ? PASS_TO_ACTIVE_STEP[status.currentPassId]
      : status.pauseContext?.resumePassId
        ? PASS_TO_ACTIVE_STEP[status.pauseContext.resumePassId]
        : SESSION_STATE_TO_STEP[status.state];

    if (mappedStep) {
      advanceStep(mappedStep);
    }

    overlay.syncProgress({
      currentStep: mappedStep ?? null,
      steps: stepsRef.current,
      pauseStatusText,
    });
  }, [advanceStep, overlay, t]);

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
        const createRun = async (): Promise<CreateRunResponse> => {
          const runRes = await fetch("/api/v1/plan-runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input,
              idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
              runtimeProfile: "netlify_free_30s",
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

        advanceStep("usage_check");
        advanceStep("normalize");

        const run = options?.isRetry && resumeRunId
          ? {
            runId: resumeRunId,
            accessToken: resumeAccessTokenRef.current,
            statusUrl: buildRunUrl(resumeRunId, undefined, resumeAccessTokenRef.current),
            resumeUrl: buildRunUrl(resumeRunId, "resume", resumeAccessTokenRef.current),
            resultUrl: buildRunUrl(resumeRunId, "result", resumeAccessTokenRef.current),
          }
          : await createRun();
        resumeAccessTokenRef.current = run.accessToken ?? null;

        let finishedTripId: string | null = null;
        let finishedTripVersion: number | null = null;
        let finished = false;
        let autoResumeAttempts = 0;

        while (!signal.aborted && !finished) {
          let status = await resumeRun(run.runId, run.accessToken);
          syncProgressFromStatus(status);

          if (status.state === "running" || status.executionStatus === "already_running") {
            await waitForResumeBackoff(signal);
            status = await fetchRunStatus(run.runId, run.accessToken);
            syncProgressFromStatus(status);
          }

          if (status.state === "completed") {
            finished = true;
            finishedTripId = status.completedTripId ?? finishedTripId;
            finishedTripVersion = status.completedTripVersion ?? finishedTripVersion;
            break;
          }

          if (status.state === "failed") {
            applyFailureState(classifyFailurePresentation({
              rawMessage: status.failure?.message ?? t("errors.streamUnexpectedEnd"),
              errorCode: status.failure?.errorCode ?? undefined,
              rootCause: status.failure?.rootCause ?? undefined,
              failedPassId: status.failure?.passId ?? undefined,
              retryable: status.failure?.retryable ?? undefined,
              runId: run.runId,
              fallbackOriginSurface: options?.originSurface ?? undefined,
            }));
            return;
          }

          if (status.state === "paused") {
            if (
              (status.resumeHint?.mode === "auto"
                || status.pauseContext?.pauseReason === "runtime_budget_exhausted"
                || status.pauseContext?.pauseReason === "day_unit_boundary")
              && autoResumeAttempts < AUTO_RESUME_SLICE_LIMIT
            ) {
              autoResumeAttempts += 1;
              await waitForResumeBackoff(signal);
              continue;
            }

            applyFailureState(buildPausedFailureState(t, run.runId, {
              pauseReason: status.pauseContext?.pauseReason ?? undefined,
              nextDayNumber: status.pauseContext?.nextDayNumber ?? undefined,
              originSurface: options?.originSurface ?? undefined,
            }));
            return;
          }

          if (status.state === "running" || status.executionStatus === "already_running") {
            await waitForResumeBackoff(signal);
            continue;
          }

          throw new Error(t("errors.streamUnexpectedEnd"));
        }

        const resultUrl = buildRunUrl(run.runId, "result", run.accessToken);
        const resultRes = await fetch(resultUrl, { signal });
        const resultData = await resultRes.json().catch(() => null) as RunResultResponse | null;

        if (resultRes.status === 422 && resultData?.state === "failed") {
          applyFailureState(classifyFailurePresentation({
            rawMessage: resultData.failure?.message ?? t("errors.streamUnexpectedEnd"),
            errorCode: resultData.failure?.errorCode ?? undefined,
            rootCause: resultData.failure?.rootCause ?? undefined,
            failedPassId: resultData.failure?.passId ?? undefined,
            retryable: resultData.failure?.retryable ?? undefined,
            runId: run.runId,
            fallbackOriginSurface: options?.originSurface ?? undefined,
          }));
          return;
        }

        if (resultRes.status === 409 && resultData?.state === "paused") {
          applyFailureState(buildPausedFailureState(t, run.runId, {
            pauseReason: resultData.pauseContext?.pauseReason ?? resultData.resumeHint?.reason ?? undefined,
            nextDayNumber: resultData.pauseContext?.nextDayNumber ?? undefined,
            originSurface: options?.originSurface ?? undefined,
          }));
          return;
        }

        if (!resultRes.ok || !resultData?.itinerary) {
          // result endpoint が失敗した場合は旧 endpoint にフォールバック
          if (!finishedTripId) throw new Error(t("errors.streamUnexpectedEnd"));
        }

        let itinerary = resultData?.itinerary;
        if (!itinerary) {
          // フォールバック: 旧 endpoint
          itinerary = await fetchTripItinerary(
            finishedTripId!,
            finishedTripVersion ?? undefined,
          );
        }
        if (resultData?.tripId) finishedTripId = resultData.tripId;
        if (typeof resultData?.tripVersion === 'number') finishedTripVersion = resultData.tripVersion;

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
          errorCode: err instanceof PlanGenerationRequestError ? err.errorCode : undefined,
          retryable: err instanceof PlanGenerationRequestError ? err.retryable : undefined,
          rootCause: err instanceof PlanGenerationRequestError ? err.rootCause : undefined,
          failedPassId: err instanceof PlanGenerationRequestError ? err.failedPassId : undefined,
          runId: resumeRunId ?? undefined,
          fallbackOriginSurface: options?.originSurface ?? undefined,
        }));
      }
    },
    [
      advanceStep,
      initSteps,
      clearFailure,
      classifyFailurePresentation,
      applyFailureState,
      buildRunUrl,
      fetchRunStatus,
      overlay,
      resumeRun,
      resumeRunId,
      resolveGeneratedItineraryTarget,
      router,
      syncProgressFromStatus,
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
