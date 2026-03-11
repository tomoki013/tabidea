import type { Itinerary, UserInput } from "@/types";
import { planService } from "@/lib/plans/service";
import { checkPlanCreationRate } from "@/lib/security/rate-limit";
import { getUser } from "@/lib/supabase/server";

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

    const result = await planService.createPlan({
      userId: user.id,
      input,
      itinerary,
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
