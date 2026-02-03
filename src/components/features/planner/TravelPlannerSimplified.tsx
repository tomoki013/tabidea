"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UserInput, PlanOutline } from "@/types";
import { usePlanGeneration, useLimitModals } from "@/lib/hooks";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import OutlineLoadingAnimation from "./OutlineLoadingAnimation";
import OutlineReview from "./OutlineReview";
import StreamingResultView from "./StreamingResultView";
import { LoginPromptModal } from "@/components/ui/LoginPromptModal";
import { LimitExceededModal } from "@/components/ui/LimitExceededModal";
import {
  restorePendingState,
  clearPendingState,
} from "@/lib/restore/pending-state";

// ============================================================================
// Types
// ============================================================================

interface TravelPlannerSimplifiedProps {
  initialInput?: UserInput | null;
  onClose?: () => void;
  /** If true, show outline review before generating details */
  showOutlineReview?: boolean;
  isInModal?: boolean;
}

// ============================================================================
// Default Input
// ============================================================================

const DEFAULT_INPUT: UserInput = {
  destinations: [],
  isDestinationDecided: undefined,
  region: "",
  dates: "2泊3日",
  companions: "",
  theme: [],
  budget: "",
  pace: "",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: undefined,
};

// ============================================================================
// Component
// ============================================================================

export default function TravelPlannerSimplified({
  initialInput,
  onClose,
  showOutlineReview = true, // Force true to handle redirection after outline
  isInModal = false,
}: TravelPlannerSimplifiedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldRestore = searchParams.get("restore") === "true";

  // ========================================
  // User Input State
  // ========================================
  const [input, setInput] = useState<UserInput>(() => {
    if (initialInput) {
      const merged = { ...DEFAULT_INPUT, ...initialInput };
      if (
        merged.destinations &&
        merged.destinations.length > 0 &&
        !merged.isDestinationDecided
      ) {
        merged.isDestinationDecided = true;
      }
      return merged;
    }
    return DEFAULT_INPUT;
  });

  // ========================================
  // Plan Generation Hook
  // ========================================
  const {
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
  } = usePlanGeneration({
    onComplete: onClose,
    streamingMode: !showOutlineReview,
  });

  // ========================================
  // Handle Outline Ready -> Redirect
  // ========================================
  useEffect(() => {
    if (isReviewingOutline && generationState.outline) {
      // Save state to localStorage
      const stateToSave = {
        outline: generationState.outline,
        context: generationState.context,
        input: generationState.updatedInput || input,
        heroImage: generationState.heroImage,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("tabidea_outline_state", JSON.stringify(stateToSave));

      // Redirect to plan page with outline mode
      router.push("/plan?mode=outline");
    }
  }, [isReviewingOutline, generationState, input, router]);

  // ========================================
  // Limit Modals Hook
  // ========================================
  const {
    loginPrompt,
    limitExceeded: limitModal,
    showLoginPrompt,
    hideLoginPrompt,
    showLimitExceeded,
    hideLimitExceeded,
  } = useLimitModals();

  // ========================================
  // Restore State Notifications
  // ========================================
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  // ========================================
  // Handle Limit Exceeded
  // ========================================
  useEffect(() => {
    if (limitExceeded) {
      if (limitExceeded.userType === "anonymous") {
        showLoginPrompt({
          userInput: input,
          currentStep: 8,
          isInModal: isInModal,
        });
      } else {
        showLimitExceeded({
          resetAt: limitExceeded.resetAt,
          actionType: "plan_generation",
        });
      }
      clearLimitExceeded();
    }
  }, [
    limitExceeded,
    input,
    showLoginPrompt,
    showLimitExceeded,
    clearLimitExceeded,
  ]);

  // ========================================
  // Restore Saved State
  // ========================================
  useEffect(() => {
    if (!shouldRestore) return;

    // Use requestAnimationFrame to defer state updates
    // This avoids the "setState in effect" lint warning
    const frameId = requestAnimationFrame(() => {
      const result = restorePendingState();

      if (result.expired) {
        setShowExpiredNotice(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
        return;
      }

      if (
        result.success &&
        result.data &&
        result.data.restoreType === "wizard"
      ) {
        setInput(result.data.userInput);
        setShowRestoredNotice(true);
        clearPendingState();
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [shouldRestore]);

  // ========================================
  // Handlers
  // ========================================
  const handleChange = useCallback((update: Partial<UserInput>) => {
    setInput((prev) => ({ ...prev, ...update }));
  }, []);

  const handleGenerateOutline = useCallback(
    async (inputOverride?: UserInput) => {
      await generatePlan(inputOverride || input);
    },
    [generatePlan, input]
  );

  const handleProceedToDetails = useCallback(
    async (confirmedOutline: PlanOutline) => {
      await proceedToDetails(confirmedOutline);
    },
    [proceedToDetails]
  );

  const handleRetryChunk = useCallback(
    async (dayStart: number, dayEnd: number) => {
      await retryChunk(dayStart, dayEnd);
    },
    [retryChunk]
  );

  // ========================================
  // Render: Outline Loading
  // ========================================
  if (generationState.phase === "generating_outline") {
    return <OutlineLoadingAnimation />;
  }

  // ========================================
  // Render: Outline Review (if enabled)
  // ========================================
  if (isReviewingOutline && generationState.outline) {
    // Should redirecting, but show loading state just in case
    return <OutlineLoadingAnimation />;
  }

  // ========================================
  // Render: Streaming Result View
  // ========================================
  if (
    generationState.phase === "outline_ready" ||
    generationState.phase === "generating_details" ||
    generationState.phase === "completed"
  ) {
    return (
      <StreamingResultView
        generationState={generationState}
        input={generationState.updatedInput || input}
        onRetryChunk={handleRetryChunk}
      />
    );
  }

  // ========================================
  // Render: Error State
  // ========================================
  if (generationState.phase === "error") {
    const isDeploymentError =
      errorMessage === "DEPLOYMENT_UPDATE_ERROR" ||
      generationState.error === "DEPLOYMENT_UPDATE_ERROR";
    const displayMessage = isDeploymentError
      ? "新しいバージョンが公開されました。ページを更新して最新の状態にしてください。"
      : generationState.error || errorMessage || "エラーが発生しました";

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">{displayMessage}</p>
        <button
          onClick={() => {
            if (isDeploymentError) {
              window.location.reload();
            } else {
              reset();
              handleGenerateOutline();
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

  // ========================================
  // Render: Input Flow (Default)
  // ========================================
  return (
    <>
      {/* Expired Notice */}
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

      {/* Restored Notice */}
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

      {/* Input Flow */}
      <SimplifiedInputFlow
        input={input}
        onChange={handleChange}
        onGenerate={handleGenerateOutline}
        isGenerating={isGenerating}
        isInModal={isInModal}
      />

      {/* Rate Limit Modals */}
      <LoginPromptModal
        isOpen={loginPrompt.isOpen}
        onClose={hideLoginPrompt}
        userInput={loginPrompt.userInput}
        currentStep={loginPrompt.currentStep}
        isInModal={loginPrompt.isInModal}
      />
      <LimitExceededModal
        isOpen={limitModal.isOpen}
        onClose={hideLimitExceeded}
        resetAt={limitModal.resetAt}
        actionType={limitModal.actionType}
      />
    </>
  );
}
