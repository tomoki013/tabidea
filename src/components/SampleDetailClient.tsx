"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserInput, Itinerary } from "@/lib/types";
import ResultView from "@/components/TravelPlanner/ResultView";
import RequestSummary from "@/components/TravelPlanner/RequestSummary";
import SamplePlanActions from "@/components/SamplePlanActions";
import PlanModal from "@/components/ui/PlanModal";
import { regeneratePlan } from "@/app/actions/travel-planner";
import { encodePlanData } from "@/lib/urlUtils";

interface SampleDetailClientProps {
  sampleInput: UserInput;
  sampleItinerary: Itinerary;
}

export default function SampleDetailClient({
  sampleInput,
  sampleItinerary,
}: SampleDetailClientProps) {
  const router = useRouter();
  const [result, setResult] = useState<Itinerary>(sampleItinerary);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [initialEditStep, setInitialEditStep] = useState(0);

  const handleRegenerate = async (
    chatHistory: { role: string; text: string }[],
    overridePlan?: Itinerary
  ) => {
    const planToUse = overridePlan || result;
    setIsUpdating(true);
    try {
      const response = await regeneratePlan(planToUse, chatHistory);
      if (response.success && response.data) {
        const encoded = encodePlanData(sampleInput, response.data);
        router.push(`/plan?q=${encoded}`);
      } else {
        console.error(response.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResultChange = (newResult: Itinerary) => {
    setResult(newResult);
  };

  const handleEditRequest = (stepIndex: number) => {
    setInitialEditStep(stepIndex);
    setIsEditingRequest(true);
  };

  return (
    <>
      <div className="mb-8">
        <RequestSummary
          input={sampleInput}
          onEdit={handleEditRequest}
          className="mb-8"
        />
        <SamplePlanActions sampleInput={sampleInput} />
      </div>

      {result && (
        <ResultView
          result={result}
          input={sampleInput}
          onRestart={() => router.push("/")}
          onRegenerate={handleRegenerate}
          onResultChange={handleResultChange}
          isUpdating={isUpdating}
          onEditRequest={handleEditRequest}
          showRequestSummary={false}
        />
      )}

      <PlanModal
        isOpen={isEditingRequest}
        onClose={() => setIsEditingRequest(false)}
        initialInput={sampleInput}
        initialStep={initialEditStep}
      />
    </>
  );
}
