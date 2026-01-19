'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Lock } from 'lucide-react';
import { ALL_TRAVEL_INFO_CATEGORIES, type TravelInfoCategory } from '@/lib/types/travel-info';
import CategoryCard from './CategoryCard';
import type { CategorySelectorProps } from './types';

// 必須カテゴリ（ユーザーは解除できない）
const MANDATORY_CATEGORIES: TravelInfoCategory[] = ['basic', 'safety', 'visa'];

/**
 * CategorySelector - カテゴリ選択グリッド
 *
 * 必須カテゴリと選択可能カテゴリを分けて表示し、複数選択を管理する
 */
export default function CategorySelector({
  selectedCategories,
  onSelectionChange,
  disabled = false,
  maxSelections = ALL_TRAVEL_INFO_CATEGORIES.length,
}: CategorySelectorProps) {

  // 選択可能なカテゴリのみ抽出
  const selectableCats = ALL_TRAVEL_INFO_CATEGORIES.filter(
    (c) => !MANDATORY_CATEGORIES.includes(c)
  );

  /**
   * カテゴリの選択状態をトグル
   */
  const handleToggle = (category: TravelInfoCategory) => {
    if (disabled) return;

    // 必須カテゴリは操作不可
    if (MANDATORY_CATEGORIES.includes(category)) return;

    const isSelected = selectedCategories.includes(category);

    if (isSelected) {
      // 選択解除（必須カテゴリは維持）
      const newSelection = selectedCategories.filter((c) => c !== category);
      onSelectionChange(newSelection);
    } else {
      // 選択追加（最大数チェック）
      if (selectedCategories.length < maxSelections) {
        onSelectionChange([...selectedCategories, category]);
      }
    }
  };

  /**
   * すべて選択（選択可能なカテゴリのみ追加）
   */
  const handleSelectAll = () => {
    if (disabled) return;
    // 重複を排除して結合
    const newSelection = Array.from(new Set([
      ...MANDATORY_CATEGORIES,
      ...selectableCats
    ]));
    onSelectionChange(newSelection);
  };

  /**
   * すべて解除（必須カテゴリのみ残す）
   */
  const handleClearAll = () => {
    if (disabled) return;
    onSelectionChange([...MANDATORY_CATEGORIES]);
  };

  // 選択可能なカテゴリが全て選択されているかチェック
  const allSelectableSelected = selectableCats.every(c => selectedCategories.includes(c));
  const noneSelectableSelected = selectableCats.every(c => !selectedCategories.includes(c));

  return (
    <div className="space-y-8">
      {/* ヘッダー: 選択数とアクションボタン */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">
            選択中:{' '}
            <span className="font-bold text-primary">
              {selectedCategories.length}
            </span>
            <span className="text-stone-400"> / {ALL_TRAVEL_INFO_CATEGORIES.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled || allSelectableSelected}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${allSelectableSelected || disabled
                ? 'text-stone-400 cursor-not-allowed'
                : 'text-primary hover:bg-primary/10 active:scale-95'
              }
            `}
            aria-label="すべて選択"
          >
            <CheckCircle className="w-4 h-4" />
            <span>すべて選択</span>
          </button>

          <span className="text-stone-300">|</span>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled || noneSelectableSelected}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${noneSelectableSelected || disabled
                ? 'text-stone-400 cursor-not-allowed'
                : 'text-stone-600 hover:bg-stone-100 active:scale-95'
              }
            `}
            aria-label="選択解除"
          >
            <XCircle className="w-4 h-4" />
            <span>選択解除</span>
          </button>
        </div>
      </div>

      {/* 必須カテゴリセクション */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-stone-500 uppercase tracking-wider">
          <Lock className="w-4 h-4" />
          <span>基本ガイド（常に含まれます）</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {MANDATORY_CATEGORIES.map((category) => (
            <CategoryCard
              key={category}
              category={category}
              selected={true} // 常に選択状態
              onToggle={() => {}} // 操作不可
              disabled={true} // 見た目はdisabledだが、チェックマークは表示されるようにCSS調整が必要かも（CategoryCard側で制御済み）
            />
          ))}
        </div>
      </div>

      {/* 選択可能カテゴリセクション */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
          追加情報（自由に選択）
        </h4>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {selectableCats.map((category, index) => (
            <motion.div
              key={category}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ delay: index * 0.05 }}
            >
              <CategoryCard
                category={category}
                selected={selectedCategories.includes(category)}
                onToggle={() => handleToggle(category)}
                disabled={
                  disabled ||
                  (!selectedCategories.includes(category) &&
                    selectedCategories.length >= maxSelections)
                }
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* 選択数が最大の場合の注意 */}
      {selectedCategories.length >= maxSelections && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-stone-500 text-center"
        >
          最大{maxSelections}つまで選択できます
        </motion.p>
      )}
    </div>
  );
}
