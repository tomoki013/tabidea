'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { ALL_TRAVEL_INFO_CATEGORIES, type TravelInfoCategory } from '@/lib/types/travel-info';
import CategoryCard from './CategoryCard';
import type { CategorySelectorProps } from './types';

/**
 * CategorySelector - カテゴリ選択グリッド
 *
 * 6つのカテゴリをグリッド表示し、複数選択を管理する
 * モバイル2列、デスクトップ3列のレスポンシブデザイン
 */
export default function CategorySelector({
  selectedCategories,
  onSelectionChange,
  disabled = false,
  maxSelections = 6,
}: CategorySelectorProps) {
  /**
   * カテゴリの選択状態をトグル
   */
  const handleToggle = (category: TravelInfoCategory) => {
    if (disabled) return;

    const isSelected = selectedCategories.includes(category);

    if (isSelected) {
      // 選択解除
      onSelectionChange(selectedCategories.filter((c) => c !== category));
    } else {
      // 選択追加（最大数チェック）
      if (selectedCategories.length < maxSelections) {
        onSelectionChange([...selectedCategories, category]);
      }
    }
  };

  /**
   * すべて選択
   */
  const handleSelectAll = () => {
    if (disabled) return;
    onSelectionChange([...ALL_TRAVEL_INFO_CATEGORIES]);
  };

  /**
   * すべて解除
   */
  const handleClearAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  const allSelected = selectedCategories.length === ALL_TRAVEL_INFO_CATEGORIES.length;
  const noneSelected = selectedCategories.length === 0;

  return (
    <div className="space-y-4">
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
            disabled={disabled || allSelected}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${allSelected || disabled
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
            disabled={disabled || noneSelected}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${noneSelected || disabled
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

      {/* カテゴリグリッド */}
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
        {ALL_TRAVEL_INFO_CATEGORIES.map((category, index) => (
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
