/**
 * useReplan — リプラン状態管理フック
 *
 * 旅行中のリプラン操作（トリガー発火、提案受諾/却下）を管理する。
 * POST /api/replan を呼び出し、結果を状態として保持。
 * 提案受諾時に replacementSlots を既存 Itinerary にマージして返す。
 */

"use client";

import { useCallback, useState } from "react";

import type { Itinerary } from "@/types";
import type {
  RecoveryOption,
  ReplanResult,
  ReplanTrigger,
  TravelerState,
  TripContext,
  TripPlan,
} from "@/types/replan";

// ============================================================================
// Types
// ============================================================================

export interface UseReplanOptions {
  /** 提案を適用した新しい Itinerary を受け取るコールバック */
  onApply?: (itinerary: Itinerary) => void;
}

export interface UseReplanReturn {
  /** リプラン処理中か */
  isReplanning: boolean;
  /** リプラン結果 */
  result: ReplanResult | null;
  /** エラーメッセージ */
  error: string | null;
  /** リプランをトリガーする */
  triggerReplan: (trigger: ReplanTrigger) => Promise<void>;
  /** 提案を受諾する */
  acceptSuggestion: (option: RecoveryOption) => void;
  /** 提案を却下する */
  dismissSuggestion: () => void;
}

// ============================================================================
// Merge Logic
// ============================================================================

/**
 * RecoveryOption の replacementSlots を Itinerary にマージして新しい Itinerary を返す。
 *
 * 影響を受けたアクティビティのみを置換し、それ以外はそのまま維持する:
 * 1. replacementSlots から対象日と影響スロットを特定
 * 2. 影響を受けた元アクティビティの位置を時刻マッチングで特定
 * 3. 影響を受けたアクティビティのみを代替アクティビティで置換
 */
function applyRecoveryOption(
  itinerary: Itinerary,
  option: RecoveryOption
): Itinerary {
  const newDays = itinerary.days.map((day) => ({
    ...day,
    activities: [...day.activities],
  }));

  // Group replacement slots by day
  const slotsByDay = new Map<number, typeof option.replacementSlots>();
  for (const slot of option.replacementSlots) {
    const existing = slotsByDay.get(slot.dayNumber) ?? [];
    existing.push(slot);
    slotsByDay.set(slot.dayNumber, existing);
  }

  for (const [dayNumber, slots] of slotsByDay) {
    const dayIdx = newDays.findIndex((d) => d.day === dayNumber);
    if (dayIdx === -1) continue;

    const day = newDays[dayIdx];

    // 元のアクティビティの時刻セットを作成し、影響を受けた位置を特定
    // replacementSlots の startTime（元スロットの時刻）で元の位置を特定
    const affectedOriginalTimes = new Set<string>();
    for (const slot of slots) {
      if (slot.startTime) {
        affectedOriginalTimes.add(slot.startTime);
      }
    }

    if (affectedOriginalTimes.size > 0) {
      // 時刻ベースのマッチング: 影響を受けた時刻のアクティビティのみ置換
      // 影響を受けたインデックスを収集（降順でspliceするため後ろから）
      const affectedIndices: number[] = [];
      for (let i = 0; i < day.activities.length; i++) {
        const actTime = day.activities[i].time;
        if (actTime && affectedOriginalTimes.has(actTime)) {
          affectedIndices.push(i);
        }
      }

      if (affectedIndices.length > 0) {
        // 影響を受けた最初のインデックス位置に全代替アクティビティを挿入し、
        // 影響を受けた元アクティビティを削除
        const newActivities = slots.map((slot) => ({ ...slot.activity }));

        // 降順で元アクティビティを削除
        for (let i = affectedIndices.length - 1; i >= 0; i--) {
          day.activities.splice(affectedIndices[i], 1);
        }

        // 最初の影響位置に代替アクティビティを挿入
        const insertIdx = Math.min(affectedIndices[0], day.activities.length);
        day.activities.splice(insertIdx, 0, ...newActivities);
      } else {
        // 時刻マッチが見つからない場合、slotIndex ベースのフォールバック
        applyBySlotIndex(day, slots);
      }
    } else {
      // startTime が無い場合、slotIndex ベースのフォールバック
      applyBySlotIndex(day, slots);
    }
  }

  return { ...itinerary, days: newDays };
}

/**
 * slotIndex ベースのフォールバック置換。
 * 影響スロットの slotIndex に対応する元アクティビティのみ置換する。
 */
function applyBySlotIndex(
  day: { activities: Itinerary["days"][number]["activities"] },
  slots: RecoveryOption["replacementSlots"]
): void {
  const newActivities = slots.map((slot) => ({ ...slot.activity }));
  const affectedIndices = slots
    .map((slot) => slot.slotIndex)
    .filter((idx) => idx < day.activities.length)
    .sort((a, b) => a - b);

  if (affectedIndices.length > 0) {
    // 降順で元アクティビティを削除
    for (let i = affectedIndices.length - 1; i >= 0; i--) {
      day.activities.splice(affectedIndices[i], 1);
    }
    // 最初の影響位置に代替アクティビティを挿入
    const insertIdx = Math.min(affectedIndices[0], day.activities.length);
    day.activities.splice(insertIdx, 0, ...newActivities);
  } else {
    // 完全なフォールバック: 末尾に追加
    day.activities.push(...newActivities);
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useReplan(
  tripPlan: TripPlan,
  travelerState: TravelerState,
  tripContext: TripContext,
  options?: UseReplanOptions
): UseReplanReturn {
  const [isReplanning, setIsReplanning] = useState(false);
  const [result, setResult] = useState<ReplanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerReplan = useCallback(
    async (trigger: ReplanTrigger) => {
      setIsReplanning(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/replan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: tripPlan.itinerary.id,
            trigger,
            travelerState,
            tripContext,
            tripPlan,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ?? "リプランに失敗しました"
          );
        }

        const data = (await response.json()) as ReplanResult;
        setResult(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "リプランに失敗しました";
        setError(message);
      } finally {
        setIsReplanning(false);
      }
    },
    [tripPlan, travelerState, tripContext]
  );

  const acceptSuggestion = useCallback(
    (option: RecoveryOption) => {
      const newItinerary = applyRecoveryOption(tripPlan.itinerary, option);
      options?.onApply?.(newItinerary);
      setResult(null);
    },
    [tripPlan.itinerary, options]
  );

  const dismissSuggestion = useCallback(() => {
    setResult(null);
  }, []);

  return {
    isReplanning,
    result,
    error,
    triggerReplan,
    acceptSuggestion,
    dismissSuggestion,
  };
}
