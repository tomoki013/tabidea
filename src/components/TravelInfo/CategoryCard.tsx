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
 * Framer Motionによるホバー・選択アニメーション付き
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
      whileHover={disabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`
        relative group w-full p-4 sm:p-6 rounded-2xl text-left
        border-2 transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
        ${selected
          ? 'border-primary bg-primary/5 shadow-[0_4px_20px_-4px_rgba(230,126,34,0.3)]'
          : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-md'
        }
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer'
        }
      `}
      aria-pressed={selected}
      aria-label={`${info.label}を${selected ? '選択解除' : '選択'}`}
    >
      {/* 選択インジケーター */}
      <motion.div
        initial={false}
        animate={{
          scale: selected ? 1 : 0,
          opacity: selected ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
      >
        <Check className="w-4 h-4 text-white" strokeWidth={3} />
      </motion.div>

      {/* アイコン */}
      <div
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3
          transition-colors duration-300
          ${selected ? 'bg-primary/20' : 'bg-stone-100 group-hover:bg-stone-200'}
        `}
      >
        <IconComponent
          className={`
            w-6 h-6 sm:w-7 sm:h-7 transition-colors duration-300
            ${selected ? 'text-primary' : 'text-stone-600'}
          `}
        />
      </div>

      {/* ラベル */}
      <h3
        className={`
          font-serif font-bold text-base sm:text-lg mb-1
          transition-colors duration-300
          ${selected ? 'text-primary' : 'text-[#2c2c2c]'}
        `}
      >
        {info.label}
      </h3>

      {/* 説明 */}
      <p className="text-xs sm:text-sm text-stone-500 font-hand">
        {info.description}
      </p>

      {/* 選択時のボーダーエフェクト */}
      <motion.div
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        className="absolute inset-0 rounded-2xl border-2 border-primary pointer-events-none"
      />
    </motion.button>
  );
}
