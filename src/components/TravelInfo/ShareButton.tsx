'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Link2, Check, Twitter, MessageCircle } from 'lucide-react';
import {
  copyShareUrlToClipboard,
  generateTwitterShareUrl,
  generateLineShareUrl,
} from '@/lib/travelInfoUrlUtils';
import type { ShareButtonProps } from './types';

/**
 * ShareButton - URL共有ボタン
 *
 * クリップボードコピー、SNS共有機能を提供
 */
export default function ShareButton({
  destination,
  categories,
  dates,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * URLをクリップボードにコピー
   */
  const handleCopyUrl = async () => {
    const success = await copyShareUrlToClipboard(destination, categories, dates);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Twitter共有を開く
   */
  const handleTwitterShare = () => {
    const url = generateTwitterShareUrl(destination, categories);
    window.open(url, '_blank', 'width=600,height=400');
  };

  /**
   * LINE共有を開く
   */
  const handleLineShare = () => {
    const url = generateLineShareUrl(destination, categories);
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <div className="relative">
      {/* メインボタン */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Share2 className="w-5 h-5" />
        <span>共有</span>
      </button>

      {/* ドロップダウンメニュー */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* オーバーレイ（クリックで閉じる） */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* メニュー */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden z-50"
              role="menu"
            >
              {/* URLをコピー */}
              <button
                type="button"
                onClick={handleCopyUrl}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                role="menuitem"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 font-medium">コピーしました!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5 text-stone-600" />
                    <span className="text-stone-700">URLをコピー</span>
                  </>
                )}
              </button>

              <div className="border-t border-stone-100" />

              {/* Twitter */}
              <button
                type="button"
                onClick={handleTwitterShare}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                role="menuitem"
              >
                <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                <span className="text-stone-700">Twitterで共有</span>
              </button>

              {/* LINE */}
              <button
                type="button"
                onClick={handleLineShare}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors"
                role="menuitem"
              >
                <MessageCircle className="w-5 h-5 text-[#00B900]" />
                <span className="text-stone-700">LINEで共有</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
