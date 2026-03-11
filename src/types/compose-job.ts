import type { PartialDayData } from "@/types";
import type { Itinerary } from "@/types/itinerary";
import type { PipelineStepId, ComposePipelineMetadata } from "@/types/itinerary-pipeline";
import type { UserType } from "@/lib/limits/config";

export type ComposeJobStatus = "queued" | "running" | "completed" | "failed";

export interface ComposeJobProgressPayload {
  totalDays?: number;
  destination?: string;
  description?: string;
  partialDays?: Record<string, PartialDayData>;
}

export interface ComposeJobErrorPayload {
  message: string;
  code?: string;
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: UserType | string;
  resetAt?: string | null;
  remaining?: number;
}

export interface ComposeJobResultPayload {
  itinerary: Itinerary;
  warnings: string[];
  metadata?: ComposePipelineMetadata;
}

export interface ComposeJobResponse {
  jobId: string;
  status: ComposeJobStatus;
  currentStep: PipelineStepId | null;
  currentMessage: string | null;
  progress: ComposeJobProgressPayload;
  result?: ComposeJobResultPayload;
  error?: ComposeJobErrorPayload;
}
