"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserInput,
  Itinerary,
  DayPlan,
  PlanOutline,
  GenerationState,
  initialGenerationState,
} from "@/types";
import type { DayGenerationStatus, ChunkInfo, Article } from '@/types';
import { splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import { savePlan } from "@/app/actions/travel-planner";
import { getSamplePlanById } from "@/lib/sample-plans";
import { saveLocalPlan } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useGenerationProgress } from "@/lib/hooks/useGenerationProgress";
import { useDetailGenerationStream } from "@/lib/hooks/useDetailGenerationStream";
import OutlineLoadingAnimation from "@/components/features/planner/OutlineLoadingAnimation";
import OutlineReview from "@/components/features/planner/OutlineReview";
import StreamingResultView from "@/components/features/planner/StreamingResultView";
import { PlanModal } from "@/components/common";
import { FAQSection, ExampleSection } from "@/components/features/landing";
import { FaPlus } from "react-icons/fa6";

interface ChunkActionState {
  success: boolean;
  message?: string;
  data?: DayPlan[];
}

async function fetchChunkFromAPI(
  input: UserInput,
  context: Article[],
  outlineDays: PlanOutline["days"],
  startDay: number,
  endDay: number,
  previousOvernightLocation?: string
): Promise<ChunkActionState> {
  const response = await fetch("/api/generate/chunk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      context,
      outlineDays,
      startDay,
      endDay,
      previousOvernightLocation,
    }),
  });

  if (!response.ok) {
    return { success: false, message: `サーバーエラー (${response.status})` };
  }

  return response.json();
}

function PlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { steps: progressSteps, currentStep: progressCurrentStep, generateOutlineStream, resetProgress } = useGenerationProgress();
  const { streamDetailGeneration } = useDetailGenerationStream();
  const sampleId = searchParams.get("sample");
  const legacyQ = searchParams.get("q");
  const mode = searchParams.get("mode");

  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<
    "loading" | "generating" | "saving" | "error"
  >("loading");
  const [transitionMessage, setTransitionMessage] = useState<string>("");
  const [currentInput, setCurrentInput] = useState<UserInput | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>(initialGenerationState);

  const hasStartedGeneration = useRef(false);
  const hasStartedDetailStream = useRef(false);
  const hasStartedTransition = useRef(false);

  // Helper to update day status
  const updateDayStatus = useCallback((dayNumber: number, dayStatus: DayGenerationStatus) => {
    setGenerationState(prev => {
      const newStatuses = new Map(prev.dayStatuses);
      newStatuses.set(dayNumber, dayStatus);
      return { ...prev, dayStatuses: newStatuses };
    });
  }, []);

  // Helper to add completed days
  const addCompletedDays = useCallback((days: DayPlan[]) => {
    setGenerationState(prev => {
      const dayMap = new Map<number, DayPlan>(
        prev.completedDays.map((day) => [day.day, day])
      );
      for (const day of days) {
        dayMap.set(day.day, day);
      }
      const mergedDays = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
      return { ...prev, completedDays: mergedDays };
    });
  }, []);

  const updateChunkRangeStatus = useCallback(
    (chunk: ChunkInfo, status: DayGenerationStatus) => {
      for (let day = chunk.start; day <= chunk.end; day++) {
        updateDayStatus(day, status);
      }
    },
    [updateDayStatus]
  );

  // Start Detail Generation (Loop through chunks)
  const startDetailGeneration = useCallback(async (
    outline: PlanOutline,
    updatedInput: UserInput,
    context: Article[]
  ) => {
    if (hasStartedDetailStream.current) {
      return;
    }

    hasStartedDetailStream.current = true;

    // Calculate total days
    let totalDays = extractDuration(updatedInput.dates);
    if (totalDays === 0 && outline.days.length > 0) {
      totalDays = outline.days.length;
    }

    // Initialize day statuses
    const initialDayStatuses = new Map<number, DayGenerationStatus>();
    for (let d = 1; d <= totalDays; d++) {
      initialDayStatuses.set(d, 'pending');
    }

    const chunks = splitDaysIntoChunks(totalDays);

    // Update state to show chunks pending
    setGenerationState(prev => ({
      ...prev,
      phase: 'generating_details',
      dayStatuses: initialDayStatuses,
      totalDays,
      currentChunks: chunks,
    }));

    try {
      const result = await streamDetailGeneration(
        {
          input: updatedInput,
          context,
          outline,
        },
        {
          onChunkStart: (chunk) => {
            updateChunkRangeStatus(chunk, "generating");
          },
          onChunkComplete: (_chunk, days) => {
            if (!days.length) return;
            for (const day of days) {
              updateDayStatus(day.day, "completed");
            }
            addCompletedDays(days);
          },
          onChunkError: (chunk) => {
            updateChunkRangeStatus(chunk, "error");
          },
        }
      );

      if (!result.success) {
        throw new Error(result.message || "詳細プランのストリーミングに失敗しました。");
      }
    } catch (e) {
      console.error("Detail generation error:", e);
      setStatus("error");
      setError("詳細プランの生成中にエラーが発生しました。");
      setGenerationState((prev) => ({
        ...prev,
        phase: "error",
        error: "詳細プランの生成中にエラーが発生しました。",
      }));
    } finally {
      hasStartedDetailStream.current = false;
    }
  }, [addCompletedDays, streamDetailGeneration, updateChunkRangeStatus, updateDayStatus]);

  const persistOutlineAndRedirect = useCallback(
    (
      outline: PlanOutline,
      context: Article[],
      input: UserInput,
      heroImage: GenerationState["heroImage"]
    ) => {
      const stateToSave = {
        outline,
        context,
        input,
        heroImage: heroImage || null,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("tabidea_outline_state", JSON.stringify(stateToSave));
      router.replace("/plan?mode=outline");
    },
    [router]
  );

  // Save completed plan and transition to detail page quickly.
  // Always persist to local storage first, then let PlanLocalClient auto-sync for signed-in users.
  const saveCompletedPlan = useCallback(async () => {
    if (hasStartedTransition.current) {
      return;
    }

    const { outline, heroImage, completedDays, context, updatedInput } = generationState;

    if (!outline || !updatedInput || completedDays.length === 0) {
      return;
    }

    hasStartedTransition.current = true;
    setStatus("saving");
    setTransitionMessage("詳細プランの保存が完了し次第、すぐに詳細ページへ自動で移動します。");

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
      references: (context || []).map(c => ({
        title: c.title,
        url: c.url,
        image: c.imageUrl,
        snippet: c.snippet
      }))
    };

    try {
      const localPlan = await saveLocalPlan(updatedInput, finalPlan);
      router.replace(`/plan/local/${localPlan.id}`);
    } catch (localSaveErr) {
      console.error("Failed to save to local storage:", localSaveErr);

      // Fallback: for authenticated users, try direct DB save.
      if (isAuthenticated) {
        try {
          const saveResult = await savePlan(updatedInput, finalPlan, false);
          if (saveResult.success && saveResult.plan) {
            router.replace(`/plan/id/${saveResult.plan.id}`);
            return;
          }
        } catch (dbSaveErr) {
          console.error("Failed to save to DB fallback:", dbSaveErr);
        }
      }

      hasStartedTransition.current = false;
      setTransitionMessage("");
      setStatus("error");
      setError("プランの保存に失敗しました。");
    }
  }, [generationState, isAuthenticated, router]);

  const completedDaysCount = generationState.completedDays.length;
  const generationPhase = generationState.phase;
  const totalDays = generationState.totalDays;

  // Watch for completion
  useEffect(() => {
    if (
      generationPhase === "generating_details" &&
      totalDays > 0 &&
      completedDaysCount === totalDays
    ) {
      setGenerationState(prev => ({ ...prev, phase: 'completed' }));
      void saveCompletedPlan();
    }
  }, [completedDaysCount, generationPhase, totalDays, saveCompletedPlan]);

  // Generate plan from sample with streaming
  const generateFromSample = useCallback(async (sampleInput: UserInput) => {
    hasStartedTransition.current = false;
    setStatus("generating");
    setError("");
    setTransitionMessage("");
    setCurrentInput(sampleInput);

    // Start outline generation
    setGenerationState({
      ...initialGenerationState,
      phase: 'generating_outline',
      dayStatuses: new Map(),
      completedDays: [],
    });

    try {
      // Step 1: Generate Master Outline (with real-time SSE progress)
      resetProgress();
      const outlineResponse = await generateOutlineStream(sampleInput);

      if (!outlineResponse.success || !outlineResponse.data) {
        throw new Error(outlineResponse.message || "プラン概要の作成に失敗しました。");
      }

      const { outline, context, input: updatedInput, heroImage } = outlineResponse.data;
      persistOutlineAndRedirect(outline, context, updatedInput, heroImage || null);

    } catch (e: unknown) {
      console.error(e);
      setStatus("error");
      setGenerationState(prev => ({
        ...prev,
        phase: 'error',
        error: e instanceof Error ? e.message : "エラーが発生しました",
      }));
      setError(e instanceof Error ? e.message : "ネットワークエラーまたはサーバータイムアウトが発生しました。");
    }
  }, [generateOutlineStream, persistOutlineAndRedirect, resetProgress]);

  // Handler to retry a failed chunk
  const handleRetryChunk = useCallback(async (dayStart: number, dayEnd: number) => {
    const { updatedInput, context, outline } = generationState;
    if (!updatedInput || !context || !outline) return;

    const chunk: ChunkInfo = { start: dayStart, end: dayEnd };
    const previousOvernightLocation =
      dayStart === 1
        ? outline.destination
        : outline.days.find((day) => day.day === dayStart - 1)?.overnight_location;

    updateChunkRangeStatus(chunk, "generating");

    try {
      const chunkOutlineDays = outline.days.filter(
        (day) => day.day >= chunk.start && day.day <= chunk.end
      );
      const result = await fetchChunkFromAPI(
        updatedInput,
        context,
        chunkOutlineDays,
        chunk.start,
        chunk.end,
        previousOvernightLocation
      );

      if (result.success && result.data) {
        for (const day of result.data) {
          updateDayStatus(day.day, "completed");
        }
        addCompletedDays(result.data);
      } else {
        updateChunkRangeStatus(chunk, "error");
      }
    } catch (error) {
      console.error(`Retry chunk ${dayStart}-${dayEnd} failed:`, error);
      updateChunkRangeStatus(chunk, "error");
    }
  }, [addCompletedDays, generationState, updateChunkRangeStatus, updateDayStatus]);

  // Proceed from outline review to details
  const handleProceedToDetails = useCallback(async (confirmedOutline: PlanOutline) => {
    const { updatedInput, context, heroImage } = generationState;
    if (!updatedInput || !context) return;

    persistOutlineAndRedirect(
      confirmedOutline,
      context,
      updatedInput,
      heroImage || null
    );
  }, [generationState, persistOutlineAndRedirect]);

  useEffect(() => {
    // Wait for auth state to be determined
    if (authLoading) return;

    // Handle Outline Mode (from redirection)
    if (mode === 'outline' && !hasStartedGeneration.current) {
      const storedState = localStorage.getItem("tabidea_outline_state");
      if (storedState) {
        try {
          const { outline, context, input, heroImage } = JSON.parse(storedState);
          // Restore outline state first so user immediately sees summary content.
          setGenerationState({
            ...initialGenerationState,
            phase: 'outline_ready',
            outline,
            context,
            updatedInput: input,
            heroImage,
          });
          setCurrentInput(input);
          setStatus('generating'); // Use generating status to show UI
          setTransitionMessage("");
          hasStartedTransition.current = false;
          hasStartedGeneration.current = true;

          // Start detail streaming immediately after restoring outline.
          void startDetailGeneration(outline, input, context);
        } catch (e) {
          console.error("Failed to parse stored outline state", e);
          router.replace("/");
        }
      } else {
        router.replace("/");
      }
      return;
    }

    // Handle legacy q parameter - redirect to home with a message
    if (legacyQ && !sampleId) {
      // Old format URL - redirect to home
      router.replace("/");
      return;
    }

    // Handle sample generation
    if (sampleId && !hasStartedGeneration.current) {
      hasStartedGeneration.current = true;
      const samplePlan = getSamplePlanById(sampleId);
      if (samplePlan) {
        // Prepare input with default values for missing fields
        const sampleInput: UserInput = {
          ...samplePlan.input,
          hasMustVisitPlaces: samplePlan.input.hasMustVisitPlaces ?? false,
          mustVisitPlaces: samplePlan.input.mustVisitPlaces ?? [],
        };
        generateFromSample(sampleInput);
      } else {
        setError("指定されたサンプルプランが見つかりませんでした。");
        setStatus("error");
      }
    } else if (!sampleId && !legacyQ && !mode) {
      // No parameters - redirect to home
      router.replace("/");
    }
  }, [authLoading, sampleId, legacyQ, mode, router, generateFromSample, startDetailGeneration]);

  if (status === "loading" || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Show outline loading animation during outline generation (with real progress)
  if (generationState.phase === 'generating_outline') {
    return <OutlineLoadingAnimation steps={progressSteps} currentStep={progressCurrentStep} />;
  }

  // Show Outline Review
  if (generationState.phase === 'outline_ready' && generationState.outline) {
    if (mode === "outline") {
      return (
        <StreamingResultView
          generationState={generationState}
          input={generationState.updatedInput || currentInput || {
            destinations: [],
            region: "",
            dates: "",
            companions: "",
            theme: [],
            budget: "",
            pace: "",
            freeText: "",
          }}
          onRetryChunk={handleRetryChunk}
          isTransitioningToDetail={status === "saving"}
          transitionMessage={transitionMessage}
        />
      );
    }

    return (
      <OutlineReview
        outline={generationState.outline}
        onConfirm={handleProceedToDetails}
        isGenerating={false}
      />
    );
  }

  // Show streaming result view during/after detail generation
  if (
    generationState.phase === 'generating_details' ||
    generationState.phase === 'completed'
  ) {
    return (
        <StreamingResultView
          generationState={generationState}
          input={generationState.updatedInput || currentInput || {
          destinations: [],
          region: "",
          dates: "",
          companions: "",
          theme: [],
          budget: "",
          pace: "",
          freeText: "",
          }}
          onRetryChunk={handleRetryChunk}
          isTransitioningToDetail={status === "saving"}
          transitionMessage={transitionMessage}
        />
      );
  }

  if (status === "saving") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <p className="text-stone-600">プランを保存しています...</p>
      </div>
    );
  }

  if (status === "error" || generationState.phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">
          {error || generationState.error || "エラーが発生しました"}
        </p>
        {sampleId && (
          <button
            onClick={() => {
              hasStartedGeneration.current = false;
              setStatus("loading");
              setGenerationState(initialGenerationState);
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-bold"
          >
            もう一度試す
          </button>
        )}
        <Link
          href="/"
          className="px-4 py-2 text-stone-600 hover:text-primary transition-colors"
        >
          トップに戻る
        </Link>
        <p className="text-stone-600 text-sm mt-2">
          問題が解決しない場合は、
          <a
            href="/contact"
            className="text-primary hover:underline font-medium ml-1"
          >
            お問い合わせページ
          </a>
          からご連絡ください。
        </p>
      </div>
    );
  }

  // Default: should not reach here, redirect to home
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    </div>
  );
}

export default function PlanClient() {
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
      <main className="flex-1 w-full flex flex-col items-center overflow-x-clip pt-24 md:pt-28">

        <Suspense
          fallback={
            <div className="w-full max-w-2xl h-[500px] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            </div>
          }
        >
          <PlanContent />
        </Suspense>

        {/* Call to Action - Create New Plan */}
        {/* This button allows users to start a fresh planning session easily */}
        <div className="w-full flex justify-center pb-16 pt-8">
          <button
            onClick={() => setIsNewPlanModalOpen(true)}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-primary font-serif rounded-full hover:bg-primary/90 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <FaPlus className="mr-2 relative z-10" />
            <span className="relative z-10">新しいプランを作る</span>
          </button>
        </div>

        <ExampleSection />
        <FAQSection limit={5} />

        {/* New Plan Modal */}
        <PlanModal
          isOpen={isNewPlanModalOpen}
          onClose={() => setIsNewPlanModalOpen(false)}
          initialInput={null}
          initialStep={0}
        />
      </main>
    </div>
  );
}
