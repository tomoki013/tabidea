"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserInput, Itinerary } from '@/types';
import ResultView from "@/components/features/planner/ResultView";
import { PlanModal } from "@/components/common";
import { regeneratePlan, savePlan } from "@/app/actions/travel-planner";
import { saveLocalPlan } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";

interface SampleDetailClientProps {
  sampleInput: UserInput;
  sampleItinerary: Itinerary;
}

export default function SampleDetailClient({
  sampleInput,
  sampleItinerary,
}: SampleDetailClientProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [result, setResult] = useState<Itinerary>(sampleItinerary);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [initialEditStep, setInitialEditStep] = useState(0);

  const handleRegenerate = async (
    chatHistory: { role: string; text: string }[],
    overridePlan?: Itinerary
  ) => {
    // Regenerate logic can be kept or disabled for samples.
    // Assuming we want to allow users to "Customize this plan" -> which usually means copying it.
    // But existing code seems to support regen.

    const planToUse = overridePlan || result;
    setIsUpdating(true);
    try {
      const response = await regeneratePlan(planToUse, chatHistory);
      if (response.success && response.data) {
        // Save the regenerated plan
        if (isAuthenticated) {
          const saveResult = await savePlan(sampleInput, response.data, false);
          if (saveResult.success && saveResult.shareCode) {
            router.push(`/plan/${saveResult.shareCode}`);
          } else {
            console.error("Failed to save to DB:", saveResult.error);
            const localPlan = await saveLocalPlan(sampleInput, response.data);
            router.push(`/plan/local/${localPlan.id}`);
          }
        } else {
          const localPlan = await saveLocalPlan(sampleInput, response.data);
          router.push(`/plan/local/${localPlan.id}`);
        }
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
      <div className="w-full flex flex-col items-center">
         {/* Simplified View enforced for Sample Plans as well */}
         <ResultView
            result={result}
            input={sampleInput}
            onRestart={() => router.push("/")}
            onRegenerate={handleRegenerate}
            onResultChange={handleResultChange}
            isUpdating={isUpdating}
            onEditRequest={handleEditRequest}
            showRequestSummary={false}
            showChat={false}
            showShareButtons={false}
            showReferences={false}
            showFeedback={false}
            isSimplifiedView={true} // Force Simplified View (No map, full width)
            enableEditing={false}   // Disable direct editing for samples
            mapProvider="static"
         />
      </div>

      <PlanModal
        isOpen={isEditingRequest}
        onClose={() => setIsEditingRequest(false)}
        initialInput={sampleInput}
        initialStep={initialEditStep}
      />
    </>
  );
}
