"use client";

import { useState } from "react";
import { UserInput, Itinerary } from "@/lib/types";
import { generatePlan, regeneratePlan } from "@/app/actions/travel-planner";
import StepContainer from "./StepContainer";
import LoadingView from "./LoadingView";
import ResultView from "./ResultView";
import StepDestination from "./steps/StepDestination";
import StepDates from "./steps/StepDates";
import StepCompanions from "./steps/StepCompanions";
import StepThemes from "./steps/StepThemes";
import StepFreeText from "./steps/StepFreeText";

export default function TravelPlanner() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<UserInput>({
    destination: "",
    dates: "",
    companions: "solo",
    theme: [],
    freeText: "",
  });

  const [status, setStatus] = useState<
    "idle" | "loading" | "complete" | "error"
  >("idle");
  const [result, setResult] = useState<Itinerary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => Math.max(0, prev - 1));

  const handlePlan = async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await generatePlan(input);
      if (response.success && response.data) {
        setResult(response.data);
        setStatus("complete");
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

  const handleRegenerate = async (
    chatHistory: { role: string; text: string }[]
  ) => {
    if (!result) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await regeneratePlan(result, chatHistory);
      if (response.success && response.data) {
        setResult(response.data);
        setStatus("complete");
      } else {
        setErrorMessage(response.message || "Failed to regenerate.");
        setStatus("error");
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Regeneration failed.");
      setStatus("error");
    }
  };

  const handleRestart = () => {
    setStatus("idle");
    setStep(0);
    setInput({
      destination: "",
      dates: "",
      companions: "solo",
      theme: [],
      freeText: "",
    });
    setResult(null);
  };

  if (status === "loading") {
    return <LoadingView />;
  }

  if (status === "complete" && result) {
    return (
      <ResultView
        result={result}
        input={input}
        onRestart={handleRestart}
        onRegenerate={handleRegenerate}
      />
    );
  }

  // Define steps
  // 0: Destination
  // 1: Dates
  // 2: Companions
  // 3: Themes (Budget/Pace)
  // 4: FreeText
  const TOTAL_STEPS = 5;

  return (
    <StepContainer
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={handleBack}
      onNext={handleNext}
      onComplete={handlePlan}
      isNextDisabled={step === 0 && !input.destination}
      errorMessage={status === "error" ? errorMessage : undefined}
    >
      {step === 0 && (
        <StepDestination
          value={input.destination}
          onChange={(val) => setInput({ ...input, destination: val })}
          onNext={handleNext}
        />
      )}
      {step === 1 && (
        <StepDates
          input={input}
          onChange={(val) => setInput({ ...input, ...val })}
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
        <StepFreeText
          value={input.freeText}
          onChange={(val) => setInput({ ...input, freeText: val })}
        />
      )}
    </StepContainer>
  );
}
