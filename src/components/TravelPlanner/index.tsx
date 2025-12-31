"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserInput } from "@/lib/types";
import { generatePlan } from "@/app/actions/travel-planner";
import { encodePlanData } from "@/lib/urlUtils";
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

export default function TravelPlanner() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<UserInput>({
    destination: "",
    isDestinationDecided: undefined,
    region: "",
    dates: "",
    companions: "solo",
    theme: [],
    budget: "",
    pace: "",
    freeText: "",
    travelVibe: "",
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
      case 2: // Companions
        if (!input.companions) {
          setErrorMessage("誰との旅行か選択してください 👥");
          return false;
        }
        break;
      case 3: // Themes
        if (input.theme.length === 0) {
          setErrorMessage("テーマを少なくとも1つ選択してください 🎭");
          return false;
        }
        break;
      case 4: // Budget
        if (!input.budget) {
          setErrorMessage("予算感を選択してください 💰");
          return false;
        }
        break;
      case 5: // Dates
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
      case 6: // Pace
         if (!input.pace) {
          setErrorMessage("旅行のペースを選択してください ⚡");
          return false;
        }
        break;
      case 7: // FreeText (Optional)
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
    setInput({ ...input, isDestinationDecided: decided });
    // Clear potentially conflicting fields if switching
    if (decided) {
      setInput(prev => ({ ...prev, isDestinationDecided: true, region: "" }));
    } else {
      setInput(prev => ({ ...prev, isDestinationDecided: false, destination: "" }));
    }
    setStep(1);
  };

  const handlePlan = async () => {
    if (!validateStep(step)) return;

    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await generatePlan(input);
      if (response.success && response.data) {
        // Compress data and redirect
        const encoded = encodePlanData(input, response.data);
        router.push(`/plan?q=${encoded}`);
      } else {
        setErrorMessage(response.message || "Something went wrong.");
        setStatus("error");
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Network error or server timeout.");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return <LoadingView />;
  }

  // New Steps Mapping
  // 0: Initial Choice
  // 1: Destination OR Region
  // 2: Companions
  // 3: Themes
  // 4: Budget
  // 5: Dates
  // 6: Pace
  // 7: FreeText
  const TOTAL_STEPS = 8;

  return (
    <StepContainer
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      onNext={handleNext}
      onComplete={handlePlan}
      errorMessage={errorMessage}
    >
      {step === 0 && (
        <StepInitialChoice onDecide={handleInitialChoice} />
      )}
      {step === 1 && input.isDestinationDecided === true && (
        <StepDestination
          value={input.destination}
          onChange={(val) => setInput({ ...input, destination: val })}
          onNext={handleNext}
        />
      )}
      {step === 1 && input.isDestinationDecided === false && (
        <StepRegion
          value={input.region}
          vibe={input.travelVibe}
          onChange={(val) => setInput({ ...input, region: val })}
          onVibeChange={(val) => setInput({ ...input, travelVibe: val })}
          onNext={handleNext}
        />
      )}
      {step === 2 && (
        <StepCompanions
          value={input.companions}
          onChange={(val) => setInput({ ...input, companions: val })}
        />
      )}
      {step === 3 && (
        <StepThemes
          input={input}
          onChange={(val) => setInput({ ...input, ...val })}
        />
      )}
      {step === 4 && (
        <StepBudget
          value={input.budget}
          onChange={(val) => setInput({ ...input, budget: val })}
        />
      )}
      {step === 5 && (
         <StepDates
          input={input}
          onChange={(val) => setInput({ ...input, ...val })}
        />
      )}
      {step === 6 && (
         <StepPace
          value={input.pace}
          onChange={(val) => setInput({ ...input, pace: val })}
        />
      )}
      {step === 7 && (
        <StepFreeText
          value={input.freeText}
          onChange={(val) => setInput({ ...input, freeText: val })}
        />
      )}
    </StepContainer>
  );
}
