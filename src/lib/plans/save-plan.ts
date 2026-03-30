import type { Itinerary, UserInput } from "@/types";
import { planService } from "@/lib/plans/service";
import { checkPlanCreationRate } from "@/lib/security/rate-limit";
import { getUser } from "@/lib/supabase/server";
import { enrichItineraryMetadata } from "@/lib/trips/metadata";
import { tripService } from "@/lib/trips/service";

export type SavePlanResult = {
  success: boolean;
  shareCode?: string;
  plan?: {
    id: string;
    shareCode: string;
    destination: string | null;
    durationDays: number | null;
    thumbnailUrl: string | null;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
};

export async function savePlanOnServer(
  input: UserInput,
  itinerary: Itinerary,
  isPublic: boolean = false
): Promise<SavePlanResult> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "authentication_required" };
    }

    const rateLimit = await checkPlanCreationRate(user.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    let itineraryToSave = enrichItineraryMetadata(itinerary, {
      generatedConstraints: {
        toolBudgetMode: itinerary.generatedConstraints?.toolBudgetMode ?? "legacy",
      },
    });

    if (itineraryToSave.tripId) {
      await tripService.ensureTripOwnership(itineraryToSave.tripId, user.id);
    } else {
      const persistedTrip = await tripService.persistTripVersion({
        itinerary: itineraryToSave,
        userId: user.id,
        createdBy: "user",
        changeType: "create",
        generatedConstraints: {
          toolBudgetMode: itineraryToSave.generatedConstraints?.toolBudgetMode ?? "legacy",
        },
      });
      itineraryToSave = persistedTrip.itinerary;
    }

    const result = await planService.createPlan({
      userId: user.id,
      input,
      itinerary: itineraryToSave,
      isPublic,
    });

    if (!result.success || !result.plan) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      shareCode: result.shareCode,
      plan: {
        id: result.plan.id,
        shareCode: result.plan.shareCode,
        destination: result.plan.destination,
        durationDays: result.plan.durationDays,
        thumbnailUrl: result.plan.thumbnailUrl,
        isPublic: result.plan.isPublic,
        createdAt: result.plan.createdAt.toISOString(),
        updatedAt: result.plan.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Failed to save plan:", error);
    return { success: false, error: "plan_save_failed" };
  }
}
