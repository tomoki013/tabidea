"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserInput, Itinerary, DayPlan } from '@/types';
import { encodePlanData, splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import { generatePlanOutline, generatePlanChunk } from "@/app/actions/travel-planner";
import StepContainer from "./StepContainer";
import LoadingView from "./LoadingView";
import StepDestination from "./steps/StepDestination";
import StepDates from "./steps/StepDates";
import StepCompanions from "./steps/StepCompanions";
import StepThemes from "./steps/StepThemes";
import StepFreeText from "./steps/StepFreeText";
import StepInitialChoice from "./steps/StepInitialChoice";
import StepRegion from "./steps/StepRegion";
import StepBudget from "./steps/StepBudget";
import StepPace from "./steps/StepPace";
import StepPlaces from "./steps/StepPlaces";
import PlaneTransition from "./PlaneTransition";

interface TravelPlannerProps {
  initialInput?: UserInput | null;
  initialStep?: number;
  onClose?: () => void;
}

export default function TravelPlanner({ initialInput, initialStep, onClose }: TravelPlannerProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep ?? 0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [input, setInput] = useState<UserInput>(() => {
    if (initialInput) {
      const merged = { ...initialInput };
      // Ensure consistency: If destination is set, it must be decided
      if (merged.destination && !merged.isDestinationDecided) {
         merged.isDestinationDecided = true;
      }
      return merged;
    }
    return {
      destination: "",
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

  // Check if all required inputs are filled (for showing "Generate" button from any step)
  const isAllInputsComplete = (): boolean => {
    // Step 0: Initial choice
    if (input.isDestinationDecided === undefined) return false;

    // Step 1: Destination or Region
    if (input.isDestinationDecided) {
      if (!input.destination.trim()) return false;
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

    // Step 7: Pace
    if (!input.pace) return false;

    // Step 8: FreeText (optional, no check needed)

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
      case 1: // Destination or Region
        if (input.isDestinationDecided) {
          if (!input.destination.trim()) {
            setErrorMessage("行き先を入力してください ✈️");
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
      case 7: // Pace
         if (!input.pace) {
          setErrorMessage("旅行のペースを選択してください ⚡");
          return false;
        }
        break;
      case 8: // FreeText (Optional)
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
      setInput(prev => ({ ...prev, isDestinationDecided: false, destination: "" }));
    }

    // Trigger transition animation
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setStep(1);
    }, 700); // Wait for most of the animation to play before switching view
  };

  const handlePlan = async () => {
    if (!validateStep(step)) return;

    // Start loading state while generating plan
    setStatus("loading");
    setErrorMessage("");

    try {
      // Step 1: Generate Master Outline (Client-Side Orchestration)
      // This step decides destination (if undecided) and sets high-level route
      const outlineResponse = await generatePlanOutline(input);

      if (!outlineResponse.success || !outlineResponse.data) {
        throw new Error(outlineResponse.message || "プラン概要の作成に失敗しました。");
      }

      const { outline, context, input: updatedInput, heroImage } = outlineResponse.data;

      // Update local input state with chosen destination if it was undecided
      // (Though we are about to redirect, good for consistency)
      if (input.isDestinationDecided === false) {
         setInput(updatedInput);
      }

      // Step 2: Parallel Chunk Generation
      let totalDays = extractDuration(updatedInput.dates);

      // If duration is 0 (undecided), fallback to the AI-generated outline duration
      if (totalDays === 0 && outline.days.length > 0) {
        totalDays = outline.days.length;
      }

      // If duration is > 1 day, we split. Otherwise just use the outline days (or single chunk)
      // The shared logic handles splits.
      const chunks = splitDaysIntoChunks(totalDays);

      // Map chunks to promises
      const chunkPromises = chunks.map(chunk => {
        // Filter outline days relevant to this chunk
        const chunkOutlineDays = outline.days.filter(d => d.day >= chunk.start && d.day <= chunk.end);
        return generatePlanChunk(updatedInput, context, chunkOutlineDays, chunk.start, chunk.end);
      });

      // Execute all chunks in parallel
      const chunkResults = await Promise.all(chunkPromises);

      // Verify all chunks succeeded
      const failedChunk = chunkResults.find(r => !r.success);
      if (failedChunk) {
        throw new Error(failedChunk.message || "詳細プランの生成に失敗しました。");
      }

      // Step 3: Merge Results
      const mergedDays: DayPlan[] = chunkResults.flatMap(r => r.data || []);

      // Sort just in case parallel execution messed up order (unlikely with map but safe)
      mergedDays.sort((a, b) => a.day - b.day);

      // Construct Final Itinerary
      // Use a simple random ID generator that doesn't rely on crypto.randomUUID (HTTPS/Env restriction)
      const simpleId = Math.random().toString(36).substring(2, 15);

      const finalPlan: Itinerary = {
        id: simpleId,
        destination: outline.destination,
        description: outline.description,
        heroImage: heroImage?.url || null,
        heroImagePhotographer: heroImage?.photographer || null,
        heroImagePhotographerUrl: heroImage?.photographerUrl || null,
        days: mergedDays,
        // References from context
        references: context.map(c => ({
            title: c.title,
            url: c.url,
            image: c.imageUrl,
            snippet: c.snippet
        }))
      };

      // Step 4: Redirect
      const encoded = encodePlanData(updatedInput, finalPlan);
      router.push(`/plan?q=${encoded}`);

      // Close modal if it's open
      if (onClose) {
        onClose();
      }

    } catch (e: any) {
      console.error(e);
      setStatus("error");
      const msg = e.message || "ネットワークエラーまたはサーバータイムアウトが発生しました。";
      // Check for stale deployment error
      // Error: Server Action "..." was not found on the server
      if (msg.includes("Server Action") && msg.includes("not found")) {
         setErrorMessage("DEPLOYMENT_UPDATE_ERROR");
      } else {
         setErrorMessage(msg);
      }
    }
  };

  const handleJumpToStep = (targetStep: number) => {
    setErrorMessage("");
    setStep(targetStep);
  };

  if (status === "loading") {
    return <LoadingView />;
  }

  if (status === "error") {
    const isDeploymentError = errorMessage === "DEPLOYMENT_UPDATE_ERROR";
    const displayMessage = isDeploymentError
        ? "新しいバージョンが公開されました。ページを更新して最新の状態にしてください。"
        : (errorMessage || "エラーが発生しました");

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
  // 7: Pace
  // 8: FreeText
  const TOTAL_STEPS = 9;

  if (step === 0) {
    return (
      <>
        {isTransitioning && <PlaneTransition />}
        <StepInitialChoice onDecide={handleInitialChoice} />
      </>
    );
  }

  return (
    <StepContainer
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      onNext={handleNext}
      onComplete={handlePlan}
      errorMessage={errorMessage}
      input={input}
      onJumpToStep={handleJumpToStep}
      widthClass={step === 8 ? "max-w-3xl" : "max-w-lg"}
      onClose={onClose}
      canComplete={isAllInputsComplete()}
    >
      {step === 1 && input.isDestinationDecided === true && (
        <StepDestination
          value={input.destination}
          onChange={(val) => {
            setInput(prev => ({ ...prev, destination: val }));
            setErrorMessage("");
          }}
          onNext={handleNext}
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
        />
      )}
      {step === 3 && (
        <StepCompanions
          value={input.companions}
          onChange={(val) => {
            setInput(prev => ({ ...prev, companions: val }));
            setErrorMessage("");
          }}
        />
      )}
      {step === 4 && (
        <StepThemes
          input={input}
          onChange={(val) => {
            setInput(prev => ({ ...prev, ...val }));
            setErrorMessage("");
          }}
        />
      )}
      {step === 5 && (
        <StepBudget
          value={input.budget}
          onChange={(val) => {
            setInput(prev => ({ ...prev, budget: val }));
            setErrorMessage("");
          }}
        />
      )}
      {step === 6 && (
         <StepDates
          input={input}
          onChange={(val) => {
            setInput(prev => ({ ...prev, ...val }));
            setErrorMessage("");
          }}
        />
      )}
      {step === 7 && (
         <StepPace
          value={input.pace}
          onChange={(val) => {
            setInput(prev => ({ ...prev, pace: val }));
            setErrorMessage("");
          }}
        />
      )}
      {step === 8 && (
        <StepFreeText
          value={input.freeText}
          onChange={(val) => {
            setInput(prev => ({ ...prev, freeText: val }));
            setErrorMessage("");
          }}
        />
      )}
    </StepContainer>
  );
}
