"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserInput, Itinerary, DayPlan, GenerationState, initialGenerationState } from '@/types';
import type { DayGenerationStatus, ChunkInfo, Article, PlanOutlineDay } from '@/types';
import { splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import { generatePlanChunk, savePlan } from "@/app/actions/travel-planner";
import { getSamplePlanById } from "@/lib/sample-plans";
import { saveLocalPlan } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useGenerationProgress } from "@/lib/hooks/useGenerationProgress";
import OutlineLoadingAnimation from "@/components/features/planner/OutlineLoadingAnimation";
import OutlineReview from "@/components/features/planner/OutlineReview";
import StreamingResultView from "@/components/features/planner/StreamingResultView";
import { PlanModal } from "@/components/common";
import { FAQSection, ExampleSection } from "@/components/features/landing";
import { FaPlus } from "react-icons/fa6";
import { PlanOutline } from "@/types";
import { localizeHref, resolveLanguageFromPathname } from "@/lib/i18n/navigation";

function PlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);
  const t = useTranslations("app.planner.plan");
  const tError = useTranslations("errors.ui.plan");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { steps: progressSteps, currentStep: progressCurrentStep, generateOutlineStream, resetProgress } = useGenerationProgress();
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
      const newCompletedDays = [...prev.completedDays, ...days];
      newCompletedDays.sort((a, b) => a.day - b.day);
      return { ...prev, completedDays: newCompletedDays };
    });
  }, []);

  // Generate a single chunk
  const generateChunk = useCallback(async (
    chunkInput: UserInput,
    context: Article[],
    outlineDays: PlanOutlineDay[],
    chunk: ChunkInfo,
    allOutlineDays: PlanOutlineDay[],
    destination?: string
  ) => {
    // Mark days as generating
    for (let d = chunk.start; d <= chunk.end; d++) {
      updateDayStatus(d, 'generating');
    }

    // Determine start location from previous day's outline overnight_location,
    // or use the destination for the first chunk so the AI knows where the traveler starts
    let previousOvernightLocation: string | undefined = undefined;
    if (chunk.start > 1) {
      const prevDay = allOutlineDays.find((d: PlanOutlineDay) => d.day === chunk.start - 1);
      if (prevDay) {
        previousOvernightLocation = prevDay.overnight_location;
      }
    } else if (destination) {
      // For chunk starting at day 1, use the destination as starting location context
      previousOvernightLocation = destination;
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
    outline: PlanOutline,
    updatedInput: UserInput,
    context: Article[]
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

    try {
      // Generate first chunk sequentially with destination context,
      // then generate remaining chunks in parallel.
      // This ensures day 1-2 gets proper starting location and reduces failures.
      const [firstChunk, ...remainingChunks] = chunks;

      // First chunk: pass destination as starting location
      await generateChunk(
        updatedInput, context, outline.days, firstChunk, outline.days, outline.destination
      );

      // Remaining chunks: generate in parallel (they use outline's overnight_location)
      if (remainingChunks.length > 0) {
        const remainingPromises = remainingChunks.map(chunk =>
          generateChunk(updatedInput, context, outline.days, chunk, outline.days)
        );
        await Promise.all(remainingPromises);
      }
    } catch (e) {
      console.error("Detail generation error:", e);
      setStatus("error");
      setError(tError("detailGenerationFailed"));
    }
  }, [generateChunk, tError]);

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
    setTransitionMessage(t("savingTransition"));

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
      router.replace(localizeHref(`/plan/local/${localPlan.id}`, language));
    } catch (localSaveErr) {
      console.error("Failed to save to local storage:", localSaveErr);

      // Fallback: for authenticated users, try direct DB save.
      if (isAuthenticated) {
        try {
          const saveResult = await savePlan(updatedInput, finalPlan, false);
          if (saveResult.success && saveResult.plan) {
            router.replace(localizeHref(`/plan/id/${saveResult.plan.id}`, language));
            return;
          }
        } catch (dbSaveErr) {
          console.error("Failed to save to DB fallback:", dbSaveErr);
        }
      }

      hasStartedTransition.current = false;
      setTransitionMessage("");
      setStatus("error");
      setError(tError("saveFailed"));
    }
  }, [generationState, isAuthenticated, language, router, t, tError]);

  // Watch for completion
  useEffect(() => {
    const { phase, completedDays, totalDays } = generationState;

    if (phase === 'generating_details' && totalDays > 0 && completedDays.length === totalDays) {
      setGenerationState(prev => ({ ...prev, phase: 'completed' }));
      void saveCompletedPlan();
    }
  }, [generationState.completedDays.length, generationState.totalDays, generationState.phase, saveCompletedPlan]);

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
        throw new Error(outlineResponse.message || tError("outlineFailed"));
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
        error: e instanceof Error ? e.message : tError("generic"),
      }));
      setError(e instanceof Error ? e.message : tError("timeout"));
    }
  }, [startDetailGeneration, generateOutlineStream, resetProgress, tError]);

  // Handler to retry a failed chunk
  const handleRetryChunk = useCallback(async (dayStart: number, dayEnd: number) => {
    const { updatedInput, context, outline } = generationState;
    if (!updatedInput || !context || !outline) return;

    const chunk: ChunkInfo = { start: dayStart, end: dayEnd };
    // Pass destination for first chunk retries
    const destination = dayStart === 1 ? outline.destination : undefined;
    await generateChunk(updatedInput, context, outline.days, chunk, outline.days, destination);
  }, [generationState, generateChunk]);

  // Proceed from outline review to details
  const handleProceedToDetails = useCallback(async (confirmedOutline: PlanOutline) => {
    const { updatedInput, context } = generationState;
    if (!updatedInput || !context) return;

    hasStartedTransition.current = false;
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
          // Restore state and start detail generation immediately (skip review)
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

          // Trigger detail generation immediately
          // This ensures we skip the manual confirmation step
          startDetailGeneration(outline, input, context);

          // Clear localStorage to prevent reuse? Maybe keep it for refresh safety
          // localStorage.removeItem("tabidea_outline_state");
        } catch (e) {
          console.error("Failed to parse stored outline state", e);
          router.replace(localizeHref("/", language));
        }
      } else {
        router.replace(localizeHref("/", language));
      }
      return;
    }

    // Handle legacy q parameter - redirect to home with a message
    if (legacyQ && !sampleId) {
      // Old format URL - redirect to home
      router.replace(localizeHref("/", language));
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
        setError(tError("sampleNotFound"));
        setStatus("error");
      }
    } else if (!sampleId && !legacyQ && !mode) {
      // No parameters - redirect to home
      router.replace(localizeHref("/", language));
    }
  }, [authLoading, sampleId, legacyQ, mode, router, generateFromSample, language, tError]);

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
        <p className="text-stone-600">{t("saving")}</p>
      </div>
    );
  }

  if (status === "error" || generationState.phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">
          {error || generationState.error || tError("generic")}
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
            {t("retry")}
          </button>
        )}
        <Link
          href={localizeHref("/", language)}
          className="px-4 py-2 text-stone-600 hover:text-primary transition-colors"
        >
          {t("backHome")}
        </Link>
        <p className="text-stone-600 text-sm mt-2">
          {t("contactPrefix")}
          <a
            href={localizeHref("/contact", language)}
            className="text-primary hover:underline font-medium ml-1"
          >
            {t("contact")}
          </a>
          {t("contactSuffix")}
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
  const t = useTranslations("app.planner.plan");

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
            <span className="relative z-10">
              {t("createNewPlan")}
            </span>
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
