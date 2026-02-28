/**
 * usePostTripReminder — 旅行後リマインダーフック
 *
 * 旅行日程が過ぎた後にフィードバックフォームを表示するかを判定。
 * localStorage で dismissed 状態を管理。
 */

"use client";

import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFIX = "tabidea_reflection_dismissed_";

/** 旅行終了後、表示を開始するまでの時間 (ms) — 1日 */
const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;

/** 表示期限 (ms) — 旅行終了から7日 */
const REMINDER_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// Hook
// ============================================================================

export interface UsePostTripReminderReturn {
  /** リマインダーを表示すべきか */
  shouldShow: boolean;
  /** リマインダーを非表示にする */
  dismiss: () => void;
}

/**
 * 旅行後のフィードバックリマインダーを管理する。
 *
 * @param planId - プランID
 * @param tripEndDate - 旅行終了日 (ISO 8601 or YYYY-MM-DD)
 */
export function usePostTripReminder(
  planId: string,
  tripEndDate?: string
): UsePostTripReminderReturn {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!tripEndDate) {
      setShouldShow(false);
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${planId}`;

    // 既に dismiss 済みならスキップ
    try {
      if (localStorage.getItem(storageKey) === "true") {
        setShouldShow(false);
        return;
      }
    } catch {
      // localStorage 未対応環境
    }

    const endTime = new Date(tripEndDate).getTime();
    const now = Date.now();
    const elapsed = now - endTime;

    // 旅行終了から1日〜7日の間のみ表示
    if (elapsed >= REMINDER_DELAY_MS && elapsed <= REMINDER_EXPIRY_MS) {
      setShouldShow(true);
    } else {
      setShouldShow(false);
    }
  }, [planId, tripEndDate]);

  const dismiss = useCallback(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${planId}`;
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // localStorage 未対応環境
    }
    setShouldShow(false);
  }, [planId]);

  return { shouldShow, dismiss };
}
