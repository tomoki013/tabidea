'use client';

import { motion } from 'framer-motion';
import {
  Globe,
  Shield,
  Cloud,
  FileText,
  Heart,
  Car,
  Check,
} from 'lucide-react';
import { CATEGORY_INFO, type CategoryCardProps, type CategoryIcon } from './types';

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
};

/**
 * CategoryCard - カテゴリ選択カード
 *
 * 各カテゴリを視覚的に表現し、選択状態を管理する
 * トラベルジャーナル風のスタンプカードデザイン
 */
export default function CategoryCard({
  category,
  selected,
  onToggle,
  disabled = false,
}: CategoryCardProps) {
  const info = CATEGORY_INFO[category];
  const IconComponent = IconComponents[info.icon];

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`
        relative group w-full p-4 sm:p-5 rounded-xl text-left
        border transition-all duration-300 overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
        ${selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-stone-200 bg-white hover:border-primary/50 hover:shadow-sm'
        }
        ${disabled
          ? 'opacity-50 cursor-not-allowed grayscale'
          : 'cursor-pointer'
        }
      `}
      aria-pressed={selected}
      aria-label={`${info.label}を${selected ? '選択解除' : '選択'}`}
    >
      {/* 実際に表示するチェックマーク（右上） */}
      <motion.div
        initial={false}
        animate={{
          scale: selected ? 1 : 0,
          opacity: selected ? 1 : 0,
        }}
        className="absolute top-2 right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-sm z-10"
      >
        <Check className="w-4 h-4" strokeWidth={3} />
      </motion.div>

      {/* コンテンツラッパー */}
      <div className="relative z-10 flex flex-col items-start h-full">
        {/* アイコン */}
        <div
          className={`
            w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3
            transition-colors duration-300 border
            ${selected
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-stone-50 border-stone-200 text-stone-500 group-hover:bg-primary/5 group-hover:text-primary/70'
            }
          `}
        >
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        {/* ラベル */}
        <h3
          className={`
            font-serif font-bold text-base sm:text-lg mb-1 leading-tight
            transition-colors duration-300
            ${selected ? 'text-primary' : 'text-[#2c2c2c]'}
          `}
        >
          {info.label}
        </h3>

        {/* 説明 */}
        <p className="text-xs sm:text-sm text-stone-500 font-sans leading-relaxed">
          {info.description}
        </p>
      </div>
    </motion.button>
  );
}
