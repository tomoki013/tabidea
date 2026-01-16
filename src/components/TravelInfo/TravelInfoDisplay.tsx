"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  AlertCircle,
  MapPin,
  Info,
  AlertTriangle,
} from "lucide-react";
import type {
  TravelInfoCategory,
  BasicCountryInfo,
  SafetyInfo,
  ClimateInfo,
  VisaInfo,
  MannerInfo,
  TransportInfo,
  LocalFoodInfo,
  SouvenirInfo,
  EventsInfo,
} from "@/lib/types/travel-info";
import { CATEGORY_LABELS } from "@/lib/types/travel-info";
import InfoSection from "./InfoSection";
import LoadingState from "./LoadingState";
import {
  BasicInfoSection,
  SafetyInfoSection,
  ClimateInfoSection,
  VisaInfoSection,
  MannerInfoSection,
  TransportInfoSection,
  LocalFoodSection,
  SouvenirSection,
  EventsSection,
} from "./sections";
import type { TravelInfoDisplayProps, CategoryState } from "./types";
import { CATEGORY_INFO } from "./types";

/**
 * TravelInfoDisplay - 渡航情報表示メインコンポーネント
 *
 * プログレッシブローディング対応：
 * カテゴリごとにローディング/成功/エラー状態を個別に表示
 */
export default function TravelInfoDisplay({
  destination,
  country,
  categoryStates,
  selectedCategories,
  sources,
  onRetryCategory,
}: TravelInfoDisplayProps) {
  // 展開状態を管理（デフォルトは最初のカテゴリを展開）
  const [expandedCategories, setExpandedCategories] = useState<
    Set<TravelInfoCategory>
  >(() => new Set(selectedCategories.slice(0, 1)));

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

  // 成功したカテゴリの数
  const successCount = useMemo(() => {
    return Array.from(categoryStates.values()).filter(
      (s) => s.status === "success"
    ).length;
  }, [categoryStates]);

  // 全てローディング中かどうか
  const allLoading = useMemo(() => {
    return Array.from(categoryStates.values()).every(
      (s) => s.status === "loading"
    );
  }, [categoryStates]);

  // 全てエラーかどうか
  const allError = useMemo(() => {
    return Array.from(categoryStates.values()).every(
      (s) => s.status === "error"
    );
  }, [categoryStates]);

  // データなし（全てローディング中）
  if (allLoading && categoryStates.size > 0) {
    return <LoadingState categoryCount={selectedCategories.length} />;
  }

  // 全エラー状態
  if (allError && categoryStates.size > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center"
      >
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-2">
          情報の取得に失敗しました
        </h3>
        <p className="text-red-600 mb-4">
          申し訳ありません。渡航情報の取得中にエラーが発生しました。
          <br />
          しばらく経ってから再度お試しください。
        </p>
        {onRetryCategory && (
          <button
            type="button"
            onClick={() =>
              selectedCategories.forEach((cat) => onRetryCategory(cat))
            }
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            すべて再取得
          </button>
        )}
      </motion.div>
    );
  }

  // データなし（カテゴリ未選択時）
  if (categoryStates.size === 0) {
    return (
      <div className="p-8 bg-stone-50 border border-stone-200 rounded-3xl text-center">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 bg-white border border-stone-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2c2c2c]">
              {destination}
            </h2>
            <p className="text-sm text-stone-500">{country}の渡航情報</p>
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
          className="space-y-8"
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
          {selectedCategories.map((category) => {
            const state = categoryStates.get(category);
            if (!state) return null;

            return (
              <CategorySection
                key={category}
                category={category}
                state={state}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
                onRetry={
                  onRetryCategory ? () => onRetryCategory(category) : undefined
                }
              />
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* 免責事項 */}
      {successCount > 0 && (
        <div className="p-5 sm:p-6 bg-white border border-stone-200 rounded-2xl shadow-sm">
          <h4 className="flex items-center gap-2 font-bold text-stone-800 mb-2">
            <AlertCircle className="w-5 h-5 text-stone-500" />
            免責事項
          </h4>
          <p className="text-sm text-stone-600 leading-relaxed">
            この情報はAIによって生成されたものであり、正確性を保証するものではありません。
            渡航に関する最終的な判断は、必ず公式情報に基づいてご自身の責任で行ってください。
          </p>
          <p className="text-sm text-stone-500 mt-3">
            渡航前には必ず{" "}
            <a
              href="https://www.anzen.mofa.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              外務省海外安全ホームページ
            </a>{" "}
            等の公式情報をご確認ください。
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * カテゴリ別のセクション（ローディング/エラー/成功を個別に表示）
 */
function CategorySection({
  category,
  state,
  isExpanded,
  onToggle,
  onRetry,
}: {
  category: TravelInfoCategory;
  state: CategoryState;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry?: () => void;
}) {
  const info = CATEGORY_INFO[category];

  // ローディング中
  if (state.status === "loading") {
    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="p-6 bg-white rounded-2xl border border-stone-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center animate-pulse">
            <div className="w-5 h-5 bg-stone-300 rounded" />
          </div>
          <div className="flex-1">
            <div className="h-5 w-32 bg-stone-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-stone-100 rounded animate-pulse" />
          </div>
          <RefreshCw className="w-5 h-5 text-stone-400 animate-spin" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full bg-stone-100 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-stone-100 rounded animate-pulse" />
        </div>
      </motion.div>
    );
  }

  // エラー状態（お詫びメッセージ付き）
  if (state.status === "error") {
    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="p-6 bg-orange-50 rounded-2xl border border-orange-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-orange-800 mb-1">
              {info.label}の取得に失敗しました
            </h3>
            <p className="text-orange-700 text-sm mb-4">
              申し訳ありません。{info.label}の情報を取得できませんでした。
              <br />
              しばらく経ってから再度お試しください。
            </p>
            {state.error && (
              <p className="text-orange-600 text-xs mb-4 bg-orange-100 p-2 rounded">
                エラー詳細: {state.error}
              </p>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                再取得
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // 成功状態
  const entry = state.data;
  if (!entry) return null;

  return (
    <InfoSection
      category={category}
      isExpanded={isExpanded}
      onToggle={onToggle}
      source={entry.source}
    >
      <CategoryContent category={category} data={entry.data} />
    </InfoSection>
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
    case "basic":
      return <BasicInfoSection data={data as BasicCountryInfo} />;
    case "safety":
      return <SafetyInfoSection data={data as SafetyInfo} />;
    case "climate":
      return <ClimateInfoSection data={data as ClimateInfo} />;
    case "visa":
      return <VisaInfoSection data={data as VisaInfo} />;
    case "manner":
      return <MannerInfoSection data={data as MannerInfo} />;
    case "transport":
      return <TransportInfoSection data={data as TransportInfo} />;
    case "local_food":
      return <LocalFoodSection data={data as LocalFoodInfo} />;
    case "souvenir":
      return <SouvenirSection data={data as SouvenirInfo} />;
    case "events":
      return <EventsSection data={data as EventsInfo} />;
    default:
      return null;
  }
}
