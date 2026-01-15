'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TravelInfoCategory, TravelInfoResponse } from '@/lib/types/travel-info';
import { getTravelInfo } from '@/app/actions/travel-info';
import { encodeTravelInfoUrl } from '@/lib/travelInfoUrlUtils';
import {
  CategorySelector,
  TravelInfoDisplay,
  ShareButton,
} from '@/components/TravelInfo';

interface DestinationClientProps {
  destination: string;
  initialCategories: TravelInfoCategory[];
  dates?: { start: string; end: string };
}

/**
 * DestinationClient - 目的地別渡航情報ページのクライアントコンポーネント
 *
 * 初期ロード時に自動的に渡航情報を取得
 * カテゴリ変更時に再取得
 */
export default function DestinationClient({
  destination,
  initialCategories,
  dates,
}: DestinationClientProps) {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<TravelInfoCategory[]>(
    initialCategories
  );
  const [loading, setLoading] = useState(true);
  const [travelInfo, setTravelInfo] = useState<TravelInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 渡航情報を取得
   */
  const fetchTravelInfo = useCallback(async (categories: TravelInfoCategory[]) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTravelInfo(
        destination,
        categories,
        dates ? { travelDates: dates } : undefined
      );

      if (result.success) {
        setTravelInfo(result.data);
      } else {
        setError(result.error || '情報の取得に失敗しました。');
      }
    } catch {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [destination, dates]);

  // 初期ロード
  useEffect(() => {
    fetchTravelInfo(initialCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * カテゴリ変更時の処理
   */
  const handleCategoryChange = (newCategories: TravelInfoCategory[]) => {
    setSelectedCategories(newCategories);
  };

  /**
   * 再検索
   */
  const handleResearch = () => {
    // URLを更新
    const newUrl = encodeTravelInfoUrl(destination, selectedCategories, dates);
    router.replace(newUrl, { scroll: false });
    // 再取得
    fetchTravelInfo(selectedCategories);
  };

  /**
   * リトライ
   */
  const handleRetry = () => {
    fetchTravelInfo(selectedCategories);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/travel-info"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>渡航情報トップ</span>
          </Link>

          {travelInfo && !loading && (
            <ShareButton
              destination={destination}
              categories={selectedCategories}
              dates={dates}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* 目的地ヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c]">
              {destination}
            </h1>
            <p className="text-stone-600">の渡航情報</p>
            {dates && (
              <p className="text-sm text-stone-500">
                渡航予定: {dates.start} 〜 {dates.end}
              </p>
            )}
          </motion.div>

          {/* カテゴリ選択（折りたたみ可能） */}
          <motion.details
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border-2 border-stone-200 overflow-hidden"
          >
            <summary className="p-4 sm:p-6 cursor-pointer hover:bg-stone-50 transition-colors">
              <span className="font-bold text-[#2c2c2c]">
                カテゴリを変更
              </span>
              <span className="text-stone-500 ml-2">
                （現在 {selectedCategories.length} 件選択中）
              </span>
            </summary>
            <div className="p-4 sm:p-6 border-t border-stone-100 space-y-4">
              <CategorySelector
                selectedCategories={selectedCategories}
                onSelectionChange={handleCategoryChange}
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleResearch}
                disabled={loading || selectedCategories.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? '取得中...' : '選択したカテゴリで再検索'}
              </button>
            </div>
          </motion.details>

          {/* 渡航情報表示 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TravelInfoDisplay
              data={travelInfo}
              loading={loading}
              error={error || undefined}
              selectedCategories={selectedCategories}
              onRetry={handleRetry}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
