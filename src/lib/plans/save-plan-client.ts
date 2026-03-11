"use client";

import type { Itinerary, UserInput } from "@/types";
import type { SavePlanResult } from "@/lib/plans/save-plan";

export async function savePlanViaApi(
  input: UserInput,
  itinerary: Itinerary,
  isPublic: boolean = false
): Promise<SavePlanResult> {
  try {
    const response = await fetch("/api/plans/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ input, itinerary, isPublic }),
    });

    const payload = (await response.json()) as SavePlanResult | { error?: string };

    if (!response.ok) {
      return {
        success: false,
        error:
          "error" in payload && payload.error
            ? payload.error
            : "plan_save_failed",
      };
    }

    return payload as SavePlanResult;
  } catch (error) {
    console.error("Failed to save plan via API:", error);
    return { success: false, error: "plan_save_failed" };
  }
}
