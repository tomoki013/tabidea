"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserInput, Itinerary, PartialDayData } from "@/types";
import type {
  PipelineStepId,
  ComposePipelineMetadata,
  TimelineDay,
  NormalizedRequest,
  SemanticCandidate,
} from "@/types/itinerary-pipeline";
import type { SemanticSeedPlan } from "@/lib/services/itinerary/steps/semantic-planner";
import { savePlanViaApi } from "@/lib/plans/save-plan-client";
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
  steps: ComposeStep[];
  currentStep: PipelineStepId | null;
  isGenerating: boolean;
  isCompleted: boolean;
  errorMessage: string;
  limitExceeded: ComposeLimitExceeded | null;
  warnings: string[];
  partialDays: Map<number, PartialDayData>;
  totalDays: number;
  previewDestination: string;
  previewDescription: string;
  generate: (input: UserInput, options?: { isRetry?: boolean }) => Promise<void>;
  reset: () => void;
  clearLimitExceeded: () => void;
}

// ============================================
// Step definitions
// ============================================

// Phase 1 (structure) steps
const STRUCTURE_STEP_IDS: PipelineStepId[] = [
  "usage_check",
  "normalize",
  "semantic_plan",
  "place_resolve",
  "feasibility_score",
  "route_optimize",
  "timeline_build",
];

// Phase 2 (narrate) steps
const NARRATE_STEP_IDS: PipelineStepId[] = [
  "narrative_render",
  "hero_image",
];

const COMPOSE_STEP_IDS: PipelineStepId[] = [...STRUCTURE_STEP_IDS, ...NARRATE_STEP_IDS];

// ============================================
// Response types
// ============================================

interface SeedResponse {
  ok: boolean;
  normalizedRequest?: NormalizedRequest;
  seed?: SemanticSeedPlan;
  warnings?: string[];
  metadata?: {
    modelName: string;
    narrativeModelName: string;
    modelTier: "flash" | "pro";
    provider: string;
  };
  error?: string;
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
}

interface SpotsResponse {
  ok: boolean;
  candidates?: SemanticCandidate[];
  warnings?: string[];
  error?: string;
  failedStep?: string;
}

interface AssembleResponse {
  ok: boolean;
  timeline?: TimelineDay[];
  destination?: string;
  description?: string;
  heroImage?: { url: string; photographer: string; photographerUrl: string } | null;
  warnings?: string[];
  metadata?: {
    candidateCount: number;
    resolvedCount: number;
    modelName: string;
    narrativeModelName: string;
    modelTier: "flash" | "pro";
    provider: string;
    timeoutMitigationUsed: boolean;
  };
  error?: string;
  failedStep?: string;
}

interface NarrateSSEEvent {
  type: string;
  step?: PipelineStepId;
  message?: string;
  totalDays?: number;
  destination?: string;
  description?: string;
  day?: number;
  dayData?: PartialDayData;
  isComplete?: boolean;
  result?: {
    itinerary: Itinerary;
    warnings: string[];
    metadata?: ComposePipelineMetadata;
  };
  failedStep?: string;
}

// ============================================
// Response parsing helpers
// ============================================
interface ParsedErrorPayload {
  error?: string;
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function extractErrorPayload(response: Response): Promise<ParsedErrorPayload | null> {
  const jsonPayload = await parseJsonSafely<ParsedErrorPayload>(response);
  if (jsonPayload) {
    return jsonPayload;
  }

  try {
    const text = await response.text();
    const message = text.trim();
    return message ? { error: message } : null;
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
  const [limitExceeded, setLimitExceeded] = useState<ComposeLimitExceeded | null>(null);
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

  const advanceStep = useCallback(
    (stepId: PipelineStepId, message?: string) => {
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
    },
    []
  );

  const generate = useCallback(
    async (input: UserInput, options?: { isRetry?: boolean }) => {
      const resolveStepErrorMessage = (failedStep?: string, fallbackMessage?: string) => {
        if (failedStep) {
          try {
            return t(`errors.stepFailed.${failedStep}` as Parameters<typeof t>[0]);
          } catch {
            return t("errors.stepFailed.unknown");
          }
        }

        return fallbackMessage || t("errors.generic");
      };

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

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // ==============================
        // Phase 1-A: Seed pipeline
        // ==============================
        advanceStep("usage_check");

        const seedRes = await fetch("/api/itinerary/plan/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ input, options }),
          signal: controller.signal,
        });

        const seedData = await extractErrorPayload(seedRes) as SeedResponse | null;

        if (!seedData) {
          setErrorMessage(t("errors.generic"));
          setIsGenerating(false);
          return;
        }

        if (!seedRes.ok || !seedData.ok) {
          if (seedData.limitExceeded) {
            setLimitExceeded({
              userType: (seedData.userType as UserType) || "anonymous",
              resetAt: seedData.resetAt ? new Date(seedData.resetAt) : null,
              remaining: seedData.remaining,
            });
          } else {
            setErrorMessage(resolveStepErrorMessage(seedData.failedStep, seedData.error));
          }
          setIsGenerating(false);
          return;
        }

        const { normalizedRequest, seed, warnings: seedWarnings, metadata } = seedData;

        if (!normalizedRequest || !seed || !metadata) {
          setErrorMessage(t("errors.generic"));
          setIsGenerating(false);
          return;
        }

        setSteps((prev) =>
          prev.map((s) =>
            s.id === "usage_check" || s.id === "normalize"
              ? { ...s, status: "completed" }
              : s
          )
        );
        advanceStep("semantic_plan", t("steps.semantic_planPreparing"));
        setPreviewDestination(seed.destination);
        setPreviewDescription(seed.description);
        setTotalDays(seed.dayStructure.length);

        // ==============================
        // Phase 1-B: Day-by-day spot generation
        // ==============================
        const accumulatedCandidates: SemanticCandidate[] = [];
        const spotWarnings: string[] = [];

        for (let day = 1; day <= seed.dayStructure.length; day += 1) {
          advanceStep(
            "semantic_plan",
            t("steps.semantic_planDay", { day, total: seed.dayStructure.length })
          );

          const spotsRes = await fetch("/api/itinerary/plan/spots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              normalizedRequest,
              seed,
              day,
              accumulatedCandidates,
              modelName: metadata.modelName,
              provider: metadata.provider,
            }),
            signal: controller.signal,
          });

          const spotsData = await extractErrorPayload(spotsRes) as SpotsResponse | null;

          if (!spotsData || !spotsRes.ok || !spotsData.ok || !spotsData.candidates) {
            setErrorMessage(resolveStepErrorMessage(spotsData?.failedStep, spotsData?.error));
            setIsGenerating(false);
            return;
          }

          accumulatedCandidates.push(...spotsData.candidates);
          if (spotsData.warnings?.length) {
            spotWarnings.push(...spotsData.warnings);
          }
        }

        // ==============================
        // Phase 1-C: Assemble structure
        // ==============================
        advanceStep("place_resolve");
        const assembleRes = await fetch("/api/itinerary/plan/assemble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            normalizedRequest,
            seed,
            candidates: accumulatedCandidates,
            metadata,
          }),
          signal: controller.signal,
        });

        const assembleData = await extractErrorPayload(assembleRes) as AssembleResponse | null;

        if (!assembleData || !assembleRes.ok || !assembleData.ok) {
          setErrorMessage(resolveStepErrorMessage(assembleData?.failedStep, assembleData?.error));
          setIsGenerating(false);
          return;
        }

        const {
          timeline,
          destination,
          description,
          heroImage,
          warnings: assembleWarnings,
          metadata: assembleMetadata,
        } = assembleData;

        if (!timeline || !assembleMetadata) {
          setErrorMessage(t("errors.generic"));
          setIsGenerating(false);
          return;
        }

        setSteps((prev) =>
          prev.map((s) =>
            STRUCTURE_STEP_IDS.includes(s.id) ? { ...s, status: "completed" } : s
          )
        );
        setCurrentStep(null);

        // ==============================
        // Phase 2: Narrate pipeline (SSE)
        // ==============================
        advanceStep("narrative_render", t("steps.narrative_render"));

        const narrateRes = await fetch("/api/itinerary/plan/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            timeline,
            normalizedRequest,
            narrativeModelName: assembleMetadata.narrativeModelName,
            provider: assembleMetadata.provider,
            modelTier: assembleMetadata.modelTier,
            destination,
            description,
            heroImage: heroImage ?? null,
            warnings: [...(seedWarnings ?? []), ...spotWarnings, ...(assembleWarnings ?? [])],
            originalInput: input,
          }),
          signal: controller.signal,
        });

        if (!narrateRes.ok || !narrateRes.body) {
          const narrateError = await extractErrorPayload(narrateRes);
          setErrorMessage(
            resolveStepErrorMessage(
              narrateError?.failedStep,
              narrateError?.error || t("errors.requestFailed", { status: narrateRes.status })
            )
          );
          setIsGenerating(false);
          return;
        }

        const reader = narrateRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let terminalSeen = false;

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const dataLines = chunk
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trim());

            if (dataLines.length === 0) continue;

            const event = JSON.parse(dataLines.join("\n")) as NarrateSSEEvent;

            switch (event.type) {
              case "progress":
                if (event.step) advanceStep(event.step, event.message);
                if (event.totalDays) setTotalDays(event.totalDays);
                if (event.destination) setPreviewDestination(event.destination);
                if (event.description) setPreviewDescription(event.description);
                break;

              case "day_complete":
                if (event.destination) setPreviewDestination(event.destination);
                if (event.description) setPreviewDescription(event.description);
                if (typeof event.day === "number" && event.dayData) {
                  setPartialDays((prev) => {
                    const next = new Map(prev);
                    next.set(event.day as number, event.dayData as PartialDayData);
                    return next;
                  });
                }
                break;

              case "complete": {
                if (!event.result) {
                  setErrorMessage(t("errors.generic"));
                  setIsGenerating(false);
                  terminalSeen = true;
                  break;
                }

                setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
                setCurrentStep(null);
                setIsGenerating(false);
                setIsCompleted(true);
                setPartialDays(new Map());
                setWarnings(event.result.warnings || []);
                terminalSeen = true;

                try {
                  if (isAuthenticated) {
                    const saveResult = await savePlanViaApi(input, event.result.itinerary, false);
                    if (saveResult.success && saveResult.plan) {
                      router.push(`/plan/id/${saveResult.plan.id}`);
                      void refreshPlans();
                      return;
                    }
                  }
                  const localPlan = await saveLocalPlan(input, event.result.itinerary);
                  router.push(`/plan/local/${localPlan.id}`);
                  notifyPlanChange();
                } catch (saveErr) {
                  console.error("[compose] Save failed:", saveErr);
                  setErrorMessage(t("errors.saveFailed"));
                }
                break;
              }

              case "error": {
                terminalSeen = true;
                setCurrentStep(null);
                setIsGenerating(false);
                setPartialDays(new Map());
                setErrorMessage(resolveStepErrorMessage(event.failedStep, event.message));
                break;
              }

              case "done":
                terminalSeen = true;
                break;
            }
          }

          if (done) break;
        }

        if (!terminalSeen) {
          setErrorMessage(t("errors.streamUnexpectedEnd"));
          setPartialDays(new Map());
          setIsGenerating(false);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setErrorMessage(t("errors.cancelled"));
        } else {
          setErrorMessage(t("errors.network"));
        }
        setPartialDays(new Map());
        setIsGenerating(false);
      }
    },
    [initSteps, advanceStep, isAuthenticated, refreshPlans, router, t]
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
