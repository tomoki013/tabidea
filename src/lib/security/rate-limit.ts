import { createClient } from "@/lib/supabase/server";

export type RateLimitResult = {
  success: boolean;
  message?: string;
};

/**
 * Checks if the user has exceeded the plan creation rate limit.
 * Uses a database query to count plans created in the last time window.
 *
 * Limit: 5 plans per 1 minute (12 seconds per plan average)
 * This is to prevent spam/abuse since storage is now unlimited.
 */
export async function checkPlanCreationRate(userId: string): Promise<RateLimitResult> {
  const limit = 5;
  const windowSeconds = 60;

  try {
    const supabase = await createClient();

    // Calculate the timestamp for the start of the window
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count, error } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("created_at", windowStart);

    if (error) {
      console.error("Rate limit check failed:", error);
      // Fail open (allow access) if check fails to avoid blocking legitimate users due to DB errors
      return { success: true };
    }

    if (count !== null && count >= limit) {
      return {
        success: false,
        message: "プラン作成の頻度が高すぎます。しばらく待ってから再試行してください。",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Rate limit check exception:", error);
    return { success: true };
  }
}

/**
 * Checks if a specific plan is being updated too frequently.
 * Prevents spamming updates on a single plan or rapid-fire edits.
 *
 * Limit: 1 update per 3 seconds.
 */
export async function checkPlanUpdateRate(planId: string): Promise<RateLimitResult> {
  const minIntervalSeconds = 3;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("plans")
      .select("updated_at")
      .eq("id", planId)
      .single();

    if (error || !data) {
      // If plan not found or error, let the main action handle 404 or DB error
      // Or fail open
      return { success: true };
    }

    const updatedAt = new Date(data.updated_at).getTime();
    const now = Date.now();
    const diffSeconds = (now - updatedAt) / 1000;

    if (diffSeconds < minIntervalSeconds) {
      return {
        success: false,
        message: "更新頻度が高すぎます。少し時間を置いてください。",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Update rate limit exception:", error);
    return { success: true };
  }
}
