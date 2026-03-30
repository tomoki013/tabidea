import type { PartialDayData, UserInput } from "@/types";
import type { PipelineStepId } from "@/types/itinerary-pipeline";
import type { UserType } from "@/lib/limits/config";

export interface GenerationStep {
  id: PipelineStepId;
  message: string;
  status: "pending" | "active" | "completed";
}

export interface GenerationLimitExceeded {
  userType: UserType;
  resetAt: Date | null;
  remaining?: number;
}

export interface UsePlanGenerationReturn {
  steps: GenerationStep[];
  currentStep: PipelineStepId | null;
  isGenerating: boolean;
  isCompleted: boolean;
  errorMessage: string;
  limitExceeded: GenerationLimitExceeded | null;
  warnings: string[];
  partialDays: Map<number, PartialDayData>;
  totalDays: number;
  previewDestination: string;
  previewDescription: string;
  generate: (input: UserInput, options?: { isRetry?: boolean }) => Promise<void>;
  reset: () => void;
  clearLimitExceeded: () => void;
}

export type ComposeStep = GenerationStep;
export type ComposeLimitExceeded = GenerationLimitExceeded;
export type UseComposeGenerationReturn = UsePlanGenerationReturn;
