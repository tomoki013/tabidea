/**
 * ReplanTriggerPanel — ワンタップトリガーボタン群
 *
 * 旅行中の画面に表示するトリガーパネル。
 * 「天気が悪い」「疲れた」「遅れてる」の3つのワンタップボタンを提供。
 */

"use client";

import type { ReplanTrigger, ReplanTriggerType } from "@/types/replan";

import { ReplanTriggerButton } from "./ReplanTriggerButton";

// ============================================================================
// Types
// ============================================================================

interface ReplanTriggerPanelProps {
  /** 対象スロットID */
  slotId: string;
  /** トリガー発火コールバック */
  onTrigger: (trigger: ReplanTrigger) => void;
  /** 処理中か */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const TRIGGER_TYPES: ReplanTriggerType[] = ["rain", "fatigue", "delay"];

export function ReplanTriggerPanel({
  slotId,
  onTrigger,
  disabled = false,
}: ReplanTriggerPanelProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="プラン変更トリガー"
    >
      {TRIGGER_TYPES.map((type) => (
        <ReplanTriggerButton
          key={type}
          slotId={slotId}
          triggerType={type}
          onTrigger={onTrigger}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
