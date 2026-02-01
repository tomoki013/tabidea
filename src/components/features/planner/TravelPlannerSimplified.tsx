"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserInput, Itinerary, DayPlan } from "@/types";
import { splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import {
  generatePlanOutline,
  generatePlanChunk,
  savePlan,
} from "@/app/actions/travel-planner";
import { saveLocalPlan, notifyPlanChange } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import { useUserPlans } from "@/context/UserPlansContext";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import LoadingView from "./LoadingView";
import { LoginPromptModal } from "@/components/ui/LoginPromptModal";
import { LimitExceededModal } from "@/components/ui/LimitExceededModal";
import {
  restorePendingState,
  clearPendingState,
} from "@/lib/restore/pending-state";

interface TravelPlannerSimplifiedProps {
  initialInput?: UserInput | null;
  onClose?: () => void;
}

const DEFAULT_INPUT: UserInput = {
  destinations: [],
  isDestinationDecided: undefined,
  region: "",
  dates: "2泊3日", // Default to 3 days
  companions: "",
  theme: [],
  budget: "",
  pace: "",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: undefined,
};

export default function TravelPlannerSimplified({
  initialInput,
  onClose,
}: TravelPlannerSimplifiedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { refreshPlans } = useUserPlans();

  const shouldRestore = searchParams.get("restore") === "true";

  const [input, setInput] = useState<UserInput>(() => {
    if (initialInput) {
      const merged = { ...DEFAULT_INPUT, ...initialInput };
      if (merged.destinations && merged.destinations.length > 0 && !merged.isDestinationDecided) {
        merged.isDestinationDecided = true;
      }
      return merged;
    }
    return DEFAULT_INPUT;
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "updating" | "complete" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Rate limiting state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLimitExceeded, setShowLimitExceeded] = useState(false);
  const [limitResetAt, setLimitResetAt] = useState<Date | null>(null);
  const [userType, setUserType] = useState<string>("anonymous");

  // Restore state
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [loginPromptProps, setLoginPromptProps] = useState<{
    userInput?: UserInput;
    currentStep?: number;
    isInModal?: boolean;
  }>({});

  // Restore saved state
  useEffect(() => {
    if (!shouldRestore) return;

    const result = restorePendingState();

    if (result.expired) {
      setShowExpiredNotice(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("restore");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    if (result.success && result.data && result.data.restoreType === "wizard") {
      setInput(result.data.userInput);
      setShowRestoredNotice(true);
      clearPendingState();
      const url = new URL(window.location.href);
      url.searchParams.delete("restore");
      window.history.replaceState({}, "", url.toString());
    }
  }, [shouldRestore]);

  const handleChange = (update: Partial<UserInput>) => {
    setInput((prev) => ({ ...prev, ...update }));
    setErrorMessage("");
  };

  const handleGenerate = async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      // Prepare input for generation
      const preparedInput = { ...input };

      // If omakase mode and no region specified, default to 'anywhere'
      if (preparedInput.isDestinationDecided === false && !preparedInput.region) {
        preparedInput.region = "anywhere";
      }

      // Set default values for optional fields if not specified
      if (!preparedInput.budget) {
        preparedInput.budget = "standard";
      }
      if (!preparedInput.pace) {
        preparedInput.pace = "balanced";
      }
      if (preparedInput.theme.length === 0) {
        preparedInput.theme = ["グルメ"];
      }
      if (preparedInput.hasMustVisitPlaces === undefined) {
        preparedInput.hasMustVisitPlaces = (preparedInput.mustVisitPlaces?.length ?? 0) > 0;
      }

      // Step 1: Generate Master Outline
      const outlineResponse = await generatePlanOutline(preparedInput);

      // Handle rate limiting
      if (!outlineResponse.success && outlineResponse.limitExceeded) {
        setStatus("idle");
        setUserType(outlineResponse.userType || "anonymous");

        if (outlineResponse.userType === "anonymous") {
          setLoginPromptProps({
            userInput: preparedInput,
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
        throw new Error(
          outlineResponse.message || "プラン概要の作成に失敗しました。"
        );
      }

      const { outline, context, input: updatedInput, heroImage } = outlineResponse.data;

      // Step 2: Parallel Chunk Generation
      let totalDays = extractDuration(updatedInput.dates);

      if (totalDays === 0 && outline.days.length > 0) {
        totalDays = outline.days.length;
      }

      const chunks = splitDaysIntoChunks(totalDays);

      const chunkPromises = chunks.map((chunk) => {
        const chunkOutlineDays = outline.days.filter(
          (d) => d.day >= chunk.start && d.day <= chunk.end
        );

        let previousOvernightLocation: string | undefined = undefined;
        if (chunk.start > 1) {
          const prevDay = outline.days.find((d) => d.day === chunk.start - 1);
          if (prevDay) {
            previousOvernightLocation = prevDay.overnight_location;
          }
        }

        return generatePlanChunk(
          updatedInput,
          context,
          chunkOutlineDays,
          chunk.start,
          chunk.end,
          previousOvernightLocation
        );
      });

      const chunkResults = await Promise.all(chunkPromises);

      const failedChunk = chunkResults.find((r) => !r.success);
      if (failedChunk) {
        throw new Error(
          failedChunk.message || "詳細プランの生成に失敗しました。"
        );
      }

      // Step 3: Merge Results
      const mergedDays: DayPlan[] = chunkResults.flatMap((r) => r.data || []);
      mergedDays.sort((a, b) => a.day - b.day);

      const simpleId = Math.random().toString(36).substring(2, 15);

      const finalPlan: Itinerary = {
        id: simpleId,
        destination: outline.destination,
        description: outline.description,
        heroImage: heroImage?.url || undefined,
        heroImagePhotographer: heroImage?.photographer || undefined,
        heroImagePhotographerUrl: heroImage?.photographerUrl || undefined,
        days: mergedDays,
        references: context.map((c) => ({
          title: c.title,
          url: c.url,
          image: c.imageUrl,
          snippet: c.snippet,
        })),
      };

      // Step 4: Save and Redirect
      if (isAuthenticated) {
        const saveResult = await savePlan(updatedInput, finalPlan, false);
        if (saveResult.success && saveResult.shareCode) {
          await refreshPlans();
          router.push(`/plan/${saveResult.shareCode}`);
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

      if (onClose) {
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      const msg =
        e.message || "ネットワークエラーまたはサーバータイムアウトが発生しました。";
      if (msg.includes("Server Action") && msg.includes("not found")) {
        setErrorMessage("DEPLOYMENT_UPDATE_ERROR");
      } else {
        setErrorMessage(msg);
      }
    }
  };

  if (status === "loading") {
    return <LoadingView />;
  }

  if (status === "error") {
    const isDeploymentError = errorMessage === "DEPLOYMENT_UPDATE_ERROR";
    const displayMessage = isDeploymentError
      ? "新しいバージョンが公開されました。ページを更新して最新の状態にしてください。"
      : errorMessage || "エラーが発生しました";

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">{displayMessage}</p>
        <button
          onClick={() => {
            if (isDeploymentError) {
              window.location.reload();
            } else {
              setErrorMessage("");
              handleGenerate();
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

      <SimplifiedInputFlow
        input={input}
        onChange={handleChange}
        onGenerate={handleGenerate}
        isGenerating={false}
      />

      {/* Rate Limit Modals */}
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
    </>
  );
}
