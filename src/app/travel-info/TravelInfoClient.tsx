'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Info, MapPin, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TravelInfoCategory, TravelInfoResponse } from '@/lib/types/travel-info';
import { getTravelInfo } from '@/app/actions/travel-info';
import { encodeTravelInfoUrl } from '@/lib/travelInfoUrlUtils';
import {
  CategorySelector,
  TravelInfoDisplay,
  ShareButton,
} from '@/components/TravelInfo';

/**
 * 人気の目的地リスト
 */
const POPULAR_DESTINATIONS = [
  { name: 'パリ', country: 'フランス' },
  { name: 'ソウル', country: '韓国' },
  { name: 'バンコク', country: 'タイ' },
  { name: 'ニューヨーク', country: 'アメリカ' },
  { name: '台北', country: '台湾' },
  { name: 'シンガポール', country: 'シンガポール' },
];

/**
 * TravelInfoClient - 渡航情報ページのメインクライアントコンポーネント
 *
 * カテゴリ選択、検索、結果表示を統合
 */
export default function TravelInfoClient() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<TravelInfoCategory[]>([
    'basic',
    'safety',
    'climate',
  ]);
  const [loading, setLoading] = useState(false);
  const [travelInfo, setTravelInfo] = useState<TravelInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedDestination, setSearchedDestination] = useState<string>('');

  /**
   * 渡航情報を検索
   */
  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!destination.trim() || selectedCategories.length === 0) return;

    setLoading(true);
    setError(null);
    setTravelInfo(null);
    setSearchedDestination(destination.trim());

    try {
      const result = await getTravelInfo(destination.trim(), selectedCategories);
      if (result.success) {
        setTravelInfo(result.data);
        // URLを更新（履歴に追加しない）
        const newUrl = encodeTravelInfoUrl(destination.trim(), selectedCategories);
        router.replace(newUrl, { scroll: false });
      } else {
        setError(result.error || '情報の取得に失敗しました。');
      }
    } catch {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [destination, selectedCategories, router]);

  /**
   * 人気の目的地を選択
   */
  const handlePopularDestination = (name: string) => {
    setDestination(name);
  };

  /**
   * リトライ処理
   */
  const handleRetry = () => {
    handleSearch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      {/* Hero Section */}
      <section className="relative w-full">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#2c2c2c] leading-tight">
              渡航情報・安全ガイド
            </h1>
            <p className="text-xl text-stone-600 font-hand max-w-3xl mx-auto leading-relaxed">
              渡航先の情報をカテゴリ別にチェック。
              <br className="hidden sm:block" />
              必要な情報だけを選んで、効率的に準備できます。
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="space-y-8">
          {/* Search Form */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border-2 border-stone-200 p-6 sm:p-8 shadow-sm"
          >
            <form onSubmit={handleSearch} className="space-y-6">
              {/* 目的地入力 */}
              <div>
                <label
                  htmlFor="destination"
                  className="block text-lg font-bold text-[#2c2c2c] mb-3 font-serif"
                >
                  <MapPin className="inline w-5 h-5 mr-2 text-primary" />
                  目的地
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="例: パリ、バンコク、ニューヨーク"
                    className="flex-1 px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary transition-colors text-lg"
                    disabled={loading}
                  />
                </div>

                {/* 人気の目的地 */}
                <div className="mt-3">
                  <p className="text-sm text-stone-500 mb-2">人気の目的地:</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_DESTINATIONS.map((dest) => (
                      <button
                        key={dest.name}
                        type="button"
                        onClick={() => handlePopularDestination(dest.name)}
                        className="px-3 py-1.5 text-sm bg-stone-100 hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
                      >
                        {dest.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* カテゴリ選択 */}
              <div>
                <label className="block text-lg font-bold text-[#2c2c2c] mb-3 font-serif">
                  <Sparkles className="inline w-5 h-5 mr-2 text-primary" />
                  取得する情報カテゴリ
                </label>
                <CategorySelector
                  selectedCategories={selectedCategories}
                  onSelectionChange={setSelectedCategories}
                  disabled={loading}
                />
              </div>

              {/* 検索ボタン */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="submit"
                  disabled={loading || !destination.trim() || selectedCategories.length === 0}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg"
                >
                  <Search className="w-5 h-5" />
                  {loading ? '検索中...' : '渡航情報を検索'}
                </button>

                <p className="text-sm text-stone-500 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    AIが情報を収集します。公式情報も併せてご確認ください。
                  </span>
                </p>
              </div>
            </form>
          </motion.section>

          {/* Results Section */}
          {(loading || travelInfo || error) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* 共有ボタン（結果がある場合） */}
              {travelInfo && !loading && (
                <div className="flex justify-end mb-4">
                  <ShareButton
                    destination={searchedDestination}
                    categories={selectedCategories}
                  />
                </div>
              )}

              <TravelInfoDisplay
                data={travelInfo}
                loading={loading}
                error={error || undefined}
                selectedCategories={selectedCategories}
                onRetry={handleRetry}
              />
            </motion.section>
          )}

          {/* Initial State - How to Use */}
          {!loading && !travelInfo && !error && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 shadow-sm"
            >
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-6 text-center">
                このページでできること
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  { title: '基本情報', desc: '通貨・言語・時差・電源' },
                  { title: '安全・医療', desc: '危険度・緊急連絡先' },
                  { title: '気候・服装', desc: '天気予報・持ち物' },
                  { title: 'ビザ・手続き', desc: '入国要件・必要書類' },
                  { title: 'マナー・チップ', desc: '現地の習慣・タブー' },
                  { title: '交通事情', desc: '公共交通・配車サービス' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2c2c2c] mb-1">{item.title}</h3>
                      <p className="text-stone-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-blue-900 text-sm text-center">
                  <strong>使い方:</strong> 目的地を入力し、必要なカテゴリを選択して検索ボタンを押してください
                </p>
              </div>
            </motion.section>
          )}
        </div>
      </main>
    </div>
  );
}
