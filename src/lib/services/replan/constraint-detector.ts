/**
 * constraint-detector.ts — Activity から制約を自動検出する
 *
 * Activity の各プロパティ（isLocked, validation, source など）を検査し、
 * 適切な Constraint オブジェクトを生成する。
 */

import type { Activity } from "@/types";
import type { Constraint } from "@/types/replan";

// ============================================================================
// Public API
// ============================================================================

/**
 * Activity から制約を自動検出する。
 *
 * 検出ルール:
 * 1. isLocked=true → booking 制約 (hard)
 * 2. validation.details.openingHours がある → opening_hours 制約 (soft)
 *
 * @param activity - 検査対象のアクティビティ
 * @returns 検出された Constraint 配列
 */
export function detectConstraints(activity: Activity): Constraint[] {
  const constraints: Constraint[] = [];

  // ルール 1: ロック済み → booking 制約 (hard)
  if (activity.isLocked) {
    constraints.push({
      id: crypto.randomUUID(),
      type: "booking",
      priority: "hard",
      value: { activityName: activity.activity, time: activity.time },
      source: "booking",
      description: `予約確定: ${activity.activity}`,
    });
  }

  // ルール 2: 営業時間が設定されている → opening_hours 制約 (soft)
  if (
    activity.validation?.details?.openingHours &&
    activity.validation.details.openingHours.length > 0
  ) {
    constraints.push({
      id: crypto.randomUUID(),
      type: "opening_hours",
      priority: "soft",
      value: { openingHours: activity.validation.details.openingHours },
      source: "system",
      description: `営業時間: ${activity.validation.details.openingHours[0]}`,
    });
  }

  return constraints;
}
