"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  TravelInfoCategory,
  CategoryDataEntry,
  TravelInfoSource,
} from '@/types';
import { CATEGORY_LABELS } from '@/types';
import { getSingleCategoryInfo } from "@/app/actions/travel-info";
import { encodeTravelInfoUrl } from "@/lib/utils";
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

interface DestinationClientProps {
  destination: string;
  initialCategories: TravelInfoCategory[];
  dates?: { start: string; end: string };
}

/**
 * DestinationClient - 目的地別渡航情報ページのクライアントコンポーネント
 *
 * 初期ロード時に各カテゴリを並列で取得し、取得完了次第逐次表示
 */
export default function DestinationClient({
  destination,
  initialCategories,
  dates,
}: DestinationClientProps) {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] =
    useState<TravelInfoCategory[]>(initialCategories);

  // カテゴリ別の状態を管理
  const [categoryStates, setCategoryStates] = useState<
    Map<TravelInfoCategory, CategoryState>
  >(
    () => new Map(initialCategories.map((cat) => [cat, { status: "loading" }]))
  );

  // 国名（最初に成功したカテゴリから取得）
  const [country, setCountry] = useState<string>(destination);

  // ソース情報
  const [sources, setSources] = useState<TravelInfoSource[]>([]);

  const fetchStartTime = useRef<number>(0);

  /**
   * 単一カテゴリを取得
   */
  const fetchSingleCategory = useCallback(
    async (category: TravelInfoCategory) => {
      console.log("[DestinationClient] カテゴリ取得開始:", {
        destination,
        category,
      });

      // ローディング状態に設定
      setCategoryStates((prev) => {
        const next = new Map(prev);
        next.set(category, { status: "loading" });
        return next;
      });

      try {
        const result = await getSingleCategoryInfo(
          destination,
          category,
          {
            travelDates: dates,
            knownCountry: country !== destination ? country : undefined,
          }
        );

        if (result.success) {
          console.log("[DestinationClient] カテゴリ取得成功:", { category });

          // 成功状態に更新
          setCategoryStates((prev) => {
            const next = new Map(prev);
            next.set(category, { status: "success", data: result.data });
            return next;
          });

          // 国名を更新（初回のみ）
          setCountry((prev) => (prev === destination ? result.country : prev));

          // ソースを追加
          setSources((prev) => {
            const newSource = result.data.source;
            if (!prev.find((s) => s.sourceName === newSource.sourceName)) {
              return [...prev, newSource];
            }
            return prev;
          });
        } else {
          console.error("[DestinationClient] カテゴリ取得失敗:", {
            category,
            error: result.error,
          });

          // エラー状態に更新
          setCategoryStates((prev) => {
            const next = new Map(prev);
            next.set(category, { status: "error", error: result.error });
            return next;
          });
        }
      } catch (err) {
        console.error("[DestinationClient] 例外発生:", { category, err });

        const errorMessage =
          err instanceof Error ? err.message : "エラーが発生しました";
        setCategoryStates((prev) => {
          const next = new Map(prev);
          next.set(category, { status: "error", error: errorMessage });
          return next;
        });
      }
    },
    [destination, dates, country]
  );

  /**
   * 全カテゴリを並列で取得開始
   */
  const fetchAllCategories = useCallback(
    (categories: TravelInfoCategory[]) => {
      fetchStartTime.current = Date.now();

      console.log("[DestinationClient] 全カテゴリ取得開始:", {
        destination,
        categories,
      });

      // 全カテゴリをローディング状態に
      setCategoryStates(
        new Map(categories.map((cat) => [cat, { status: "loading" }]))
      );
      setSources([]);

      // 並列で全カテゴリを取得（Promise.allを使わず、各々独立して完了次第表示）
      categories.forEach((category) => {
        fetchSingleCategory(category);
      });
    },
    [destination, fetchSingleCategory]
  );

  // 初期ロード
  useEffect(() => {
    console.log("[DestinationClient] コンポーネントマウント:", {
      destination,
      initialCategories,
      dates,
    });
    // ページトップへ遷移
    window.scrollTo(0, 0);

    fetchAllCategories(initialCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * カテゴリ変更時の処理
   */
  const handleCategoryChange = (newCategories: TravelInfoCategory[]) => {
    console.log("[DestinationClient] カテゴリ変更:", {
      previous: selectedCategories,
      new: newCategories,
    });
    setSelectedCategories(newCategories);
  };

  /**
   * 再検索
   */
  const handleResearch = () => {
    console.log("[DestinationClient] 再検索開始:", {
      destination,
      categories: selectedCategories,
    });

    // URLを更新
    const newUrl = encodeTravelInfoUrl(destination, selectedCategories, dates);
    console.log("[DestinationClient] URL更新:", newUrl);
    router.replace(newUrl, { scroll: false });

    // 再取得
    fetchAllCategories(selectedCategories);
  };

  /**
   * 単一カテゴリの再取得
   */
  const handleRetryCategory = (category: TravelInfoCategory) => {
    console.log("[DestinationClient] カテゴリ再取得:", { category });
    fetchSingleCategory(category);
  };

  /**
   * 全体のローディング状態を計算
   */
  const isLoading = Array.from(categoryStates.values()).some(
    (s) => s.status === "loading"
  );

  return (
    <div className="min-h-screen pb-20 pt-32 bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4">
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
            className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
          >
            <summary className="p-4 sm:p-6 cursor-pointer hover:bg-stone-50 transition-colors">
              <span className="font-bold text-[#2c2c2c]">カテゴリを変更</span>
              <span className="text-stone-500 ml-2">
                （現在 {selectedCategories.length} 件選択中）
              </span>
            </summary>
            <div className="p-4 sm:p-6 border-t border-stone-100 space-y-6">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                  />
                  {isLoading ? "取得中..." : "選択したカテゴリで再検索"}
                </button>
              </div>
            </div>
          </motion.details>

          {/* 渡航情報表示（プログレッシブ） */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TravelInfoDisplay
              destination={destination}
              country={country}
              categoryStates={categoryStates}
              selectedCategories={selectedCategories}
              sources={sources}
              dates={dates}
              onRetryCategory={handleRetryCategory}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
