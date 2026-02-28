/**
 * ReplanSheet — 代替案一覧ボトムシート
 *
 * alternatives を一覧表示するシンプルなボトムシート。
 * 各アイテムをタップで選択可能。
 */

"use client";

import { FaTimes } from "react-icons/fa";

import type { RecoveryOption } from "@/types/replan";

// ============================================================================
// Types
// ============================================================================

interface ReplanSheetProps {
  /** 代替案一覧 */
  alternatives: RecoveryOption[];
  /** 選択コールバック */
  onSelect: (option: RecoveryOption) => void;
  /** 閉じるコールバック */
  onClose: () => void;
  /** 表示状態 */
  isOpen: boolean;
}

// ============================================================================
// Category Labels
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  indoor: "屋内",
  outdoor: "屋外",
  rest: "休憩",
  food: "グルメ",
  culture: "文化",
};

// ============================================================================
// Component
// ============================================================================

export function ReplanSheet({
  alternatives,
  onSelect,
  onClose,
  isOpen,
}: ReplanSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* シート */}
      <div
        className="
          fixed bottom-0 left-0 right-0 z-50
          bg-white rounded-t-2xl shadow-2xl
          max-h-[60vh] overflow-y-auto
          animate-in slide-in-from-bottom duration-300
        "
        role="dialog"
        aria-label="代替提案一覧"
      >
        {/* ハンドル & ヘッダー */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-stone-100 px-5 pt-3 pb-4">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-stone-800">
              他の提案
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="閉じる"
            >
              <FaTimes className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </div>

        {/* 代替案リスト */}
        <div className="px-5 py-3 space-y-3">
          {alternatives.length === 0 ? (
            <p className="text-center text-stone-400 py-8">
              他の提案はありません
            </p>
          ) : (
            alternatives.map((alt) => (
              <button
                key={alt.id}
                type="button"
                onClick={() => onSelect(alt)}
                className="
                  w-full text-left p-4 rounded-xl
                  border border-stone-200 hover:border-primary/30
                  hover:bg-primary/5 transition-colors
                "
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
                    {CATEGORY_LABELS[alt.category] ?? alt.category}
                  </span>
                  <span className="text-xs text-stone-400">
                    約{alt.estimatedDuration}
                  </span>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">
                  {alt.explanation}
                </p>
              </button>
            ))
          )}
        </div>

        {/* 下部余白 */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </>
  );
}
