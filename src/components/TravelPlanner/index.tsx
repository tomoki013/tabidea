"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserInput } from "@/lib/types";
import { encodePlanData } from "@/lib/urlUtils";
import { generatePlan } from "@/app/actions/travel-planner";
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
      dates: "",
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
      // Generate plan on the server
      const response = await generatePlan(input);

      if (response.success && response.data) {
        // Plan generated successfully, navigate to plan page with result
        const encoded = encodePlanData(input, response.data);
        router.push(`/plan?q=${encoded}`);

        // Close modal if it's open
        if (onClose) {
          onClose();
        }
      } else {
        // Handle error
        setStatus("error");
        setErrorMessage(response.message || "プランの生成に失敗しました。もう一度お試しください。");
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
      setErrorMessage("ネットワークエラーまたはサーバータイムアウトが発生しました。");
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">
          {errorMessage || "エラーが発生しました"}
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setErrorMessage("");
          }}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-bold"
        >
          もう一度試す
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
