"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserInput, Itinerary, DayPlan, GenerationState, initialGenerationState } from '@/types';
import type { DayGenerationStatus, ChunkInfo, Article, PlanOutlineDay } from '@/types';
import { splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import { generatePlanOutline, generatePlanChunk, savePlan } from "@/app/actions/travel-planner";
import { saveLocalPlan, notifyPlanChange } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useUserPlans } from "@/context/UserPlansContext";
import StepContainer from "./StepContainer";
import OutlineLoadingAnimation from "./OutlineLoadingAnimation";
import StreamingResultView from "./StreamingResultView";
import StepDestination from "./steps/StepDestination";
import StepDates from "./steps/StepDates";
import StepCompanions from "./steps/StepCompanions";
import StepThemes from "./steps/StepThemes";
import StepFreeText from "./steps/StepFreeText";
import StepInitialChoice from "./steps/StepInitialChoice";
import StepRegion from "./steps/StepRegion";
import StepBudget from "./steps/StepBudget";
import StepTransit from "./steps/StepTransit";
import StepPace from "./steps/StepPace";
import StepPlaces from "./steps/StepPlaces";
import PlaneTransition from "./PlaneTransition";
import { LoginPromptModal } from "@/components/ui/LoginPromptModal";
import { LimitExceededModal } from "@/components/ui/LimitExceededModal";
import {
  restorePendingState,
  clearPendingState,
} from '@/lib/restore/pending-state';

interface TravelPlannerProps {
  initialInput?: UserInput | null;
  initialStep?: number;
  onClose?: () => void;
}

/**
 * TravelPlannerLegacy - 10-Step Wizard Interface
 *
 * This is the legacy 10-step wizard interface for the travel planner.
 * It's kept for backward compatibility with existing code that relies on
 * step-based navigation (initialStep prop).
 *
 * For new implementations, use TravelPlanner (default export from index.tsx)
 * which provides a simplified 3-phase input flow.
 *
 * @deprecated Use the new 3-phase TravelPlanner instead
 */
export default function TravelPlannerLegacy({ initialInput, initialStep, onClose }: TravelPlannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { refreshPlans } = useUserPlans();

  // 復元フラグをチェック
  const shouldRestore = searchParams.get('restore') === 'true';

  const [step, setStep] = useState(initialStep ?? 0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [input, setInput] = useState<UserInput>(() => {
    if (initialInput) {
      const merged = { ...initialInput };
      // Ensure consistency: If destinations exist, it must be decided
      if (merged.destinations && merged.destinations.length > 0 && !merged.isDestinationDecided) {
         merged.isDestinationDecided = true;
      }
      return merged;
    }
    return {
      destinations: [],
      isDestinationDecided: undefined,
      region: "",
      dates: "時期は未定",
      companions: "",
      theme: [],
      budget: "",
      pace: "",
      freeText: "",
      travelVibe: "",
      mustVisitPlaces: [],
      hasMustVisitPlaces: undefined,
    };
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "updating" | "complete" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Streaming generation state
  const [generationState, setGenerationState] = useState<GenerationState>(initialGenerationState);
  const chunkPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

  // 利用制限関連のステート
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLimitExceeded, setShowLimitExceeded] = useState(false);
  const [limitResetAt, setLimitResetAt] = useState<Date | null>(null);
  const [userType, setUserType] = useState<string>('anonymous');

  // 復元関連のステート
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [loginPromptProps, setLoginPromptProps] = useState<{
    userInput?: UserInput;
    currentStep?: number;
    isInModal?: boolean;
  }>({});

  // ★ 状態復元
  useEffect(() => {
    if (!shouldRestore) return;

    const result = restorePendingState();

    if (result.expired) {
      // 期限切れ通知
      setShowExpiredNotice(true);
      // URLからパラメータを削除
      const url = new URL(window.location.href);
      url.searchParams.delete('restore');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (result.success && result.data && result.data.restoreType === 'wizard') {
      // 状態を復元
      setInput(result.data.userInput);
      setStep(result.data.currentStep);
      setShowRestoredNotice(true);

      // ローカルストレージをクリア
      clearPendingState();

      // URLからパラメータを削除
      const url = new URL(window.location.href);
      url.searchParams.delete('restore');
      window.history.replaceState({}, '', url.toString());
    }
  }, [shouldRestore]);

  // Check if all required inputs are filled (for showing "Generate" button from any step)
  const isAllInputsComplete = (): boolean => {
    // Step 0: Initial choice
    if (input.isDestinationDecided === undefined) return false;

    // Step 1: Destinations or Region
    if (input.isDestinationDecided) {
      if (input.destinations.length === 0) return false;
    } else {
      if (!input.region && !input.travelVibe?.trim()) return false;
    }

    // Step 2: Must-visit places
    if (input.hasMustVisitPlaces === undefined) return false;
    if (input.hasMustVisitPlaces === true && (!input.mustVisitPlaces || input.mustVisitPlaces.length === 0)) return false;

    // Step 3: Companions
    if (!input.companions) return false;

    // Step 4: Themes
    if (input.theme.length === 0) return false;

    // Step 5: Budget
    if (!input.budget) return false;

    // Step 6: Dates
    if (!input.dates) return false;

    // Step 7: Transit (optional)

    // Step 8: Pace
    if (!input.pace) return false;

    // Step 9: FreeText (optional, no check needed)

    return true;
  };

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 0: // Initial Choice
        if (input.isDestinationDecided === undefined) {
           // This shouldn't happen as UI forces choice, but safety check
           return false;
        }
        break;
      case 1: // Destinations or Region
        if (input.isDestinationDecided) {
          if (input.destinations.length === 0) {
            setErrorMessage("行き先を少なくとも1つ入力してください ✈️");
            return false;
          }
        } else {
          // If no region selected, but user typed a vibe, that's acceptable.
          if (!input.region && !input.travelVibe?.trim()) {
            setErrorMessage("エリアを選択するか、希望の雰囲気を入力してください 🌏");
            return false;
          }
        }
        break;
      case 2: // Must-Visit Places
        if (input.hasMustVisitPlaces === undefined) {
          setErrorMessage("あるか、ないかを選択してください 🤔");
          return false;
        }
        if (input.hasMustVisitPlaces === true && (!input.mustVisitPlaces || input.mustVisitPlaces.length === 0)) {
           // If they said Yes but didn't add anything, that's confusing.
           // Let's require at least one place if "Yes" is selected.
           setErrorMessage("行きたい場所を入力してください ✍️");
           return false;
        }
        break;
      case 3: // Companions
        if (!input.companions) {
          setErrorMessage("誰との旅行か選択してください 👥");
          return false;
        }
        break;
      case 4: // Themes
        if (input.theme.length === 0) {
          setErrorMessage("テーマを少なくとも1つ選択してください 🎭");
          return false;
        }
        break;
      case 5: // Budget
        if (!input.budget) {
          setErrorMessage("予算感を選択してください 💰");
          return false;
        }
        break;
      case 6: // Dates
        // Dates are technically optional or flexible, but if something entered check it?
        // StepDates logic handles "flexible" internally.
        if (!input.dates) {
          // If completely empty, maybe default or warn?
          // Let's assume StepDates sets a default or handles "flexible".
          // If flexible toggle is on, input.dates is set to "時期は未定..."
          // So just check if it's empty string
          setErrorMessage("日程または時期を選択してください 📅");
          return false;
        }
        break;
      case 7: // Transit (Optional)
        break;
      case 8: // Pace
         if (!input.pace) {
          setErrorMessage("旅行のペースを選択してください ⚡");
          return false;
        }
        break;
      case 9: // FreeText (Optional)
        break;
    }
    return true;
  };

  const handleNext = () => {
    // If proceeding from Step 1 (Undecided) and no region is selected but vibe is present, default region to 'anywhere'
    if (step === 1 && input.isDestinationDecided === false) {
       if (!input.region && input.travelVibe?.trim()) {
           // We need to ensure region is set before or during the next step transition
           // Since setState is async, we can update it here but validateStep checks current state.
           // However, we just passed validateStep check (if implemented correctly above).
           // To be safe, let's update it.
           setInput(prev => ({ ...prev, region: "anywhere" }));
       }
    }

    if (validateStep(step)) {
      setErrorMessage("");
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage("");
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleInitialChoice = (decided: boolean) => {
    setInput(prev => ({ ...prev, isDestinationDecided: decided }));
    // Clear potentially conflicting fields if switching
    if (decided) {
      setInput(prev => ({ ...prev, isDestinationDecided: true, region: "" }));
    } else {
      setInput(prev => ({ ...prev, isDestinationDecided: false, destinations: [] }));
    }

    // Trigger transition animation
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setStep(1);
    }, 700); // Wait for most of the animation to play before switching view
  };

  // Helper to update day status in generationState
  const updateDayStatus = useCallback((dayNumber: number, status: DayGenerationStatus) => {
    setGenerationState(prev => {
      const newStatuses = new Map(prev.dayStatuses);
      newStatuses.set(dayNumber, status);
      return { ...prev, dayStatuses: newStatuses };
    });
  }, []);

  // Helper to add completed days
  const addCompletedDays = useCallback((days: DayPlan[]) => {
    setGenerationState(prev => {
      const newCompletedDays = [...prev.completedDays, ...days];
      // Sort by day number
      newCompletedDays.sort((a, b) => a.day - b.day);
      return { ...prev, completedDays: newCompletedDays };
    });
  }, []);

  // Generate a single chunk and update state
  const generateChunk = useCallback(async (
    chunkInput: UserInput,
    context: Article[],
    outlineDays: PlanOutlineDay[],
    chunk: ChunkInfo,
    allOutlineDays: PlanOutlineDay[]
  ) => {
    // Mark days as generating
    for (let d = chunk.start; d <= chunk.end; d++) {
      updateDayStatus(d, 'generating');
    }

    // Determine start location from previous day
    let previousOvernightLocation: string | undefined = undefined;
    if (chunk.start > 1) {
      const prevDay = allOutlineDays.find((d) => d.day === chunk.start - 1);
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
        // Mark days as completed and add them
        for (const day of result.data) {
          updateDayStatus(day.day, 'completed');
        }
        addCompletedDays(result.data);
      } else {
        // Mark days as error
        for (let d = chunk.start; d <= chunk.end; d++) {
          updateDayStatus(d, 'error');
        }
      }
    } catch (error) {
      console.error(`Chunk ${chunk.start}-${chunk.end} failed:`, error);
      for (let d = chunk.start; d <= chunk.end; d++) {
        updateDayStatus(d, 'error');
      }
    }
  }, [updateDayStatus, addCompletedDays]);

  // Save the completed plan
  const saveCompletedPlan = useCallback(async () => {
    const { outline, heroImage, completedDays, context, updatedInput } = generationState;

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
      references: (context || []).map(c => ({
        title: c.title,
        url: c.url,
        image: c.imageUrl,
        snippet: c.snippet
      }))
    };

    try {
      if (isAuthenticated) {
        const saveResult = await savePlan(updatedInput, finalPlan, false);
        if (saveResult.success && saveResult.shareCode) {
          await refreshPlans();
          router.push(`/plan/${saveResult.shareCode}`);
        } else {
          console.error("Failed to save to DB, falling back to local storage:", saveResult.error);
          const localPlan = await saveLocalPlan(updatedInput, finalPlan);
          notifyPlanChange();
          router.push(`/plan/local/${localPlan.id}`);
        }
      } else {
        const localPlan = await saveLocalPlan(updatedInput, finalPlan);
        notifyPlanChange();
        router.push(`/plan/local/${localPlan.id}`);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to save plan:", error);
      setGenerationState(prev => ({
        ...prev,
        phase: 'error',
        error: 'プランの保存に失敗しました。',
        errorType: 'save'
      }));
    }
  }, [generationState, isAuthenticated, refreshPlans, router, onClose]);

  // Watch for completion and auto-save
  useEffect(() => {
    const { phase, completedDays, totalDays } = generationState;

    if (phase === 'generating_details' && totalDays > 0 && completedDays.length === totalDays) {
      // All days completed, mark as complete and save
      setGenerationState(prev => ({ ...prev, phase: 'completed' }));
    }
  }, [generationState.completedDays.length, generationState.totalDays, generationState.phase]);

  // Auto-save when completed
  useEffect(() => {
    if (generationState.phase === 'completed') {
      saveCompletedPlan();
    }
  }, [generationState.phase, saveCompletedPlan]);

  const handlePlan = async () => {
    if (!validateStep(step)) return;

    // Reset generation state and start outline generation
    setGenerationState({
      ...initialGenerationState,
      phase: 'generating_outline',
      dayStatuses: new Map(),
      completedDays: [],
    });
    setErrorMessage("");

    try {
      // Step 1: Generate Master Outline
      const outlineResponse = await generatePlanOutline(input);

      // 利用制限超過のハンドリング
      if (!outlineResponse.success && outlineResponse.limitExceeded) {
        setGenerationState(prev => ({ ...prev, phase: 'idle' }));
        setUserType(outlineResponse.userType || 'anonymous');

        if (outlineResponse.userType === 'anonymous') {
          setLoginPromptProps({
            userInput: input,
            currentStep: 8,
            isInModal: false,
          });
          setShowLoginPrompt(true);
        } else {
          setLimitResetAt(
            outlineResponse.resetAt ? new Date(outlineResponse.resetAt) : null
          );
          setShowLimitExceeded(true);
        }
        return;
      }

      if (!outlineResponse.success || !outlineResponse.data) {
        throw new Error(outlineResponse.message || "プラン概要の作成に失敗しました。");
      }

      const { outline, context, input: updatedInput, heroImage } = outlineResponse.data;

      // Update local input if destination was decided
      if (input.isDestinationDecided === false) {
        setInput(updatedInput);
      }

      // Calculate total days
      let totalDays = extractDuration(updatedInput.dates);
      if (totalDays === 0 && outline.days.length > 0) {
        totalDays = outline.days.length;
      }

      // Initialize day statuses as pending
      const initialDayStatuses = new Map<number, DayGenerationStatus>();
      for (let d = 1; d <= totalDays; d++) {
        initialDayStatuses.set(d, 'pending');
      }

      // Split into chunks
      const chunks = splitDaysIntoChunks(totalDays);

      // Update state to show outline and transition to streaming view
      setGenerationState({
        phase: 'outline_ready',
        outline,
        heroImage: heroImage || null,
        updatedInput,
        context,
        dayStatuses: initialDayStatuses,
        completedDays: [],
        totalDays,
        currentChunks: chunks,
      });

      // Immediately start detail generation
      setGenerationState(prev => ({ ...prev, phase: 'generating_details' }));

      // Start all chunk generations in parallel
      const chunkPromises = chunks.map(chunk =>
        generateChunk(updatedInput, context, outline.days, chunk, outline.days)
      );

      // Wait for all chunks (they update state as they complete)
      await Promise.all(chunkPromises);

    } catch (e: unknown) {
      console.error(e);
      const msg = (e instanceof Error ? e.message : null) || "ネットワークエラーまたはサーバータイムアウトが発生しました。";

      if (msg.includes("Server Action") && msg.includes("not found")) {
        setGenerationState(prev => ({
          ...prev,
          phase: 'error',
          error: "DEPLOYMENT_UPDATE_ERROR",
          errorType: 'network'
        }));
        setErrorMessage("DEPLOYMENT_UPDATE_ERROR");
      } else {
        setGenerationState(prev => ({
          ...prev,
          phase: 'error',
          error: msg,
          errorType: 'outline'
        }));
        setErrorMessage(msg);
      }
    }
  };

  // Handler to retry a failed chunk
  const handleRetryChunk = useCallback(async (dayStart: number, dayEnd: number) => {
    const { updatedInput, context, outline } = generationState;
    if (!updatedInput || !context || !outline) return;

    const chunk: ChunkInfo = { start: dayStart, end: dayEnd };
    await generateChunk(updatedInput, context, outline.days, chunk, outline.days);
  }, [generationState, generateChunk]);

  const handleJumpToStep = (targetStep: number) => {
    setErrorMessage("");
    setStep(targetStep);
  };

  // Show outline loading animation during outline generation
  if (generationState.phase === 'generating_outline') {
    return <OutlineLoadingAnimation />;
  }

  // Show streaming result view during/after detail generation
  if (
    generationState.phase === 'outline_ready' ||
    generationState.phase === 'generating_details' ||
    generationState.phase === 'completed'
  ) {
    return (
      <StreamingResultView
        generationState={generationState}
        input={generationState.updatedInput || input}
        onRetryChunk={handleRetryChunk}
      />
    );
  }

  // Show error state
  if (generationState.phase === 'error' || status === "error") {
    const isDeploymentError = errorMessage === "DEPLOYMENT_UPDATE_ERROR" || generationState.error === "DEPLOYMENT_UPDATE_ERROR";
    const displayMessage = isDeploymentError
        ? "新しいバージョンが公開されました。ページを更新して最新の状態にしてください。"
        : (generationState.error || errorMessage || "エラーが発生しました");

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">
          {displayMessage}
        </p>
        <button
          onClick={() => {
            if (isDeploymentError) {
                window.location.reload();
            } else {
                setErrorMessage("");
                setGenerationState(initialGenerationState);
                handlePlan();
            }
          }}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-bold"
        >
          {isDeploymentError ? "ページを更新" : "もう一度試す"}
        </button>
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

  // New Steps Mapping
  // 0: Initial Choice
  // 1: Destination OR Region
  // 2: Must-Visit Places
  // 3: Companions
  // 4: Themes
  // 5: Budget
  // 6: Dates
  // 7: Transit
  // 8: Pace
  // 9: FreeText
  const TOTAL_STEPS = 10;

  if (step === 0) {
    return (
      <>
        {isTransitioning && <PlaneTransition />}
        <StepInitialChoice onDecide={handleInitialChoice} />
      </>
    );
  }

  return (
    <>
      {/* 期限切れ通知 */}
      {showExpiredNotice && (
        <div className="fixed top-4 right-4 z-50 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-amber-800 text-sm font-medium">
                保存から24時間以上経過したため、入力内容は削除されました。
              </p>
            </div>
            <button
              onClick={() => setShowExpiredNotice(false)}
              className="text-amber-500 hover:text-amber-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 復元成功通知 */}
      {showRestoredNotice && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-green-800 text-sm font-medium">
                入力内容を復元しました
              </p>
            </div>
            <button
              onClick={() => setShowRestoredNotice(false)}
              className="text-green-500 hover:text-green-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <StepContainer
        step={step}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onNext={handleNext}
        onComplete={handlePlan}
        errorMessage={errorMessage}
        input={input}
        onJumpToStep={handleJumpToStep}
        widthClass={step === 9 ? "max-w-3xl" : "max-w-lg"}
        onClose={onClose}
        canComplete={isAllInputsComplete()}
      >
      {step === 1 && input.isDestinationDecided === true && (
        <StepDestination
          value={input.destinations}
          onChange={(val) => {
            setInput(prev => ({ ...prev, destinations: val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 1 && input.isDestinationDecided === false && (
        <StepRegion
          value={input.region}
          vibe={input.travelVibe}
          onChange={(val) => {
            setInput(prev => ({ ...prev, region: val }));
            setErrorMessage("");
          }}
          onVibeChange={(val) => {
            setInput(prev => ({ ...prev, travelVibe: val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 2 && (
        <StepPlaces
          mustVisitPlaces={input.mustVisitPlaces || []}
          onChange={(val) => {
            setInput(prev => ({ ...prev, mustVisitPlaces: val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          hasDecided={input.hasMustVisitPlaces}
          onDecisionChange={(val) => {
            setInput(prev => ({ ...prev, hasMustVisitPlaces: val }));
            setErrorMessage("");
          }}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 3 && (
        <StepCompanions
          value={input.companions}
          onChange={(val) => {
            setInput(prev => ({ ...prev, companions: val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 4 && (
        <StepThemes
          input={input}
          onChange={(val) => {
            setInput(prev => ({ ...prev, ...val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 5 && (
        <StepBudget
          value={input.budget}
          region={input.region}
          onChange={(val) => {
            setInput(prev => ({ ...prev, budget: val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 6 && (
         <StepDates
          input={input}
          onChange={(val) => {
            setInput(prev => ({ ...prev, ...val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 7 && (
         <StepTransit
          input={input}
          onChange={(val) => {
            setInput(prev => ({ ...prev, ...val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 8 && (
         <StepPace
          value={input.pace}
          onChange={(val) => {
            setInput(prev => ({ ...prev, pace: val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
          canComplete={isAllInputsComplete()}
          onComplete={handlePlan}
        />
      )}
      {step === 9 && (
        <StepFreeText
          value={input.freeText}
          onChange={(val) => {
            setInput(prev => ({ ...prev, freeText: val }));
            setErrorMessage("");
          }}
          onComplete={handlePlan}
        />
      )}

        {/* 利用制限モーダル */}
        <LoginPromptModal
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          userInput={loginPromptProps?.userInput}
          currentStep={loginPromptProps?.currentStep}
          isInModal={loginPromptProps?.isInModal}
        />
        <LimitExceededModal
          isOpen={showLimitExceeded}
          onClose={() => setShowLimitExceeded(false)}
          resetAt={limitResetAt}
          actionType="plan_generation"
        />
      </StepContainer>
    </>
  );
}
