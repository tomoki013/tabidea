/**
 * ReplanSuggestionCard — メイン提案カード
 *
 * 1つの primary suggestion を体験テキストで表示。
 * 「採用する」「別の提案を見る」の2ボタンで認知負荷を最小化。
 */

"use client";

import { useTranslations } from "next-intl";
import { FaCheck, FaChevronDown } from "react-icons/fa";

import type { RecoveryOption } from "@/types/replan";

// ============================================================================
// Types
// ============================================================================

interface ReplanSuggestionCardProps {
  /** メインの提案 */
  option: RecoveryOption;
  /** 採用コールバック */
  onAccept: (option: RecoveryOption) => void;
  /** 別提案表示コールバック */
  onShowAlternatives?: () => void;
  /** 代替案があるか */
  hasAlternatives?: boolean;
}

// ============================================================================
// Category Icon Map
// ============================================================================

const CATEGORY_ICONS: Record<string, string> = {
  indoor: "🏛️",
  outdoor: "🌿",
  rest: "☕",
  food: "🍜",
  culture: "🎭",
};

// ============================================================================
// Component
// ============================================================================

export function ReplanSuggestionCard({
  option,
  onAccept,
  onShowAlternatives,
  hasAlternatives = false,
}: ReplanSuggestionCardProps) {
  const t = useTranslations("components.features.replan.suggestionCard");
  const icon = CATEGORY_ICONS[option.category] ?? "✨";

  return (
    <div
      className="bg-white rounded-2xl border border-stone-200 shadow-lg p-5 animate-in slide-in-from-bottom-4 duration-300"
      role="region"
      aria-label={t("regionAriaLabel")}
    >
      {/* ヘッダー */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1">
          <p className="text-stone-800 font-medium leading-relaxed">
            {option.explanation}
          </p>
          <p className="text-xs text-stone-400 mt-1">
            {t("estimatedDuration", { duration: option.estimatedDuration })}
          </p>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onAccept(option)}
          className="
            flex-1 inline-flex items-center justify-center gap-2
            px-4 py-2.5 rounded-xl
            bg-primary text-white font-medium text-sm
            hover:bg-primary/90 transition-colors
          "
          aria-label={t("acceptAriaLabel")}
        >
          <FaCheck className="w-3.5 h-3.5" />
          <span>{t("accept")}</span>
        </button>

        {hasAlternatives && onShowAlternatives && (
          <button
            type="button"
            onClick={onShowAlternatives}
            className="
              inline-flex items-center justify-center gap-1.5
              px-4 py-2.5 rounded-xl
              bg-stone-100 text-stone-600 font-medium text-sm
              hover:bg-stone-200 transition-colors
            "
            aria-label={t("viewAlternativesAriaLabel")}
          >
            <FaChevronDown className="w-3 h-3" />
            <span>{t("otherOptions")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
