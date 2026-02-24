/**
 * slot-extractor.ts — Itinerary → PlanSlot[] 変換
 *
 * 既存の Itinerary 構造からスケジュール上の「枠」(PlanSlot) を抽出する。
 * 各 Activity を独立した PlanSlot にマッピングし、
 * isLocked や isBooked 情報から priority・isSkippable を推定する。
 */

import type { Activity, Itinerary } from "@/types";
import type { Constraint, PlanSlot, SlotPriority } from "@/types/replan";

import { detectConstraints } from "./constraint-detector";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Activity の状態から SlotPriority を推定する。
 *
 * - isLocked = true  → "must" (変更不可)
 * - validation.isVerified = true → "should" (検証済み)
 * - それ以外 → "nice" (変更可)
 */
function inferPriority(activity: Activity): SlotPriority {
  if (activity.isLocked) return "must";
  if (activity.validation?.isVerified) return "should";
  return "nice";
}

/**
 * Activity からスキップ可能かを推定する。
 *
 * isLocked な Activity はスキップ不可。
 */
function inferSkippable(activity: Activity): boolean {
  return !activity.isLocked;
}

/**
 * 時刻文字列をパースして { start, end } を返す。
 * "10:00〜12:00" / "10:00-12:00" / "10:00" 形式に対応。
 */
function parseTimeRange(
  time: string
): { start: string | undefined; end: string | undefined } {
  // "10:00〜12:00" or "10:00-12:00" or "10:00 ~ 12:00"
  const rangeMatch = time.match(
    /(\d{1,2}:\d{2})\s*[〜~\-–—]\s*(\d{1,2}:\d{2})/
  );
  if (rangeMatch) {
    return { start: rangeMatch[1], end: rangeMatch[2] };
  }

  // "10:00" 単独
  const singleMatch = time.match(/(\d{1,2}:\d{2})/);
  if (singleMatch) {
    return { start: singleMatch[1], end: undefined };
  }

  return { start: undefined, end: undefined };
}

// ============================================================================
// Default buffer (minutes)
// ============================================================================

const DEFAULT_BUFFER_MINUTES = 15;

// ============================================================================
// Public API
// ============================================================================

/**
 * Itinerary から PlanSlot 配列を抽出する。
 *
 * @param itinerary - 元の旅程データ
 * @returns PlanSlot 配列（日程順・スロット順にソート済み）
 */
export function extractSlots(itinerary: Itinerary): PlanSlot[] {
  const slots: PlanSlot[] = [];

  for (const day of itinerary.days) {
    for (let i = 0; i < day.activities.length; i++) {
      const activity = day.activities[i];
      const { start, end } = parseTimeRange(activity.time);
      const constraints: Constraint[] = detectConstraints(activity);

      slots.push({
        id: crypto.randomUUID(),
        dayNumber: day.day,
        slotIndex: i,
        activity,
        startTime: start,
        endTime: end,
        bufferMinutes: DEFAULT_BUFFER_MINUTES,
        isSkippable: inferSkippable(activity),
        priority: inferPriority(activity),
        constraints,
      });
    }
  }

  return slots;
}
