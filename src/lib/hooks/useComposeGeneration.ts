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
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { deduplicateCandidates } from "@/lib/services/itinerary/steps/dedup-candidates";
import { readSSEStream } from "@/lib/utils/sse-reader";
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
    timeoutMitigationUsed: boolean;
  };
  error?: string;
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
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

interface ComposeSSEEvent extends NarrateSSEEvent {
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
}

interface SeedSSEEvent {
  type: "progress" | "normalized" | "complete" | "error" | "done";
  step?: PipelineStepId;
  message?: string;
  totalDays?: number;
  ok?: boolean;
  normalizedRequest?: NormalizedRequest;
  seed?: SemanticSeedPlan;
  warnings?: string[];
  metadata?: SeedResponse["metadata"];
  error?: string;
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
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
    [isAuthenticated, refreshPlans, router]
  );

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

      const runLegacyComposeFallback = async (controller: AbortController) => {
        setPartialDays(new Map());
        setPreviewDestination("");
        setPreviewDescription("");
        setTotalDays(0);
        advanceStep("usage_check", t("steps.usage_check"));

        const composeRes = await fetch("/api/itinerary/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ input, options }),
          signal: controller.signal,
        });

        if (!composeRes.ok || !composeRes.body) {
          const composeError = await extractErrorPayload(composeRes);
          if (composeError?.limitExceeded) {
            setLimitExceeded({
              userType: (composeError.userType as UserType) || "anonymous",
              resetAt: composeError.resetAt ? new Date(composeError.resetAt) : null,
              remaining: composeError.remaining,
            });
          } else {
            setErrorMessage(
              resolveStepErrorMessage(
                composeError?.failedStep,
                composeError?.error || t("errors.requestFailed", { status: composeRes.status })
              )
            );
          }
          setIsGenerating(false);
          return;
        }

        const reader = composeRes.body.getReader();
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
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());

            if (dataLines.length === 0) continue;

            const event = JSON.parse(dataLines.join("\n")) as ComposeSSEEvent;

            switch (event.type) {
              case "ack":
              case "heartbeat":
                break;

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
                  const fallbackDay = event.day;
                  const fallbackDayData = event.dayData;
                  setPartialDays((prev) => {
                    const next = new Map(prev);
                    next.set(fallbackDay, fallbackDayData);
                    return next;
                  });
                }
                break;

              case "complete":
                if (!event.result) {
                  setErrorMessage(t("errors.generic"));
                  setIsGenerating(false);
                  terminalSeen = true;
                  break;
                }

                setSteps((prev) => prev.map((step) => ({ ...step, status: "completed" })));
                setCurrentStep(null);
                setIsGenerating(false);
                setIsCompleted(true);
                setPartialDays(new Map());
                setWarnings(event.result.warnings || []);
                terminalSeen = true;

                try {
                  await persistGeneratedItinerary(input, event.result.itinerary);
                  return;
                } catch (saveErr) {
                  console.error("[compose] Save failed:", saveErr);
                  setErrorMessage(t("errors.saveFailed"));
                }
                break;

              case "error":
                if (event.limitExceeded) {
                  setLimitExceeded({
                    userType: (event.userType as UserType) || "anonymous",
                    resetAt: event.resetAt ? new Date(event.resetAt) : null,
                    remaining: event.remaining,
                  });
                } else {
                  setErrorMessage(resolveStepErrorMessage(event.failedStep, event.message));
                }
                setCurrentStep(null);
                setIsGenerating(false);
                setPartialDays(new Map());
                terminalSeen = true;
                break;

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
      };

      const isTimeoutError = (errorMsg?: string) =>
        /timeout|timed out/i.test(errorMsg ?? "");

      const tryLegacyComposeFallback = async (controller: AbortController, errorContext?: string) => {
        // Skip compose fallback on timeout errors — compose will also timeout
        if (isTimeoutError(errorContext)) {
          console.warn("[compose] Skipping legacy fallback for timeout error:", errorContext);
          return false;
        }
        try {
          await runLegacyComposeFallback(controller);
          return true;
        } catch (fallbackError) {
          console.error("[compose] Legacy fallback failed:", fallbackError);
          return false;
        }
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
        // Phase 0: Preflight (usage check)
        // ==============================
        advanceStep("usage_check");

        let preCheckedUsage: { userType: string; remaining: number; resetAt: string | null } | undefined;

        try {
          const preflightRes = await fetch("/api/itinerary/plan/preflight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ options }),
            signal: controller.signal,
          });

          const preflightData = await parseJsonSafely<PreflightResponse>(preflightRes);

          if (preflightData) {
            if (preflightData.limitExceeded) {
              setLimitExceeded({
                userType: (preflightData.userType as UserType) || "anonymous",
                resetAt: preflightData.resetAt ? new Date(preflightData.resetAt) : null,
                remaining: preflightData.remaining,
              });
              setIsGenerating(false);
              return;
            }

            if (preflightData.ok && preflightData.userType) {
              preCheckedUsage = {
                userType: preflightData.userType,
                remaining: preflightData.remaining ?? 0,
                resetAt: preflightData.resetAt ?? null,
              };
            }
          }
        } catch {
          // Preflight failed — seed pipeline will do usage check inline
          console.warn("[compose] Preflight failed, seed will check usage inline");
        }

        // ==============================
        // Phase 1-A: Seed pipeline (SSE streaming)
        // ==============================
        advanceStep("normalize");

        const seedRes = await fetch("/api/itinerary/plan/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ input, options, preCheckedUsage }),
          signal: controller.signal,
        });

        if (!seedRes.ok && !seedRes.body) {
          const parsedSeedError = await extractErrorPayload(seedRes) as SeedResponse | null;
          if (await tryLegacyComposeFallback(controller, parsedSeedError?.error)) return;
          setErrorMessage(t("errors.generic"));
          setIsGenerating(false);
          return;
        }

        // Read seed SSE stream and collect the final result
        let seedData: SeedResponse | null = null;
        let seedError: string | undefined;
        let seedTerminalSeen = false;

        if (seedRes.body) {
          await readSSEStream<SeedSSEEvent>(seedRes, (event) => {
            switch (event.type) {
              case "progress":
                if (event.step) advanceStep(event.step, event.message);
                break;
              case "normalized":
                // Early partial data — we could cache this for resilience
                break;
              case "complete":
                seedData = {
                  ok: true,
                  normalizedRequest: event.normalizedRequest,
                  seed: event.seed,
                  warnings: event.warnings,
                  metadata: event.metadata,
                };
                seedTerminalSeen = true;
                break;
              case "error":
                seedData = {
                  ok: false,
                  error: event.error,
                  failedStep: event.failedStep,
                  limitExceeded: event.limitExceeded,
                  userType: event.userType,
                  resetAt: event.resetAt,
                  remaining: event.remaining,
                };
                seedError = event.error;
                seedTerminalSeen = true;
                break;
              case "done":
                seedTerminalSeen = true;
                break;
            }
          }, { signal: controller.signal });
        }

        if (!seedTerminalSeen || !seedData) {
          if (await tryLegacyComposeFallback(controller, seedError)) return;
          setErrorMessage(t("errors.generic"));
          setIsGenerating(false);
          return;
        }

        // TypeScript cannot track mutations through the readSSEStream callback,
        // so we re-bind to a properly typed const after the null guard above.
        const resolvedSeed: SeedResponse = seedData;

        if (!resolvedSeed.ok) {
          if (resolvedSeed.limitExceeded) {
            setLimitExceeded({
              userType: (resolvedSeed.userType as UserType) || "anonymous",
              resetAt: resolvedSeed.resetAt ? new Date(resolvedSeed.resetAt) : null,
              remaining: resolvedSeed.remaining,
            });
            setIsGenerating(false);
            return;
          }
          if (await tryLegacyComposeFallback(controller, resolvedSeed.error)) return;
          setErrorMessage(resolveStepErrorMessage(resolvedSeed.failedStep, resolvedSeed.error));
          setIsGenerating(false);
          return;
        }

        const { normalizedRequest, seed, warnings: seedWarnings, metadata } = resolvedSeed;

        if (!normalizedRequest || !seed || !metadata) {
          if (await tryLegacyComposeFallback(controller, resolvedSeed.error)) return;
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
        // Phase 1-B: Parallel spot generation
        // ==============================
        const spotWarnings: string[] = [];
        const totalDaysCount = seed.dayStructure.length;
        const dayNumbers = Array.from({ length: totalDaysCount }, (_, i) => i + 1);

        // Max 3 concurrent requests to avoid Gemini rate limits
        const SPOTS_CONCURRENCY = 3;
        let completedDays = 0;

        advanceStep(
          "semantic_plan",
          t("steps.semantic_planDay", { day: 1, total: totalDaysCount })
        );

        const spotResults = await mapWithConcurrency(
          dayNumbers,
          SPOTS_CONCURRENCY,
          async (day) => {
            const spotsRes = await fetch("/api/itinerary/plan/spots", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                normalizedRequest,
                seed,
                day,
                accumulatedCandidates: [],
                modelName: metadata.modelName,
                provider: metadata.provider,
              }),
              signal: controller.signal,
            });

            const spotsData = await extractErrorPayload(spotsRes) as SpotsResponse | null;

            if (!spotsData || !spotsRes.ok || !spotsData.ok || !spotsData.candidates) {
              throw new Error(spotsData?.error ?? "spots_failed");
            }

            completedDays++;
            advanceStep(
              "semantic_plan",
              t("steps.semantic_planDay", { day: completedDays, total: totalDaysCount })
            );

            return spotsData;
          },
        );

        // Collect results — successful days' candidates + warnings
        const rawCandidates: SemanticCandidate[] = [];
        let spotsHadFailure = false;

        for (const result of spotResults) {
          if (result.status === "fulfilled") {
            rawCandidates.push(...(result.value.candidates ?? []));
            if (result.value.warnings?.length) {
              spotWarnings.push(...result.value.warnings);
            }
          } else {
            spotsHadFailure = true;
            console.warn("[compose] Spot generation failed for a day:", result.reason);
          }
        }

        // If ALL days failed, abort
        if (rawCandidates.length === 0 && spotsHadFailure) {
          if (await tryLegacyComposeFallback(controller, "all_spots_failed")) return;
          setErrorMessage(resolveStepErrorMessage("semantic_plan"));
          setIsGenerating(false);
          return;
        }

        // Deduplicate candidates generated independently
        const accumulatedCandidates = deduplicateCandidates(rawCandidates);

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
          if (await tryLegacyComposeFallback(controller, assembleData?.error)) return;
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
          if (await tryLegacyComposeFallback(controller, assembleData?.error)) return;
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
          if (await tryLegacyComposeFallback(controller, narrateError?.error)) return;
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
                  await persistGeneratedItinerary(input, event.result.itinerary);
                  return;
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
          if (await tryLegacyComposeFallback(controller)) return;
          setErrorMessage(t("errors.streamUnexpectedEnd"));
          setPartialDays(new Map());
          setIsGenerating(false);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setErrorMessage(t("errors.cancelled"));
        } else {
          if (await tryLegacyComposeFallback(controller)) return;
          setErrorMessage(t("errors.network"));
        }
        setPartialDays(new Map());
        setIsGenerating(false);
      }
    },
    [initSteps, advanceStep, persistGeneratedItinerary, t]
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
