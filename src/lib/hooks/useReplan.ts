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
 * replacementSlot.dayNumber → 対応する day を探す
 * replacementSlot.slotIndex → 対応する activity を置換 or 追加
 */
function applyRecoveryOption(
  itinerary: Itinerary,
  option: RecoveryOption
): Itinerary {
  const newDays = itinerary.days.map((day) => ({
    ...day,
    activities: [...day.activities],
  }));

  for (const slot of option.replacementSlots) {
    const dayIdx = newDays.findIndex((d) => d.day === slot.dayNumber);
    if (dayIdx === -1) continue;

    const day = newDays[dayIdx];
    if (slot.slotIndex < day.activities.length) {
      // Replace existing activity at that index
      day.activities[slot.slotIndex] = { ...slot.activity };
    } else {
      // Append as new activity
      day.activities.push({ ...slot.activity });
    }
  }

  return { ...itinerary, days: newDays };
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
