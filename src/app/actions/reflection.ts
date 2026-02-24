/**
 * reflection.ts — 旅行後振り返りデータ保存サーバーアクション
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import type { Reflection } from "@/types/replan";

// ============================================================================
// Types
// ============================================================================

export interface SubmitReflectionResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Server Action
// ============================================================================

/**
 * 旅行後の振り返りデータを保存する。
 */
export async function submitReflection(
  reflection: Reflection
): Promise<SubmitReflectionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // reflections テーブルに保存
    const { error } = await supabase.from("reflections").insert({
      plan_id: reflection.planId,
      user_id: user?.id ?? null,
      satisfaction: reflection.satisfaction,
      replan_useful: reflection.replanUseful ?? null,
      free_text: reflection.freeText ?? null,
      submitted_at: reflection.submittedAt,
    });

    if (error) {
      console.error("[reflection] Failed to save:", error.message);
      return { success: false, error: "保存に失敗しました" };
    }

    // イベントログも記録
    await supabase.from("generation_logs").insert({
      user_id: user?.id ?? null,
      event_type: "reflection_submitted",
      metadata: {
        satisfaction: reflection.satisfaction,
        replanUseful: reflection.replanUseful,
        hasFreeText: !!reflection.freeText,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[reflection] Unexpected error:", err);
    return { success: false, error: "予期せぬエラーが発生しました" };
  }
}
