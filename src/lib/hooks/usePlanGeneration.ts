"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserInput,
  Itinerary,
  DayPlan,
  GenerationState,
  initialGenerationState,
  PlanOutline,
  Article,
} from "@/types";
import type { DayGenerationStatus, ChunkInfo } from "@/types";
import { splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import {
  generatePlanChunk,
  savePlan,
} from "@/app/actions/travel-planner";
import { saveLocalPlan, notifyPlanChange } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useUserPlans } from "@/context/UserPlansContext";
import { useGenerationProgress } from "@/lib/hooks/useGenerationProgress";
import type { GenerationStep } from "@/lib/hooks/useGenerationProgress";
import type { UserType } from "@/lib/limits/config";

// ============================================================================
// Types
// ============================================================================

export interface LimitExceededInfo {
  userType: UserType;
  resetAt: Date | null;
  remaining?: number;
}

export interface UsePlanGenerationOptions {
  /** Called when plan is successfully saved */
  onComplete?: () => void;
  /** Whether to use streaming mode (show outline first, then details) */
  streamingMode?: boolean;
}

export interface UsePlanGenerationReturn {
  /** Current generation state */
  generationState: GenerationState;
  /** Generate a plan (outline first, then details) */
  generatePlan: (input: UserInput) => Promise<void>;
  /** Proceed from outline review to details generation */
  proceedToDetails: (confirmedOutline: PlanOutline) => Promise<void>;
  /** Retry a failed chunk */
  retryChunk: (dayStart: number, dayEnd: number) => Promise<void>;
  /** Reset generation state to idle */
  reset: () => void;
  /** Limit exceeded info (if applicable) */
  limitExceeded: LimitExceededInfo | null;
  /** Error message (if any) */
  errorMessage: string;
  /** Clear limit exceeded state */
  clearLimitExceeded: () => void;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Whether currently in outline review mode */
  isReviewingOutline: boolean;
  /** Whether generation is completed */
  isCompleted: boolean;
  /** Real-time SSE progress steps for outline generation */
  progressSteps: GenerationStep[];
  /** Currently active SSE progress step ID */
  progressCurrentStep: string | null;
}

// ============================================================================
// Default input values for optional fields
// ============================================================================

const DEFAULT_INPUT_VALUES = {
  budget: "standard",
  pace: "balanced",
  theme: ["グルメ"],
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePlanGeneration(
  options: UsePlanGenerationOptions = {}
): UsePlanGenerationReturn {
  const { onComplete, streamingMode = true } = options;

  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { refreshPlans } = useUserPlans();

  // SSE progress tracking for outline generation
  const {
    steps: progressSteps,
    currentStep: progressCurrentStep,
    generateOutlineStream,
    resetProgress,
  } = useGenerationProgress();

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>(
    initialGenerationState
  );

  // User input for generation (stored when outline is generated)
  const inputRef = useRef<UserInput | null>(null);

  // Context from outline generation
  const contextRef = useRef<Article[]>([]);

  // Error handling
  const [errorMessage, setErrorMessage] = useState("");
  const [limitExceeded, setLimitExceeded] = useState<LimitExceededInfo | null>(
    null
  );

  // Chunk promises tracking
  const chunkPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

  // ========================================
  // Helper: Update day status
  // ========================================
  const updateDayStatus = useCallback(
    (dayNumber: number, status: DayGenerationStatus) => {
      setGenerationState((prev) => {
        const newStatuses = new Map(prev.dayStatuses);
        newStatuses.set(dayNumber, status);
        return { ...prev, dayStatuses: newStatuses };
      });
    },
    []
  );

  // ========================================
  // Helper: Add completed days
  // ========================================
  const addCompletedDays = useCallback((days: DayPlan[]) => {
    setGenerationState((prev) => {
      const newCompletedDays = [...prev.completedDays, ...days];
      // Sort by day number
      newCompletedDays.sort((a, b) => a.day - b.day);
      return { ...prev, completedDays: newCompletedDays };
    });
  }, []);

  // ========================================
  // Generate a single chunk
  // ========================================
  const generateChunk = useCallback(
    async (
      chunkInput: UserInput,
      context: Article[],
      outlineDays: PlanOutline["days"],
      chunk: ChunkInfo,
      allOutlineDays: PlanOutline["days"],
      destination?: string
    ) => {
      // Mark days as generating
      for (let d = chunk.start; d <= chunk.end; d++) {
        updateDayStatus(d, "generating");
      }

      // Determine start location from previous day's outline overnight_location,
      // or use the destination for the first chunk so the AI knows where the traveler starts
      let previousOvernightLocation: string | undefined = undefined;
      if (chunk.start > 1) {
        const prevDay = allOutlineDays.find((d) => d.day === chunk.start - 1);
        if (prevDay) {
          previousOvernightLocation = prevDay.overnight_location;
        }
      } else if (destination) {
        previousOvernightLocation = destination;
      }

      try {
        const chunkOutlineDays = outlineDays.filter(
          (d) => d.day >= chunk.start && d.day <= chunk.end
        );
        const result = await generatePlanChunk(
          chunkInput,
          context,
          chunkOutlineDays,
          chunk.start,
          chunk.end,
          previousOvernightLocation
        );

        if (result.success && result.data) {
          // Mark days as completed and add them
          for (const day of result.data) {
            updateDayStatus(day.day, "completed");
          }
          addCompletedDays(result.data);
        } else {
          // Mark days as error
          for (let d = chunk.start; d <= chunk.end; d++) {
            updateDayStatus(d, "error");
          }
        }
      } catch (error) {
        console.error(`Chunk ${chunk.start}-${chunk.end} failed:`, error);
        for (let d = chunk.start; d <= chunk.end; d++) {
          updateDayStatus(d, "error");
        }
      }
    },
    [updateDayStatus, addCompletedDays]
  );

  // ========================================
  // Save completed plan
  // ========================================
  const saveCompletedPlan = useCallback(async () => {
    const { outline, heroImage, completedDays, context, updatedInput, modelInfo } =
      generationState;

    if (!outline || !updatedInput || completedDays.length === 0) {
      return;
    }

    const sortedDays = [...completedDays].sort((a, b) => a.day - b.day);
    const simpleId = Math.random().toString(36).substring(2, 15);

    const finalPlan: Itinerary = {
      id: simpleId,
      destination: outline.destination,
      description: outline.description,
      heroImage: heroImage?.url || undefined,
      heroImagePhotographer: heroImage?.photographer || undefined,
      heroImagePhotographerUrl: heroImage?.photographerUrl || undefined,
      days: sortedDays,
      references: (context || []).map((c) => ({
        title: c.title,
        url: c.url,
        image: c.imageUrl,
        snippet: c.snippet,
      })),
      modelInfo,
    };

    try {
      if (isAuthenticated) {
        const saveResult = await savePlan(updatedInput, finalPlan, false);
        if (saveResult.success && saveResult.plan) {
          await refreshPlans();
          router.push(`/plan/id/${saveResult.plan.id}`);
        } else {
          console.error(
            "Failed to save to DB, falling back to local storage:",
            saveResult.error
          );
          const localPlan = await saveLocalPlan(updatedInput, finalPlan);
          notifyPlanChange();
          router.push(`/plan/local/${localPlan.id}`);
        }
      } else {
        const localPlan = await saveLocalPlan(updatedInput, finalPlan);
        notifyPlanChange();
        router.push(`/plan/local/${localPlan.id}`);
      }

      onComplete?.();
    } catch (error) {
      console.error("Failed to save plan:", error);
      setGenerationState((prev) => ({
        ...prev,
        phase: "error",
        error: "プランの保存に失敗しました。",
        errorType: "save",
      }));
    }
  }, [generationState, isAuthenticated, refreshPlans, router, onComplete]);

  // ========================================
  // Watch for completion and auto-save
  // ========================================
  const {
    phase: currentPhase,
    completedDays: currentCompletedDays,
    totalDays: currentTotalDays,
  } = generationState;

  useEffect(() => {
    if (
      currentPhase === "generating_details" &&
      currentTotalDays > 0 &&
      currentCompletedDays.length === currentTotalDays
    ) {
      // All days completed, mark as complete
      setGenerationState((prev) => ({ ...prev, phase: "completed" }));
    }
  }, [currentPhase, currentCompletedDays.length, currentTotalDays]);

  // Auto-save when completed
  useEffect(() => {
    if (generationState.phase === "completed") {
      saveCompletedPlan();
    }
  }, [generationState.phase, saveCompletedPlan]);

  // ========================================
  // Generate plan (outline first)
  // ========================================
  const generatePlan = useCallback(
    async (input: UserInput) => {
      // Prepare input with defaults
      const preparedInput = { ...input };

      if (preparedInput.isDestinationDecided === false && !preparedInput.region) {
        preparedInput.region = "anywhere";
      }

      if (!preparedInput.budget) preparedInput.budget = DEFAULT_INPUT_VALUES.budget;
      if (!preparedInput.pace) preparedInput.pace = DEFAULT_INPUT_VALUES.pace;
      if (preparedInput.theme.length === 0)
        preparedInput.theme = DEFAULT_INPUT_VALUES.theme;
      if (preparedInput.hasMustVisitPlaces === undefined) {
        preparedInput.hasMustVisitPlaces =
          (preparedInput.mustVisitPlaces?.length ?? 0) > 0;
      }

      // Store input for later use
      inputRef.current = preparedInput;

      // Reset generation state and start outline generation
      setGenerationState({
        ...initialGenerationState,
        phase: "generating_outline",
        dayStatuses: new Map(),
        completedDays: [],
      });
      setErrorMessage("");
      setLimitExceeded(null);

      try {
        // Generate outline via SSE for real-time progress
        resetProgress();
        const outlineResponse = await generateOutlineStream(preparedInput, {
          isRetry: generationState.phase === 'error',
        });

        // Handle limit exceeded
        if (!outlineResponse.success && outlineResponse.limitExceeded) {
          setGenerationState((prev) => ({ ...prev, phase: "idle" }));
          setLimitExceeded({
            userType: outlineResponse.userType || "anonymous",
            resetAt: outlineResponse.resetAt
              ? new Date(outlineResponse.resetAt)
              : null,
            remaining: outlineResponse.remaining,
          });
          return;
        }

        if (!outlineResponse.success || !outlineResponse.data) {
          throw new Error(
            outlineResponse.message || "プラン概要の作成に失敗しました。"
          );
        }

        const {
          outline,
          context,
          input: updatedInput,
          heroImage,
          modelInfo,
        } = outlineResponse.data;

        // Store context for chunk generation
        contextRef.current = context;

        // Update input if destination was decided by AI
        if (preparedInput.isDestinationDecided === false) {
          inputRef.current = updatedInput;
        }

        // Calculate total days
        let totalDays = extractDuration(updatedInput.dates);
        if (totalDays === 0 && outline.days.length > 0) {
          totalDays = outline.days.length;
        }

        // Initialize day statuses as pending
        const initialDayStatuses = new Map<number, DayGenerationStatus>();
        for (let d = 1; d <= totalDays; d++) {
          initialDayStatuses.set(d, "pending");
        }

        // Split into chunks
        const chunks = splitDaysIntoChunks(totalDays);

        if (streamingMode) {
          // Streaming mode: Show outline first, allow review
          setGenerationState({
            phase: "outline_ready",
            outline,
            heroImage: heroImage || null,
            updatedInput,
            context,
            dayStatuses: initialDayStatuses,
            completedDays: [],
            totalDays,
            currentChunks: chunks,
            modelInfo,
          });

          // Immediately start detail generation in streaming mode
          setGenerationState((prev) => ({ ...prev, phase: "generating_details" }));

          // Generate first chunk sequentially with destination context,
          // then generate remaining chunks in parallel
          const [firstChunk, ...remainingChunks] = chunks;

          await generateChunk(
            updatedInput, context, outline.days, firstChunk, outline.days, outline.destination
          );

          if (remainingChunks.length > 0) {
            const remainingPromises = remainingChunks.map((chunk) =>
              generateChunk(updatedInput, context, outline.days, chunk, outline.days)
            );
            await Promise.all(remainingPromises);
          }
        } else {
          // Non-streaming mode: Generate all, then show review
          setGenerationState({
            phase: "outline_ready",
            outline,
            heroImage: heroImage || null,
            updatedInput,
            context,
            dayStatuses: initialDayStatuses,
            completedDays: [],
            totalDays,
            currentChunks: chunks,
            modelInfo,
          });
        }
      } catch (e: unknown) {
        console.error(e);
        const rawMsg = e instanceof Error ? e.message : null;

        // Detect timeout/network errors from Server Actions
        let msg: string;
        if (rawMsg && (rawMsg.includes("unexpected response") || rawMsg.includes("Failed to fetch") || rawMsg.includes("AbortError") || rawMsg.includes("NEXT_SERVER_ACTION"))) {
          msg = "サーバーとの通信がタイムアウトしました。もう一度お試しください。";
        } else {
          msg = rawMsg || "ネットワークエラーまたはサーバータイムアウトが発生しました。";
        }

        if (rawMsg && rawMsg.includes("Server Action") && rawMsg.includes("not found")) {
          setGenerationState((prev) => ({
            ...prev,
            phase: "error",
            error: "DEPLOYMENT_UPDATE_ERROR",
            errorType: "network",
          }));
          setErrorMessage("DEPLOYMENT_UPDATE_ERROR");
        } else {
          setGenerationState((prev) => ({
            ...prev,
            phase: "error",
            error: msg,
            errorType: "outline",
          }));
          setErrorMessage(msg);
        }
      }
    },
    [streamingMode, generateChunk, generationState.phase, generateOutlineStream, resetProgress]
  );

  // ========================================
  // Proceed from outline review to details
  // ========================================
  const proceedToDetails = useCallback(
    async (confirmedOutline: PlanOutline) => {
      const input = inputRef.current;
      const context = contextRef.current;

      if (!input) {
        console.error("No input available for details generation");
        return;
      }

      setGenerationState((prev) => ({
        ...prev,
        phase: "generating_details",
        outline: confirmedOutline,
      }));

      try {
        let totalDays = extractDuration(input.dates);
        if (totalDays === 0 && confirmedOutline.days.length > 0) {
          totalDays = confirmedOutline.days.length;
        }

        const chunks = splitDaysIntoChunks(totalDays);

        // Generate first chunk sequentially with destination context,
        // then generate remaining chunks in parallel
        const [firstChunk, ...remainingChunks] = chunks;

        await generateChunk(
          input, context, confirmedOutline.days, firstChunk,
          confirmedOutline.days, confirmedOutline.destination
        );

        if (remainingChunks.length > 0) {
          const remainingPromises = remainingChunks.map((chunk) =>
            generateChunk(
              input, context, confirmedOutline.days, chunk, confirmedOutline.days
            )
          );
          await Promise.all(remainingPromises);
        }
      } catch (e: unknown) {
        console.error(e);
        const errMsg = (e instanceof Error ? e.message : null) || "詳細プランの生成に失敗しました。";
        setGenerationState((prev) => ({
          ...prev,
          phase: "error",
          error: errMsg,
          errorType: "chunk",
        }));
        setErrorMessage(errMsg);
      }
    },
    [generateChunk]
  );

  // ========================================
  // Retry a failed chunk
  // ========================================
  const retryChunk = useCallback(
    async (dayStart: number, dayEnd: number) => {
      const { updatedInput, context, outline } = generationState;
      const input = updatedInput || inputRef.current;

      if (!input || !context || !outline) {
        console.error("Cannot retry chunk without necessary context");
        return;
      }

      const chunk: ChunkInfo = { start: dayStart, end: dayEnd };
      // Pass destination for first chunk retries
      const destination = dayStart === 1 ? outline.destination : undefined;
      await generateChunk(input, context, outline.days, chunk, outline.days, destination);
    },
    [generationState, generateChunk]
  );

  // ========================================
  // Reset state
  // ========================================
  const reset = useCallback(() => {
    setGenerationState(initialGenerationState);
    setErrorMessage("");
    setLimitExceeded(null);
    inputRef.current = null;
    contextRef.current = [];
    chunkPromisesRef.current.clear();
  }, []);

  // ========================================
  // Clear limit exceeded
  // ========================================
  const clearLimitExceeded = useCallback(() => {
    setLimitExceeded(null);
  }, []);

  // ========================================
  // Computed values
  // ========================================
  const isGenerating =
    generationState.phase === "generating_outline" ||
    generationState.phase === "generating_details";

  const isReviewingOutline =
    generationState.phase === "outline_ready" && !streamingMode;

  const isCompleted = generationState.phase === "completed";

  return {
    generationState,
    generatePlan,
    proceedToDetails,
    retryChunk,
    reset,
    limitExceeded,
    errorMessage,
    clearLimitExceeded,
    isGenerating,
    isReviewingOutline,
    isCompleted,
    progressSteps,
    progressCurrentStep,
  };
}

export default usePlanGeneration;
