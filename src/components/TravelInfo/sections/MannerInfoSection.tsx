'use client';

import { motion } from 'framer-motion';
import {
  Heart,
  Coins,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import type { MannerInfo } from '@/lib/types/travel-info';
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
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Coins className="w-5 h-5 text-primary" />
          チップの習慣
        </h4>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`p-4 sm:p-6 rounded-2xl border-2 ${
            data.tipping.required
              ? 'bg-amber-50 border-amber-200'
              : data.tipping.customary
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
          }`}
        >
          <div className="flex items-center gap-4 mb-3">
            <TippingBadge tipping={data.tipping} />
          </div>
          <p className="text-stone-700 leading-relaxed">
            {data.tipping.guideline}
          </p>
        </motion.div>
      </div>

      {/* 現地の習慣・マナー */}
      {data.customs.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Heart className="w-5 h-5 text-primary" />
            現地の習慣・マナー
          </h4>
          <ul className="space-y-2">
            {data.customs.map((custom, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">
                  {custom}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* タブー・避けるべきこと */}
      {data.taboos.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            タブー・避けるべきこと
          </h4>
          <ul className="space-y-2">
            {data.taboos.map((taboo, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">
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
