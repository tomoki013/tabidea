'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Shield,
  Cloud,
  FileText,
  Heart,
  Car,
  ChevronDown,
  Utensils,
  ShoppingBag,
  Calendar,
} from 'lucide-react';
import SourceBadge from './SourceBadge';
import { CATEGORY_INFO, type InfoSectionProps, type CategoryIcon } from './types';

/**
 * アイコンコンポーネントのマッピング
 */
const IconComponents: Record<CategoryIcon, React.ComponentType<{ className?: string }>> = {
  Globe,
  Shield,
  Cloud,
  FileText,
  Heart,
  Car,
  Utensils,
  ShoppingBag,
  Calendar,
};

/**
 * InfoSection - セクションラッパー
 *
 * カテゴリごとの情報をアコーディオン形式で表示
 * 展開/折りたたみアニメーション付き
 */
export default function InfoSection({
  category,
  isExpanded,
  onToggle,
  children,
  source,
}: InfoSectionProps) {
  const info = CATEGORY_INFO[category];
  const IconComponent = IconComponents[info.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-2 border-stone-200 overflow-hidden shadow-sm"
    >
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-4 sm:p-6 hover:bg-stone-50 transition-colors duration-200 focus:outline-none focus:bg-stone-50"
        aria-expanded={isExpanded}
        aria-controls={`section-content-${category}`}
      >
        <div className="flex items-center gap-4">
          {/* アイコン */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>

          {/* タイトルと説明 */}
          <div className="text-left">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-[#2c2c2c]">
              {info.label}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 font-hand">
              {info.description}
            </p>
          </div>
        </div>

        {/* 展開インジケーター */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-stone-400" />
        </motion.div>
      </button>

      {/* コンテンツ（アコーディオン） */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`section-content-${category}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-stone-100">
              {/* メインコンテンツ */}
              <div className="p-4 sm:p-6 space-y-4">
                {children}
              </div>

              {/* ソース情報 */}
              {source && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <SourceBadge
                    sourceType={source.sourceType}
                    sourceName={source.sourceName}
                    sourceUrl={source.sourceUrl}
                    reliabilityScore={source.reliabilityScore}
                    retrievedAt={source.retrievedAt}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
