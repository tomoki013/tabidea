"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import type {
  TravelInfoCategory,
  CategoryDataEntry,
  TravelInfoSource,
} from '@/types';
import { getSingleCategoryInfo } from "@/app/actions/travel-info";
import {
  CategorySelector,
  TravelInfoDisplay,
} from "@/components/features/travel-info";

/**
 * カテゴリ別の状態
 */
interface CategoryState {
  status: "loading" | "success" | "error";
  data?: CategoryDataEntry;
  error?: string;
}

interface EmbeddedTravelInfoProps {
  /** 目的地（複数の場合は配列） */
  destinations: string[];
  /** 旅行日程 */
  dates?: { start: string; end: string };
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** 初期表示カテゴリ */
  initialCategories?: TravelInfoCategory[];
}

const DEFAULT_CATEGORIES: TravelInfoCategory[] = [
  "safety",
  "entry",
  "climate",
  "currency",
];

/**
 * EmbeddedTravelInfo - 結果画面に埋め込み可能な渡航情報コンポーネント
 *
 * 複数目的地の場合はタブで切り替え可能
 */
export default function EmbeddedTravelInfo({
  destinations,
  dates,
  onClose,
  initialCategories = DEFAULT_CATEGORIES,
}: EmbeddedTravelInfoProps) {
  // 現在選択中の目的地（タブ）
  const [activeDestinationIndex, setActiveDestinationIndex] = useState(0);
  const activeDestination = destinations[activeDestinationIndex];

  // カテゴリ選択
  const [selectedCategories, setSelectedCategories] =
    useState<TravelInfoCategory[]>(initialCategories);

  // 目的地ごとのカテゴリ状態を管理
  const [categoryStatesByDestination, setCategoryStatesByDestination] = useState<
    Map<string, Map<TravelInfoCategory, CategoryState>>
  >(new Map());

  // 目的地ごとの国名
  const [countryByDestination, setCountryByDestination] = useState<
    Map<string, string>
  >(new Map());

  // 目的地ごとのソース情報
  const [sourcesByDestination, setSourcesByDestination] = useState<
    Map<string, TravelInfoSource[]>
  >(new Map());

  // 取得済みの目的地を追跡
  const fetchedDestinations = useRef<Set<string>>(new Set());

  /**
   * 単一カテゴリを取得
   */
  const fetchSingleCategory = useCallback(
    async (destination: string, category: TravelInfoCategory) => {
      const knownCountry = countryByDestination.get(destination);

      // ローディング状態に設定
      setCategoryStatesByDestination((prev) => {
        const next = new Map(prev);
        const destStates = new Map(next.get(destination) || new Map());
        destStates.set(category, { status: "loading" });
        next.set(destination, destStates);
        return next;
      });

      try {
        const result = await getSingleCategoryInfo(destination, category, {
          travelDates: dates,
          knownCountry: knownCountry !== destination ? knownCountry : undefined,
        });

        if (result.success) {
          // 成功状態に更新
          setCategoryStatesByDestination((prev) => {
            const next = new Map(prev);
            const destStates = new Map(next.get(destination) || new Map());
            destStates.set(category, { status: "success", data: result.data });
            next.set(destination, destStates);
            return next;
          });

          // 国名を更新（初回のみ）
          setCountryByDestination((prev) => {
            if (!prev.has(destination) || prev.get(destination) === destination) {
              const next = new Map(prev);
              next.set(destination, result.country);
              return next;
            }
            return prev;
          });

          // ソースを追加
          setSourcesByDestination((prev) => {
            const next = new Map(prev);
            const destSources = next.get(destination) || [];
            const newSource = result.data.source;
            if (!destSources.find((s) => s.sourceName === newSource.sourceName)) {
              next.set(destination, [...destSources, newSource]);
            }
            return next;
          });
        } else {
          // エラー状態に更新
          setCategoryStatesByDestination((prev) => {
            const next = new Map(prev);
            const destStates = new Map(next.get(destination) || new Map());
            destStates.set(category, { status: "error", error: result.error });
            next.set(destination, destStates);
            return next;
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "エラーが発生しました";
        setCategoryStatesByDestination((prev) => {
          const next = new Map(prev);
          const destStates = new Map(next.get(destination) || new Map());
          destStates.set(category, { status: "error", error: errorMessage });
          next.set(destination, destStates);
          return next;
        });
      }
    },
    [dates, countryByDestination]
  );

  /**
   * 特定の目的地の全カテゴリを並列で取得開始
   */
  const fetchAllCategoriesForDestination = useCallback(
    (destination: string, categories: TravelInfoCategory[]) => {
      // 全カテゴリをローディング状態に
      setCategoryStatesByDestination((prev) => {
        const next = new Map(prev);
        const destStates = new Map<TravelInfoCategory, CategoryState>();
        categories.forEach((cat) => destStates.set(cat, { status: "loading" }));
        next.set(destination, destStates);
        return next;
      });

      setSourcesByDestination((prev) => {
        const next = new Map(prev);
        next.set(destination, []);
        return next;
      });

      // 並列で全カテゴリを取得
      categories.forEach((category) => {
        fetchSingleCategory(destination, category);
      });

      fetchedDestinations.current.add(destination);
    },
    [fetchSingleCategory]
  );

  // 初期ロード: 最初の目的地を取得
  useEffect(() => {
    if (destinations.length > 0 && !fetchedDestinations.current.has(destinations[0])) {
      fetchAllCategoriesForDestination(destinations[0], selectedCategories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タブ切り替え時: まだ取得していない場合は取得開始
  useEffect(() => {
    if (activeDestination && !fetchedDestinations.current.has(activeDestination)) {
      fetchAllCategoriesForDestination(activeDestination, selectedCategories);
    }
  }, [activeDestination, selectedCategories, fetchAllCategoriesForDestination]);

  /**
   * カテゴリ変更時の処理
   */
  const handleCategoryChange = (newCategories: TravelInfoCategory[]) => {
    setSelectedCategories(newCategories);
  };

  /**
   * 現在の目的地を再検索
   */
  const handleResearch = () => {
    if (activeDestination) {
      fetchAllCategoriesForDestination(activeDestination, selectedCategories);
    }
  };

  /**
   * 単一カテゴリの再取得
   */
  const handleRetryCategory = (category: TravelInfoCategory) => {
    if (activeDestination) {
      fetchSingleCategory(activeDestination, category);
    }
  };

  // 現在の目的地の状態を取得
  const currentCategoryStates =
    categoryStatesByDestination.get(activeDestination) ||
    new Map(selectedCategories.map((cat) => [cat, { status: "loading" as const }]));

  const currentCountry = countryByDestination.get(activeDestination) || activeDestination;
  const currentSources = sourcesByDestination.get(activeDestination) || [];

  const isLoading = Array.from(currentCategoryStates.values()).some(
    (s) => s.status === "loading"
  );

  const hasMultipleDestinations = destinations.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] bg-[#fcfbf9] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2c2c2c]">
              渡航情報・安全ガイド
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>

        {/* Multi-destination tabs */}
        {hasMultipleDestinations && (
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-white border-b border-stone-100 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveDestinationIndex(Math.max(0, activeDestinationIndex - 1))}
              disabled={activeDestinationIndex === 0}
              className="p-1.5 rounded-full hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              aria-label="前の目的地"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2 overflow-x-auto">
              {destinations.map((dest, index) => (
                <button
                  key={dest}
                  onClick={() => setActiveDestinationIndex(index)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    index === activeDestinationIndex
                      ? "bg-primary text-white shadow-md"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {dest}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setActiveDestinationIndex(Math.min(destinations.length - 1, activeDestinationIndex + 1))
              }
              disabled={activeDestinationIndex === destinations.length - 1}
              className="p-1.5 rounded-full hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              aria-label="次の目的地"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Current destination title */}
          <div className="text-center">
            <h3 className="text-2xl font-serif font-bold text-[#2c2c2c]">
              {activeDestination}
            </h3>
            {currentCountry !== activeDestination && (
              <p className="text-stone-500 text-sm">{currentCountry}</p>
            )}
            {dates && (
              <p className="text-sm text-stone-500 mt-1">
                渡航予定: {dates.start} 〜 {dates.end}
              </p>
            )}
          </div>

          {/* Category selector (collapsible) */}
          <details className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <summary className="p-4 cursor-pointer hover:bg-stone-50 transition-colors">
              <span className="font-bold text-[#2c2c2c]">カテゴリを変更</span>
              <span className="text-stone-500 ml-2">
                （現在 {selectedCategories.length} 件選択中）
              </span>
            </summary>
            <div className="p-4 border-t border-stone-100 space-y-4">
              <CategorySelector
                selectedCategories={selectedCategories}
                onSelectionChange={handleCategoryChange}
                disabled={isLoading}
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleResearch}
                  disabled={isLoading || selectedCategories.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                  {isLoading ? "取得中..." : "再検索"}
                </button>
              </div>
            </div>
          </details>

          {/* Travel info display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDestination}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TravelInfoDisplay
                destination={activeDestination}
                country={currentCountry}
                categoryStates={currentCategoryStates}
                selectedCategories={selectedCategories}
                sources={currentSources}
                dates={dates}
                onRetryCategory={handleRetryCategory}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer hint */}
        <div className="p-4 border-t border-stone-200 bg-white text-center shrink-0">
          <p className="text-xs text-stone-500">
            情報は参考用です。必ず公式サイトで最新情報を確認してください。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
