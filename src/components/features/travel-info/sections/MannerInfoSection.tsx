'use client';

import { motion } from 'framer-motion';
import {
  Heart,
  Coins,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import type { MannerInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * MannerInfoSection - マナー・チップ情報セクション
 *
 * チップの習慣、現地マナー、タブーを表示
 */
export default function MannerInfoSection({ data }: SectionBaseProps<MannerInfo>) {
  return (
    <div className="space-y-6">
      {/* チップ情報 */}
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
          <Coins className="w-5 h-5 text-primary" />
          チップの習慣
        </h4>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`p-5 sm:p-6 rounded-xl border bg-[#fcfbf9] shadow-sm relative overflow-hidden ${
            data.tipping.required
              ? 'border-amber-200'
              : data.tipping.customary
                ? 'border-blue-200'
                : 'border-green-200'
          }`}
        >
          {/* Tape */}
          <div className="absolute top-0 right-8 w-8 h-12 bg-stone-100 border-x border-b border-stone-200/50 shadow-sm rounded-b-sm" />

          <div className="flex items-center gap-4 mb-4 relative z-10">
            <TippingBadge tipping={data.tipping} />
          </div>
          <p className="text-stone-700 text-lg leading-loose font-serif relative z-10">
            {data.tipping.guideline}
          </p>
        </motion.div>
      </div>

      {/* 現地の習慣・マナー */}
      {data.customs.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <Heart className="w-6 h-6 text-primary" />
            現地の習慣・マナー
          </h4>
          <ul className="space-y-3">
            {data.customs.map((custom, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5 text-green-500">
                   <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                     <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                   </div>
                </div>
                <p className="text-stone-700 text-base leading-relaxed font-serif">
                  {custom}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* タブー・避けるべきこと */}
      {data.taboos.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            タブー・避けるべきこと
          </h4>
          <ul className="space-y-3">
            {data.taboos.map((taboo, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-red-50/30 border border-red-100 rounded-xl"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-stone-800 text-base leading-relaxed font-serif">
                  {taboo}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * チップ必要度バッジ
 */
function TippingBadge({ tipping }: { tipping: MannerInfo['tipping'] }) {
  if (tipping.required) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-200 text-amber-800 font-bold text-sm">
        <Coins className="w-4 h-4" />
        チップ必須
      </span>
    );
  }

  if (tipping.customary) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-200 text-blue-800 font-bold text-sm">
        <Coins className="w-4 h-4" />
        チップは慣習的
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-200 text-green-800 font-bold text-sm">
      <CheckCircle className="w-4 h-4" />
      チップ不要
    </span>
  );
}
