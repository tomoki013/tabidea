"use client";

import { useState, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserInput, Itinerary, PartialDayData } from "@/types";
import type { PipelineStepId, ComposePipelineMetadata } from "@/types/itinerary-pipeline";
import type { ComposeJobResponse } from "@/types/compose-job";
import { savePlanViaApi } from "@/lib/plans/save-plan-client";
import { saveLocalPlan, notifyPlanChange } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useUserPlans } from "@/context/UserPlansContext";
import type { UserType } from "@/lib/limits/config";
import type { ComposeJobErrorPayload } from "@/types/compose-job";

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

const JOB_POLL_INTERVAL_MS = 1_500;
const JOB_TIMEOUT_MS = 5 * 60_000;

interface ComposeJobCreateResponse {
  jobId?: string;
  accessToken?: string;
  error?: string;
  code?: string;
}

interface LegacyComposeEvent {
  type: string;
  step?: PipelineStepId;
  message?: string;
  totalDays?: number;
  destination?: string;
  description?: string;
  day?: number;
  dayData?: PartialDayData;
  result?: {
    itinerary: Itinerary;
    warnings: string[];
    metadata?: ComposePipelineMetadata;
  };
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: UserType | string;
  resetAt?: string | null;
  remaining?: number;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function shouldFallbackToLegacyCompose(payload: ComposeJobCreateResponse | null): boolean {
  return (
    payload?.code === "compose_job_backend_unavailable" ||
    payload?.code === "compose_job_store_misconfigured"
  );
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
        const response = await fetch("/api/itinerary/compose-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ input, options }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorPayload: ComposeJobCreateResponse | null = null;
          try {
            errorPayload = (await response.json()) as ComposeJobCreateResponse;
          } catch {
            errorPayload = null;
          }

          if (shouldFallbackToLegacyCompose(errorPayload)) {
            await runLegacyComposeGeneration(input, options, controller, {
              setCurrentStep,
              setSteps,
              setErrorMessage,
              setIsGenerating,
              setIsCompleted,
              setLimitExceeded,
              setWarnings,
              setPartialDays,
              setTotalDays,
              setPreviewDestination,
              setPreviewDescription,
              isAuthenticated,
              refreshPlans,
              router,
              t,
            });
            return;
          }

          setErrorMessage(t("errors.requestFailed", { status: response.status }));
          setIsGenerating(false);
          return;
        }

        const { jobId, accessToken } = (await response.json()) as ComposeJobCreateResponse;

        if (!jobId || !accessToken) {
          setErrorMessage(t("errors.generic"));
          setIsGenerating(false);
          return;
        }

        const startedAt = Date.now();

        while (true) {
          if (Date.now() - startedAt > JOB_TIMEOUT_MS) {
            setErrorMessage(t("errors.timeout"));
            setIsGenerating(false);
            return;
          }

          const pollResponse = await fetch(
            `/api/itinerary/compose-jobs/${jobId}?accessToken=${encodeURIComponent(accessToken)}`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              signal: controller.signal,
            }
          );

          if (!pollResponse.ok) {
            setErrorMessage(t("errors.requestFailed", { status: pollResponse.status }));
            setIsGenerating(false);
            return;
          }

          const job = (await pollResponse.json()) as ComposeJobResponse;

          if (job.currentStep) {
            const stepId = job.currentStep;
            setCurrentStep(stepId);
            setSteps((prev) =>
              prev.map((s) => {
                if (s.id === stepId) {
                  return {
                    ...s,
                    status: job.status === "completed" ? "completed" : "active",
                    message: job.currentMessage || s.message,
                  };
                }
                const currentIdx = COMPOSE_STEP_IDS.indexOf(stepId);
                const thisIdx = COMPOSE_STEP_IDS.indexOf(s.id);
                if (thisIdx < currentIdx && s.status !== "completed") {
                  return { ...s, status: "completed" };
                }
                return s;
              })
            );
          }

          if (job.progress.totalDays) {
            setTotalDays(job.progress.totalDays);
          }
          if (job.progress.destination) {
            setPreviewDestination(job.progress.destination);
          }
          if (job.progress.description) {
            setPreviewDescription(job.progress.description);
          }
          if (job.progress.partialDays) {
            const next = new Map<number, PartialDayData>();
            for (const [day, dayData] of Object.entries(job.progress.partialDays)) {
              next.set(Number(day), dayData);
            }
            setPartialDays(next);
          }

          if (job.status === "completed" && job.result) {
            setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
            setCurrentStep(null);
            setIsGenerating(false);
            setIsCompleted(true);
            setPartialDays(new Map());
            setWarnings(job.result.warnings || []);

            await handleCompletedResult(input, job.result, {
              isAuthenticated,
              refreshPlans,
              router,
              setErrorMessage,
              t,
            });
            return;
          }

          if (job.status === "failed") {
            setCurrentStep(null);
            setIsGenerating(false);
            setPartialDays(new Map());

            if (job.error?.limitExceeded) {
              setLimitExceeded({
                userType: (job.error.userType as UserType) || "anonymous",
                resetAt: job.error.resetAt ? new Date(job.error.resetAt) : null,
                remaining: job.error.remaining,
              });
            } else {
              setErrorMessage(resolveJobErrorMessage(job, t));
            }
            return;
          }

          await sleep(JOB_POLL_INTERVAL_MS, controller.signal);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setErrorMessage(t("errors.cancelled"));
        } else {
          setErrorMessage(t("errors.network"));
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

interface LegacyComposeRunDeps {
  setCurrentStep: (step: PipelineStepId | null) => void;
  setSteps: Dispatch<SetStateAction<ComposeStep[]>>;
  setErrorMessage: (message: string) => void;
  setIsGenerating: (value: boolean) => void;
  setIsCompleted: (value: boolean) => void;
  setLimitExceeded: (value: ComposeLimitExceeded | null) => void;
  setWarnings: (value: string[]) => void;
  setPartialDays: Dispatch<SetStateAction<Map<number, PartialDayData>>>;
  setTotalDays: (value: number) => void;
  setPreviewDestination: (value: string) => void;
  setPreviewDescription: (value: string) => void;
  isAuthenticated: boolean;
  refreshPlans: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useTranslations>;
}

async function runLegacyComposeGeneration(
  input: UserInput,
  options: { isRetry?: boolean } | undefined,
  controller: AbortController,
  deps: LegacyComposeRunDeps
): Promise<void> {
  const response = await fetch("/api/itinerary/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ input, options }),
    signal: controller.signal,
  });

  if (!response.ok) {
    deps.setErrorMessage(deps.t("errors.requestFailed", { status: response.status }));
    deps.setIsGenerating(false);
    return;
  }

  if (!response.body) {
    deps.setErrorMessage(deps.t("errors.streamUnexpectedEnd"));
    deps.setIsGenerating(false);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminalEventSeen = false;

  const handleProgressStep = (
    stepId: PipelineStepId,
    message?: string
  ) => {
    deps.setCurrentStep(stepId);
    deps.setSteps((prev) =>
      prev.map((s) => {
        if (s.id === stepId) {
          return {
            ...s,
            status: "active",
            message: message || s.message,
          };
        }
        const currentIdx = COMPOSE_STEP_IDS.indexOf(stepId);
        const thisIdx = COMPOSE_STEP_IDS.indexOf(s.id);
        if (thisIdx < currentIdx && s.status !== "completed") {
          return { ...s, status: "completed" };
        }
        return s;
      })
    );
  };

  const applyPreviewFields = (event: LegacyComposeEvent) => {
    if (event.totalDays) {
      deps.setTotalDays(event.totalDays);
    }
    if (event.destination) {
      deps.setPreviewDestination(event.destination);
    }
    if (event.description) {
      deps.setPreviewDescription(event.description);
    }
  };

  const handleLegacyEvent = async (event: LegacyComposeEvent): Promise<void> => {
    switch (event.type) {
      case "progress":
        if (event.step) {
          handleProgressStep(event.step, event.message);
        }
        applyPreviewFields(event);
        break;
      case "day_complete":
        applyPreviewFields(event);
        if (typeof event.day === "number" && event.dayData) {
          deps.setCurrentStep("narrative_render");
          deps.setPartialDays((prev) => {
            const next = new Map(prev);
            next.set(event.day as number, event.dayData as PartialDayData);
            return next;
          });
        }
        break;
      case "complete":
        if (!event.result) {
          deps.setErrorMessage(deps.t("errors.generic"));
          deps.setIsGenerating(false);
          return;
        }

        deps.setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
        deps.setCurrentStep(null);
        deps.setIsGenerating(false);
        deps.setIsCompleted(true);
        deps.setPartialDays(new Map());
        deps.setWarnings(event.result.warnings || []);
        terminalEventSeen = true;

        await handleCompletedResult(input, event.result, {
          isAuthenticated: deps.isAuthenticated,
          refreshPlans: deps.refreshPlans,
          router: deps.router,
          setErrorMessage: deps.setErrorMessage,
          t: deps.t,
        });
        break;
      case "error": {
        terminalEventSeen = true;
        deps.setCurrentStep(null);
        deps.setIsGenerating(false);
        deps.setPartialDays(new Map());

        const errorPayload: ComposeJobErrorPayload = {
          message: event.message || "compose_pipeline_failed",
          failedStep: event.failedStep,
          limitExceeded: event.limitExceeded,
          userType: event.userType,
          resetAt: event.resetAt,
          remaining: event.remaining,
        };

        if (errorPayload.limitExceeded) {
          deps.setLimitExceeded({
            userType: (errorPayload.userType as UserType) || "anonymous",
            resetAt: errorPayload.resetAt ? new Date(errorPayload.resetAt) : null,
            remaining: errorPayload.remaining,
          });
        } else {
          deps.setErrorMessage(resolveErrorPayloadMessage(errorPayload, deps.t));
        }
        break;
      }
      case "done":
        terminalEventSeen = true;
        break;
      default:
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLines = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());

      if (dataLines.length === 0) {
        continue;
      }

      const event = JSON.parse(dataLines.join("\n")) as LegacyComposeEvent;
      await handleLegacyEvent(event);
    }

    if (done) {
      break;
    }
  }

  if (!terminalEventSeen) {
    deps.setErrorMessage(deps.t("errors.streamUnexpectedEnd"));
    deps.setIsGenerating(false);
  }
}

function resolveJobErrorMessage(
  job: ComposeJobResponse,
  t: ReturnType<typeof useTranslations>
): string {
  return resolveErrorPayloadMessage(job.error, t);
}

function resolveErrorPayloadMessage(
  error: ComposeJobErrorPayload | undefined,
  t: ReturnType<typeof useTranslations>
): string {
  const failedStep = error?.failedStep;
  if (failedStep) {
    const stepKey = `errors.stepFailed.${failedStep}` as const;
    try {
      return t(stepKey);
    } catch {
      return t("errors.stepFailed.unknown");
    }
  }

  if (error?.message?.includes("timeout") || error?.message?.includes("Timed out")) {
    return t("errors.timeout");
  }

  return error?.message || t("errors.generic");
}

async function handleCompletedResult(
  input: UserInput,
  result: {
    itinerary: Itinerary;
    warnings: string[];
    metadata?: ComposePipelineMetadata;
  },
  deps: {
    isAuthenticated: boolean;
    refreshPlans: () => Promise<void>;
    router: ReturnType<typeof useRouter>;
    setErrorMessage: (message: string) => void;
    t: ReturnType<typeof useTranslations>;
  }
): Promise<void> {
  try {
    if (deps.isAuthenticated) {
      const saveResult = await savePlanViaApi(input, result.itinerary, false);
      if (saveResult.success && saveResult.plan) {
        await deps.refreshPlans();
        deps.router.push(`/plan/id/${saveResult.plan.id}`);
        return;
      }
    }

    const localPlan = await saveLocalPlan(input, result.itinerary);
    notifyPlanChange();
    deps.router.push(`/plan/local/${localPlan.id}`);
  } catch (saveErr) {
    console.error("[compose] Save failed:", saveErr);
    deps.setErrorMessage(deps.t("errors.saveFailed"));
  }
}
