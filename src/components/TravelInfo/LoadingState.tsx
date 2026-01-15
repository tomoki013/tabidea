'use client';

import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import type { LoadingStateProps } from './types';

/**
 * LoadingState - ローディング状態表示
 *
 * スケルトンUIとアニメーションでローディング中を表現
 */
export default function LoadingState({
  message = '渡航情報を取得中...',
  categoryCount = 3,
}: LoadingStateProps) {
  return (
    <div className="space-y-8">
      {/* メインローディングインジケーター */}
      <div className="text-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="inline-block mb-4"
        >
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-stone-600"
        >
          <Plane className="w-5 h-5 text-primary animate-bounce" />
          <span className="font-hand text-lg">{message}</span>
        </motion.div>
      </div>

      {/* スケルトンカード */}
      <div className="space-y-4">
        {Array.from({ length: categoryCount }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl border-2 border-stone-200 overflow-hidden"
          >
            {/* スケルトンヘッダー */}
            <div className="flex items-center gap-4 p-4 sm:p-6 border-b border-stone-100">
              <div className="w-10 h-10 rounded-xl bg-stone-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-stone-100 rounded animate-pulse" />
                <div className="h-3 w-48 bg-stone-50 rounded animate-pulse" />
              </div>
            </div>

            {/* スケルトンコンテンツ */}
            <div className="p-4 sm:p-6 space-y-3">
              <div className="h-4 w-full bg-stone-50 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-stone-50 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-stone-50 rounded animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* プログレスインジケーター */}
      <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary/50 rounded-full"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ width: '50%' }}
        />
      </div>
    </div>
  );
}
