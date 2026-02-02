"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserInput, Itinerary, DayPlan, GenerationState, initialGenerationState } from '@/types';
import type { DayGenerationStatus, ChunkInfo } from '@/types';
import { splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import { generatePlanOutline, generatePlanChunk, savePlan } from "@/app/actions/travel-planner";
import { getSamplePlanById } from "@/lib/sample-plans";
import { saveLocalPlan } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import OutlineLoadingAnimation from "@/components/features/planner/OutlineLoadingAnimation";
import OutlineReview from "@/components/features/planner/OutlineReview";
import StreamingResultView from "@/components/features/planner/StreamingResultView";
import { PlanModal } from "@/components/common";
import { FAQSection, ExampleSection } from "@/components/features/landing";
import { FaPlus } from "react-icons/fa6";
import { PlanOutline } from "@/types";

function PlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const sampleId = searchParams.get("sample");
  const legacyQ = searchParams.get("q");
  const mode = searchParams.get("mode");

  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<
    "loading" | "generating" | "saving" | "error"
  >("loading");
  const [currentInput, setCurrentInput] = useState<UserInput | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>(initialGenerationState);

  const hasStartedGeneration = useRef(false);

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
      const newCompletedDays = [...prev.completedDays, ...days];
      newCompletedDays.sort((a, b) => a.day - b.day);
      return { ...prev, completedDays: newCompletedDays };
    });
  }, []);

  // Generate a single chunk
  const generateChunk = useCallback(async (
    chunkInput: UserInput,
    context: any[],
    outlineDays: any[],
    chunk: ChunkInfo,
    allOutlineDays: any[]
  ) => {
    // Mark days as generating
    for (let d = chunk.start; d <= chunk.end; d++) {
      updateDayStatus(d, 'generating');
    }

    // Determine start location from previous day
    let previousOvernightLocation: string | undefined = undefined;
    if (chunk.start > 1) {
      const prevDay = allOutlineDays.find((d: any) => d.day === chunk.start - 1);
      if (prevDay) {
        previousOvernightLocation = prevDay.overnight_location;
      }
    }

    try {
      const chunkOutlineDays = outlineDays.filter(d => d.day >= chunk.start && d.day <= chunk.end);
      const result = await generatePlanChunk(
        chunkInput,
        context,
        chunkOutlineDays,
        chunk.start,
        chunk.end,
        previousOvernightLocation
      );

      if (result.success && result.data) {
        for (const day of result.data) {
          updateDayStatus(day.day, 'completed');
        }
        addCompletedDays(result.data);
      } else {
        for (let d = chunk.start; d <= chunk.end; d++) {
          updateDayStatus(d, 'error');
        }
      }
    } catch (err) {
      console.error(`Chunk ${chunk.start}-${chunk.end} failed:`, err);
      for (let d = chunk.start; d <= chunk.end; d++) {
        updateDayStatus(d, 'error');
      }
    }
  }, [updateDayStatus, addCompletedDays]);

  // Start Detail Generation (Loop through chunks)
  const startDetailGeneration = useCallback(async (
    outline: any,
    updatedInput: UserInput,
    context: any[]
  ) => {
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

    // Generate all chunks in parallel
    const chunkPromises = chunks.map(chunk =>
      generateChunk(updatedInput, context, outline.days, chunk, outline.days)
    );

    try {
      await Promise.all(chunkPromises);
    } catch (e) {
      console.error("Detail generation error:", e);
      setStatus("error");
      setError("詳細プランの生成中にエラーが発生しました。");
    }
  }, [generateChunk]);

  // Save completed plan
  const saveCompletedPlan = useCallback(async (isAuth: boolean) => {
    const { outline, heroImage, completedDays, context, updatedInput } = generationState;

    if (!outline || !updatedInput || completedDays.length === 0) {
      return;
    }

    setStatus("saving");

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
      if (isAuth) {
        const saveResult = await savePlan(updatedInput, finalPlan, false);
        if (saveResult.success && saveResult.shareCode) {
          router.replace(`/plan/${saveResult.shareCode}`);
        } else {
          console.error("Failed to save to DB, falling back to local storage:", saveResult.error);
          const localPlan = await saveLocalPlan(updatedInput, finalPlan);
          router.replace(`/plan/local/${localPlan.id}`);
        }
      } else {
        const localPlan = await saveLocalPlan(updatedInput, finalPlan);
        router.replace(`/plan/local/${localPlan.id}`);
      }
    } catch (err) {
      console.error("Failed to save plan:", err);
      setStatus("error");
      setError("プランの保存に失敗しました。");
    }
  }, [generationState, router]);

  // Watch for completion
  useEffect(() => {
    const { phase, completedDays, totalDays } = generationState;

    if (phase === 'generating_details' && totalDays > 0 && completedDays.length === totalDays) {
      setGenerationState(prev => ({ ...prev, phase: 'completed' }));
    }
  }, [generationState.completedDays.length, generationState.totalDays, generationState.phase]);

  // Auto-save when completed
  useEffect(() => {
    if (generationState.phase === 'completed') {
      saveCompletedPlan(isAuthenticated);
    }
  }, [generationState.phase, saveCompletedPlan, isAuthenticated]);

  // Generate plan from sample with streaming
  const generateFromSample = useCallback(async (sampleInput: UserInput, isAuth: boolean) => {
    setStatus("generating");
    setError("");
    setCurrentInput(sampleInput);

    // Start outline generation
    setGenerationState({
      ...initialGenerationState,
      phase: 'generating_outline',
      dayStatuses: new Map(),
      completedDays: [],
    });

    try {
      // Step 1: Generate Master Outline
      const outlineResponse = await generatePlanOutline(sampleInput);

      if (!outlineResponse.success || !outlineResponse.data) {
        throw new Error(outlineResponse.message || "プラン概要の作成に失敗しました。");
      }

      const { outline, context, input: updatedInput, heroImage } = outlineResponse.data;

      // Update state to show outline (skip direct detail generation here, call startDetailGeneration instead)
      // Actually we want streaming immediately for sample

      setGenerationState({
        phase: 'outline_ready',
        outline,
        heroImage: heroImage || null,
        updatedInput,
        context,
        dayStatuses: new Map(), // Will be reset in startDetailGeneration
        completedDays: [],
        totalDays: 0, // Will be set in startDetailGeneration
      });

      // Step 2: Generate Details
      await startDetailGeneration(outline, updatedInput, context);

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
  }, [startDetailGeneration]);

  // Handler to retry a failed chunk
  const handleRetryChunk = useCallback(async (dayStart: number, dayEnd: number) => {
    const { updatedInput, context, outline } = generationState;
    if (!updatedInput || !context || !outline) return;

    const chunk: ChunkInfo = { start: dayStart, end: dayEnd };
    await generateChunk(updatedInput, context, outline.days, chunk, outline.days);
  }, [generationState, generateChunk]);

  // Proceed from outline review to details
  const handleProceedToDetails = useCallback(async (confirmedOutline: PlanOutline) => {
    const { updatedInput, context } = generationState;
    if (!updatedInput || !context) return;

    setGenerationState(prev => ({ ...prev, outline: confirmedOutline }));
    await startDetailGeneration(confirmedOutline, updatedInput, context);
  }, [generationState, startDetailGeneration]);

  useEffect(() => {
    // Wait for auth state to be determined
    if (authLoading) return;

    // Handle Outline Mode (from redirection)
    if (mode === 'outline' && !hasStartedGeneration.current) {
      const storedState = localStorage.getItem("tabidea_outline_state");
      if (storedState) {
        try {
          const { outline, context, input, heroImage } = JSON.parse(storedState);
          // Restore state
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
          hasStartedGeneration.current = true;

          // Clear localStorage to prevent reuse? Maybe keep it for refresh safety
          // localStorage.removeItem("tabidea_outline_state");
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
        generateFromSample(sampleInput, isAuthenticated);
      } else {
        setError("指定されたサンプルプランが見つかりませんでした。");
        setStatus("error");
      }
    } else if (!sampleId && !legacyQ && !mode) {
      // No parameters - redirect to home
      router.replace("/");
    }
  }, [authLoading, sampleId, legacyQ, mode, isAuthenticated, router, generateFromSample]);

  if (status === "loading" || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Show outline loading animation during outline generation
  if (generationState.phase === 'generating_outline') {
    return <OutlineLoadingAnimation />;
  }

  // Show Outline Review
  if (generationState.phase === 'outline_ready' && generationState.outline) {
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
      <main className="flex-1 w-full flex flex-col items-center overflow-x-clip">
        {/* Title Section - Matches the aesthetic of the app */}
        <div className="w-full pt-32 pb-8 text-center px-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-block mb-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase">
            Generating
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800 tracking-tight">
            旅行プラン作成中
          </h1>
          <p className="text-stone-500 mt-3 font-hand text-lg">
            あなただけの特別な旅のしおりを作成しています
          </p>
        </div>

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
