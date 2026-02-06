"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";

export interface AccuracyIssue {
  day: number;
  activityIndex: number;
  issue: string;
}

export interface SubmitFeedbackParams {
  planId?: string;
  overallRating: number;
  accuracyIssues?: AccuracyIssue[];
  comment?: string;
  destination?: string;
}

export async function submitPlanFeedback(
  params: SubmitFeedbackParams
): Promise<{ success: boolean; message?: string }> {
  try {
    // Validate rating
    if (params.overallRating < 1 || params.overallRating > 5) {
      return { success: false, message: "評価は1〜5の範囲で入力してください" };
    }

    const user = await getUser();
    const supabase = await createClient();

    // Rate limit check: 1 feedback per plan per 24h
    if (params.planId) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const query = supabase
        .from("plan_feedback")
        .select("id")
        .eq("plan_id", params.planId)
        .gte("created_at", twentyFourHoursAgo);

      if (user) {
        query.eq("user_id", user.id);
      }

      const { data: existing } = await query;
      if (existing && existing.length > 0) {
        return { success: false, message: "このプランへの評価は24時間以内に送信済みです" };
      }
    }

    const { error } = await supabase.from("plan_feedback").insert({
      plan_id: params.planId || null,
      user_id: user?.id || null,
      overall_rating: params.overallRating,
      accuracy_issues: params.accuracyIssues || [],
      comment: params.comment || null,
      destination: params.destination || null,
    });

    if (error) {
      console.error("[feedback] Insert failed:", error);
      return { success: false, message: "フィードバックの送信に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("[feedback] Unexpected error:", error);
    return { success: false, message: "フィードバックの送信に失敗しました" };
  }
}

export async function submitActivityIssue(params: {
  planId?: string;
  day: number;
  activityIndex: number;
  issueType: string;
  comment?: string;
  destination?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const user = await getUser();
    const supabase = await createClient();

    const issue: AccuracyIssue = {
      day: params.day,
      activityIndex: params.activityIndex,
      issue: params.comment
        ? `${params.issueType}: ${params.comment}`
        : params.issueType,
    };

    const { error } = await supabase.from("plan_feedback").insert({
      plan_id: params.planId || null,
      user_id: user?.id || null,
      accuracy_issues: [issue],
      destination: params.destination || null,
    });

    if (error) {
      console.error("[feedback] Activity issue insert failed:", error);
      return { success: false, message: "報告の送信に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("[feedback] Unexpected error:", error);
    return { success: false, message: "報告の送信に失敗しました" };
  }
}
