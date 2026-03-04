"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
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
  CategoryDataEntry,
  BasicCountryInfo,
  SafetyInfo,
  ClimateInfo,
  VisaInfo,
  MannerInfo,
  TransportInfo,
  LocalFoodInfo,
  SouvenirInfo,
  EventsInfo,
  TechnologyInfo,
  HealthcareInfo,
  RestroomsInfo,
  SmokingInfo,
  AlcoholInfo,
} from '@/types';
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
  TechnologySection,
  HealthcareSection,
  RestroomsSection,
  SmokingSection,
  AlcoholSection,
} from "./sections";
import type { TravelInfoDisplayProps, CategoryState } from "./types";
import { getCategoryInfo } from "./types";
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from "@/lib/i18n/locales";
import PDFExportButton from "./PDFExportButton";
import ShareButton from "./ShareButton";

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
  dates,
  onRetryCategory,
}: TravelInfoDisplayProps) {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const text = language === "ja"
    ? {
        headerSuffix: "の渡航情報",
        expandAll: "すべて展開",
        collapseAll: "すべて折りたたみ",
        fetchFailedTitle: "情報の取得に失敗しました",
        fetchFailedBody:
          "申し訳ありません。渡航情報の取得中にエラーが発生しました。\nしばらく経ってから再度お試しください。",
        refetchAll: "すべて再取得",
        guidePromptTitle: "情報を取得するには",
        guidePromptBody: "目的地を入力し、カテゴリを選択して検索してください",
        disclaimer: "免責事項",
        disclaimerBody:
          "この情報はAIによって生成されたものであり、正確性を保証するものではありません。渡航に関する最終的な判断は、必ず公式情報に基づいてご自身の責任で行ってください。",
        disclaimerOfficialPrefix: "渡航前には必ず",
        disclaimerOfficialSuffix: "等の公式情報をご確認ください。",
        mofa: "外務省海外安全ホームページ",
      }
    : {
        headerSuffix: " Travel Info",
        expandAll: "Expand all",
        collapseAll: "Collapse all",
        fetchFailedTitle: "Failed to fetch travel information",
        fetchFailedBody:
          "Sorry, an error occurred while fetching travel information.\nPlease try again in a moment.",
        refetchAll: "Retry all",
        guidePromptTitle: "How to fetch information",
        guidePromptBody: "Enter a destination, choose categories, and search.",
        disclaimer: "Disclaimer",
        disclaimerBody:
          "This information is AI-generated and is not guaranteed to be fully accurate. For any travel decision, always verify official primary sources and decide at your own responsibility.",
        disclaimerOfficialPrefix: "Before traveling, always check official sources such as",
        disclaimerOfficialSuffix: ".",
        mofa: "MOFA Overseas Safety Website",
      };
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

  // いずれかがローディング中かどうか（PDF出力ボタンの制御用）
  const anyLoading = useMemo(() => {
    // 選択されたカテゴリのうち、状態が存在し、かつローディング中のものがあるか
    return selectedCategories.some((cat) => {
      const state = categoryStates.get(cat);
      return state?.status === "loading";
    });
  }, [categoryStates, selectedCategories]);

  // 全てエラーかどうか
  const allError = useMemo(() => {
    return Array.from(categoryStates.values()).every(
      (s) => s.status === "error"
    );
  }, [categoryStates]);

  return (
    <div className="space-y-6">
      {/* Action Buttons: Side-by-side on mobile, centered */}
      <div className="flex flex-row items-center justify-center gap-4 mb-4">
        <PDFExportButton
          destination={destination}
          country={country}
          categoryStates={categoryStates}
          disabled={anyLoading}
          dates={dates}
        />
        <ShareButton
          destination={destination}
          categories={selectedCategories}
          dates={dates}
        />
      </div>

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
            <p className="text-sm text-stone-500">{country}{text.headerSuffix}</p>
          </div>
        </div>

        {/* 展開/折りたたみボタン */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            {text.expandAll}
          </button>
          <span className="text-stone-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {text.collapseAll}
          </button>
        </div>
      </div>

      {(() => {
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
                {text.fetchFailedTitle}
              </h3>
              <p className="text-red-600 mb-4">
                {text.fetchFailedBody.split("\n")[0]}
                <br />
                {text.fetchFailedBody.split("\n")[1]}
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
                  {text.refetchAll}
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
                {text.guidePromptTitle}
              </h3>
              <p className="text-stone-500">
                {text.guidePromptBody}
              </p>
            </div>
          );
        }

        return (
          <>
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
                      language={language}
                      isExpanded={expandedCategories.has(category)}
                      onToggle={() => toggleCategory(category)}
                      onRetry={
                        onRetryCategory
                          ? () => onRetryCategory(category)
                          : undefined
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
                  {text.disclaimer}
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  {text.disclaimerBody}
                </p>
                <p className="text-sm text-stone-500 mt-3">
                  {text.disclaimerOfficialPrefix}{" "}
                  <a
                    href="https://www.anzen.mofa.go.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    {text.mofa}
                  </a>{" "}
                  {text.disclaimerOfficialSuffix}
                </p>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

/**
 * カテゴリ別のセクション（ローディング/エラー/成功を個別に表示）
 */
function CategorySection({
  category,
  state,
  language,
  isExpanded,
  onToggle,
  onRetry,
}: {
  category: TravelInfoCategory;
  state: CategoryState;
  language: "ja" | "en";
  isExpanded: boolean;
  onToggle: () => void;
  onRetry?: () => void;
}) {
  const info = getCategoryInfo(category, language);
  const categoryLabel = info?.label || category;

  // If category info is undefined, use fallbacks
  if (!info) {
    // For unknown categories, show a warning-style error state
    if (state.status === "error") {
      return (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="p-6 bg-[#fffaf5] rounded-2xl border border-orange-100 border-l-4 border-l-orange-400"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-800 mb-1">
                {language === "ja"
                  ? `${categoryLabel}の取得に失敗しました`
                  : `Failed to fetch ${categoryLabel}`}
              </h3>
              <p className="text-orange-700 text-sm mb-4">
                {language === "ja" ? "不明なカテゴリです。" : "Unknown category."}
              </p>
            </div>
          </div>
        </motion.div>
      );
    }
    // For other states with unknown category, skip rendering
    return null;
  }

  // ローディング中
  if (state.status === "loading") {
    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="p-6 bg-[#fcfbf9] rounded-2xl border border-stone-200/60 border-l-4 border-l-stone-200"
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
        className="p-6 bg-[#fffaf5] rounded-2xl border border-orange-100 border-l-4 border-l-orange-400"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-orange-800 mb-1">
              {language === "ja"
                ? `${categoryLabel}の取得に失敗しました`
                : `Failed to fetch ${categoryLabel}`}
            </h3>
            <p className="text-orange-700 text-sm mb-4">
              {language === "ja"
                ? `申し訳ありません。${categoryLabel}の情報を取得できませんでした。`
                : `Sorry, we could not retrieve ${categoryLabel} information.`}
              <br />
              {language === "ja"
                ? "しばらく経ってから再度お試しください。"
                : "Please try again in a moment."}
            </p>
            {state.error && (
              <p className="text-orange-600 text-xs mb-4 bg-orange-100 p-2 rounded">
                {language === "ja" ? "エラー詳細" : "Error details"}: {state.error}
              </p>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {language === "ja" ? "再取得" : "Retry"}
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
      <CategoryContent
        category={category}
        data={entry.data}
        source={entry.source}
      />
    </InfoSection>
  );
}

/**
 * カテゴリに応じたコンテンツを表示
 */
function CategoryContent({
  category,
  data,
  source,
}: {
  category: TravelInfoCategory;
  data: unknown;
  source: CategoryDataEntry["source"];
}) {
  switch (category) {
    case "basic":
      return (
        <BasicInfoSection
          data={data as BasicCountryInfo}
          source={source}
        />
      );
    case "safety":
      return <SafetyInfoSection data={data as SafetyInfo} source={source} />;
    case "climate":
      return <ClimateInfoSection data={data as ClimateInfo} source={source} />;
    case "visa":
      return <VisaInfoSection data={data as VisaInfo} source={source} />;
    case "manner":
      return <MannerInfoSection data={data as MannerInfo} source={source} />;
    case "transport":
      return (
        <TransportInfoSection data={data as TransportInfo} source={source} />
      );
    case "local_food":
      return (
        <LocalFoodSection data={data as LocalFoodInfo} source={source} />
      );
    case "souvenir":
      return <SouvenirSection data={data as SouvenirInfo} source={source} />;
    case "events":
      return <EventsSection data={data as EventsInfo} source={source} />;
    case "technology":
      return (
        <TechnologySection data={data as TechnologyInfo} source={source} />
      );
    case "healthcare":
      return (
        <HealthcareSection data={data as HealthcareInfo} source={source} />
      );
    case "restrooms":
      return (
        <RestroomsSection data={data as RestroomsInfo} source={source} />
      );
    case "smoking":
      return <SmokingSection data={data as SmokingInfo} source={source} />;
    case "alcohol":
      return <AlcoholSection data={data as AlcoholInfo} source={source} />;
    default:
      return null;
  }
}
