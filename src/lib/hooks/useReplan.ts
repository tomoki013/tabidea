/**
 * useReplan — リプラン状態管理フック
 *
 * 旅行中のリプラン操作（トリガー発火、提案受諾/却下）を管理する。
 * POST /api/replan を呼び出し、結果を状態として保持。
 */

"use client";

import { useCallback, useState } from "react";

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
// Hook
// ============================================================================

export function useReplan(
  tripPlan: TripPlan,
  travelerState: TravelerState,
  tripContext: TripContext
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

  const acceptSuggestion = useCallback((_option: RecoveryOption) => {
    // TODO: tripPlan にオプションを適用する（状態管理の実装は将来PR）
    setResult(null);
  }, []);

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
