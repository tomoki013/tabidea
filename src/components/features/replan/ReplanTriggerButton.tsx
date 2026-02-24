/**
 * ReplanTriggerButton — ワンタップリプラントリガーボタン
 *
 * アクティビティカード上に表示する小さなトリガーボタン。
 * タップすると指定タイプのリプラントリガーを発火する。
 */

"use client";

import { useCallback } from "react";

import type { ReplanTrigger, ReplanTriggerType } from "@/types/replan";

// ============================================================================
// Types
// ============================================================================

interface ReplanTriggerButtonProps {
  /** 対象スロットID */
  slotId: string;
  /** トリガー種別 */
  triggerType: ReplanTriggerType;
  /** トリガー発火コールバック */
  onTrigger: (trigger: ReplanTrigger) => void;
  /** 処理中か */
  disabled?: boolean;
}

// ============================================================================
// Config
// ============================================================================

const TRIGGER_CONFIG: Record<
  ReplanTriggerType,
  { label: string; icon: string; className: string }
> = {
  rain: {
    label: "天気が悪い",
    icon: "🌧️",
    className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
  },
  fatigue: {
    label: "疲れた",
    icon: "😮‍💨",
    className: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
  },
  delay: {
    label: "遅れてる",
    icon: "⏰",
    className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
  },
};

// ============================================================================
// Component
// ============================================================================

export function ReplanTriggerButton({
  slotId,
  triggerType,
  onTrigger,
  disabled = false,
}: ReplanTriggerButtonProps) {
  const config = TRIGGER_CONFIG[triggerType];

  const handleClick = useCallback(() => {
    const trigger: ReplanTrigger = {
      type: triggerType,
      slotId,
      timestamp: new Date().toISOString(),
    };
    onTrigger(trigger);
  }, [triggerType, slotId, onTrigger]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5
        text-xs font-medium rounded-full border
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${config.className}
      `}
      aria-label={`${config.label}でプランを変更`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </button>
  );
}
