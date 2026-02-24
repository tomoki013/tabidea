/**
 * PostTripReflection — 旅行後ミニサーベイ
 *
 * 最小入力で体験フィードバックを収集:
 * 1. 満足度 3択: "助かった" / "ふつう" / "苦労した"
 * 2. リプラン利用時: "再提案は役に立った？" 追加質問
 * 3. 自由記述 (任意)
 */

"use client";

import { useCallback, useState } from "react";

import type { Reflection, SatisfactionLevel } from "@/types/replan";

// ============================================================================
// Types
// ============================================================================

interface PostTripReflectionProps {
  /** プランID */
  planId: string;
  /** リプランを使用したか */
  usedReplan?: boolean;
  /** 送信コールバック */
  onSubmit: (reflection: Reflection) => void;
  /** 閉じるコールバック */
  onDismiss?: () => void;
}

// ============================================================================
// Satisfaction Config
// ============================================================================

const SATISFACTION_OPTIONS: {
  value: SatisfactionLevel;
  label: string;
  icon: string;
  className: string;
}[] = [
  {
    value: "helped",
    label: "助かった",
    icon: "😊",
    className: "border-green-200 bg-green-50 hover:bg-green-100 text-green-700",
  },
  {
    value: "neutral",
    label: "ふつう",
    icon: "😐",
    className: "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700",
  },
  {
    value: "struggled",
    label: "苦労した",
    icon: "😓",
    className: "border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700",
  },
];

// ============================================================================
// Component
// ============================================================================

export function PostTripReflection({
  planId,
  usedReplan = false,
  onSubmit,
  onDismiss,
}: PostTripReflectionProps) {
  const [satisfaction, setSatisfaction] = useState<SatisfactionLevel | null>(null);
  const [replanUseful, setReplanUseful] = useState<boolean | undefined>(undefined);
  const [freeText, setFreeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!satisfaction) return;

    setIsSubmitting(true);
    try {
      const reflection: Reflection = {
        planId,
        satisfaction,
        replanUseful: usedReplan ? replanUseful : undefined,
        freeText: freeText.trim() || undefined,
        submittedAt: new Date().toISOString(),
      };
      onSubmit(reflection);
    } finally {
      setIsSubmitting(false);
    }
  }, [satisfaction, replanUseful, freeText, planId, usedReplan, onSubmit]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-6 max-w-md mx-auto">
      {/* ヘッダー */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-stone-800">
          旅行はいかがでしたか？
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          簡単なフィードバックで、サービスの改善に役立てます
        </p>
      </div>

      {/* 満足度選択 */}
      <div className="space-y-2 mb-6" role="radiogroup" aria-label="満足度">
        {SATISFACTION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSatisfaction(option.value)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2
              transition-all duration-150 text-left
              ${
                satisfaction === option.value
                  ? `${option.className} ring-2 ring-offset-1 ring-primary/30 border-primary`
                  : `${option.className} border-opacity-50`
              }
            `}
            role="radio"
            aria-checked={satisfaction === option.value}
            aria-label={option.label}
          >
            <span className="text-2xl" aria-hidden="true">
              {option.icon}
            </span>
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      {/* リプラン利用時の追加質問 */}
      {usedReplan && satisfaction && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-medium text-stone-700 mb-2">
            プラン変更の提案は役に立ちましたか？
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReplanUseful(true)}
              className={`
                flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                ${
                  replanUseful === true
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }
              `}
            >
              はい
            </button>
            <button
              type="button"
              onClick={() => setReplanUseful(false)}
              className={`
                flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                ${
                  replanUseful === false
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }
              `}
            >
              いいえ
            </button>
          </div>
        </div>
      )}

      {/* 自由記述 */}
      {satisfaction && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <label
            htmlFor="reflection-freetext"
            className="text-sm font-medium text-stone-700 block mb-2"
          >
            ご感想（任意）
          </label>
          <textarea
            id="reflection-freetext"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="旅行中に感じたことを教えてください..."
            className="
              w-full px-3 py-2 rounded-lg border border-stone-200
              text-sm text-stone-700 placeholder:text-stone-400
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              resize-none
            "
            rows={3}
            maxLength={500}
          />
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="
              px-4 py-2.5 rounded-xl text-sm font-medium
              text-stone-500 hover:text-stone-700 hover:bg-stone-100
              transition-colors
            "
          >
            あとで
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!satisfaction || isSubmitting}
          className="
            flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
            bg-primary text-white
            hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? "送信中..." : "送信する"}
        </button>
      </div>
    </div>
  );
}
