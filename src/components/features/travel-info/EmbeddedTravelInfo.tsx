"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import ModelBadge from "@/components/ui/ModelBadge";
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
  /** モーダルを閉じるコールバック（インライン表示時は省略可） */
  onClose?: () => void;
  /** 初期表示カテゴリ */
  initialCategories?: TravelInfoCategory[];
  /** インライン表示モード（trueの場合はモーダルとしてではなく、ブロック要素として表示） */
  inline?: boolean;
}

// Default categories for embedded modal
// Must use valid TravelInfoCategory values: basic, safety, visa, manner, etc.
const DEFAULT_CATEGORIES: TravelInfoCategory[] = [
  "basic",
  "safety",
  "visa",
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
  inline = false,
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

  // スクロールコンテナのRef
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScroll, setCanScroll] = useState(false);

  const checkScrollable = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScroll(scrollWidth > clientWidth);
    }
  }, []);

  useEffect(() => {
    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, [checkScrollable, destinations]);

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
   * スクロール操作
   */
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
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
  const currentCategoryStates: Map<TravelInfoCategory, CategoryState> =
    categoryStatesByDestination.get(activeDestination) ||
    new Map(selectedCategories.map((cat) => [cat, { status: "loading" }]));

  const currentCountry = countryByDestination.get(activeDestination) || activeDestination;
  const currentSources = sourcesByDestination.get(activeDestination) || [];

  const isLoading = Array.from(currentCategoryStates.values()).some(
    (s) => s.status === "loading"
  );

  const hasMultipleDestinations = destinations.length > 1;

  // インライン表示用のコンテナラッパー
  const Container = inline ? "div" : motion.div;
  const containerProps = inline
    ? { className: "w-full bg-[#fcfbf9] rounded-2xl overflow-hidden flex flex-col" }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        className:
          "w-full max-w-4xl max-h-[90vh] bg-[#fcfbf9] rounded-2xl shadow-2xl overflow-hidden flex flex-col",
      };

  const content = (
    <Container {...containerProps}>
      {/* Header - Only show in modal mode */}
      {!inline && (
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2c2c2c]">
              渡航情報・安全ガイド
            </h2>
            <ModelBadge modelName={process.env.NEXT_PUBLIC_CHAT_MODEL_NAME || "gemini-2.5-flash"} />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>
      )}

      {/* Content */}
      <div
        className={`flex-1 p-4 sm:p-6 space-y-6 ${
          !inline ? "overflow-y-auto" : ""
        }`}
      >
        {/* Destination Selector (Modern Scrollable Chips) */}
        {hasMultipleDestinations && (
          <div className="relative group mx-auto max-w-2xl mb-8">
            {/* Scroll Left Button */}
            {canScroll && (
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#fcfbf9] via-[#fcfbf9]/80 to-transparent z-10 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto rounded-l-xl">
                <button
                  onClick={() => scroll("left")}
                  className="p-2 rounded-full bg-white shadow-md border border-stone-100 text-stone-600 hover:text-primary hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="スクロール左"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Scrollable Container */}
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-4 overflow-x-auto px-16 py-4 no-scrollbar scroll-smooth snap-x"
            >
              {destinations.map((dest, index) => (
                <button
                  key={dest}
                  onClick={() => setActiveDestinationIndex(index)}
                  className={`
                    flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 snap-center font-serif tracking-wide
                    ${
                      index === activeDestinationIndex
                        ? "bg-[#2c2c2c] text-white shadow-lg scale-105 border-2 border-[#2c2c2c]"
                        : "bg-white text-stone-500 border-2 border-dashed border-stone-200 hover:border-primary/50 hover:text-primary hover:bg-stone-50 shadow-sm"
                    }
                  `}
                >
                  {dest}
                </button>
              ))}
            </div>

            {/* Scroll Right Button */}
            {canScroll && (
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#fcfbf9] via-[#fcfbf9]/80 to-transparent z-10 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto rounded-r-xl">
                <button
                  onClick={() => scroll("right")}
                  className="p-2 rounded-full bg-white shadow-md border border-stone-100 text-stone-600 hover:text-primary hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="スクロール右"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Current Destination Header */}
        <div className="text-center mt-2 mb-6">
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#2c2c2c] mb-1">
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
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
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
    </Container>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {content}
    </div>
  );
}
