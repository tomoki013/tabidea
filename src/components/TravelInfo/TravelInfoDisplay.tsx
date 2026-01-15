'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle, MapPin, Info } from 'lucide-react';
import type {
  TravelInfoCategory,
  BasicCountryInfo,
  SafetyInfo,
  ClimateInfo,
  VisaInfo,
  MannerInfo,
  TransportInfo,
} from '@/lib/types/travel-info';
import InfoSection from './InfoSection';
import LoadingState from './LoadingState';
import {
  BasicInfoSection,
  SafetyInfoSection,
  ClimateInfoSection,
  VisaInfoSection,
  MannerInfoSection,
  TransportInfoSection,
} from './sections';
import type { TravelInfoDisplayProps } from './types';

/**
 * TravelInfoDisplay - 渡航情報表示メインコンポーネント
 *
 * カテゴリごとにアコーディオン形式で情報を表示
 * ローディング、エラー状態も管理
 */
export default function TravelInfoDisplay({
  data,
  loading,
  error,
  selectedCategories,
  onRetry,
}: TravelInfoDisplayProps) {
  // 展開状態を管理（デフォルトは最初のカテゴリを展開）
  const [expandedCategories, setExpandedCategories] = useState<Set<TravelInfoCategory>>(
    () => new Set(selectedCategories.slice(0, 1))
  );

  // カテゴリの展開/折りたたみをトグル
  const toggleCategory = (category: TravelInfoCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // すべて展開
  const expandAll = () => {
    setExpandedCategories(new Set(selectedCategories));
  };

  // すべて折りたたみ
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // 取得済みカテゴリをフィルタ
  const availableCategories = useMemo(() => {
    if (!data) return [];
    return selectedCategories.filter((cat) => data.categories.has(cat));
  }, [data, selectedCategories]);

  // ローディング状態
  if (loading) {
    return <LoadingState categoryCount={selectedCategories.length} />;
  }

  // エラー状態
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-red-50 border-2 border-red-200 border-dashed rounded-3xl text-center"
      >
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-2">
          情報の取得に失敗しました
        </h3>
        <p className="text-red-600 mb-6">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            再試行
          </button>
        )}
      </motion.div>
    );
  }

  // データなし
  if (!data) {
    return (
      <div className="p-8 bg-stone-50 border-2 border-stone-200 border-dashed rounded-3xl text-center">
        <Info className="w-12 h-12 text-stone-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-stone-600 mb-2">
          情報を取得するには
        </h3>
        <p className="text-stone-500">
          目的地を入力し、カテゴリを選択して検索してください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2c2c2c]">
              {data.destination}
            </h2>
            <p className="text-sm text-stone-500">{data.country}の渡航情報</p>
          </div>
        </div>

        {/* 展開/折りたたみボタン */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            すべて展開
          </button>
          <span className="text-stone-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            すべて折りたたみ
          </button>
        </div>
      </div>

      {/* カテゴリセクション */}
      <AnimatePresence mode="wait">
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {availableCategories.map((category) => {
            const entry = data.categories.get(category);
            if (!entry) return null;

            return (
              <InfoSection
                key={category}
                category={category}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
                source={entry.source}
              >
                <CategoryContent category={category} data={entry.data} />
              </InfoSection>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* 取得できなかったカテゴリの表示 */}
      {selectedCategories.length > availableCategories.length && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm text-yellow-800">
            <strong>注意:</strong> 一部のカテゴリ情報を取得できませんでした。
          </p>
        </div>
      )}

      {/* 免責事項 */}
      <div className="p-4 sm:p-6 bg-stone-50 border border-stone-200 rounded-2xl">
        <h4 className="flex items-center gap-2 font-bold text-stone-700 mb-2">
          <AlertCircle className="w-5 h-5" />
          免責事項
        </h4>
        <p className="text-sm text-stone-600 leading-relaxed">
          {data.disclaimer}
        </p>
        <p className="text-sm text-stone-500 mt-3">
          渡航前には必ず{' '}
          <a
            href="https://www.anzen.mofa.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            外務省海外安全ホームページ
          </a>{' '}
          等の公式情報をご確認ください。
        </p>
      </div>
    </div>
  );
}

/**
 * カテゴリに応じたコンテンツを表示
 */
function CategoryContent({
  category,
  data,
}: {
  category: TravelInfoCategory;
  data: unknown;
}) {
  switch (category) {
    case 'basic':
      return <BasicInfoSection data={data as BasicCountryInfo} />;
    case 'safety':
      return <SafetyInfoSection data={data as SafetyInfo} />;
    case 'climate':
      return <ClimateInfoSection data={data as ClimateInfo} />;
    case 'visa':
      return <VisaInfoSection data={data as VisaInfo} />;
    case 'manner':
      return <MannerInfoSection data={data as MannerInfo} />;
    case 'transport':
      return <TransportInfoSection data={data as TransportInfo} />;
    default:
      return null;
  }
}
