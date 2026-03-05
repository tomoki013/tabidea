"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Search,
  Info,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { FaPassport } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import type { TravelInfoCategory } from '@/types';
import { encodeTravelInfoUrl } from "@/lib/utils";
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  localizePath,
} from "@/lib/i18n/locales";
import { CategorySelector } from "@/components/features/travel-info";

/**
 * TravelInfoClient - 渡航情報ページのメインクライアントコンポーネント
 *
 * カテゴリ選択と検索フォームを提供
 * トラベルジャーナル（旅行日記）風のUIデザイン
 */
export default function TravelInfoClient() {
  const router = useRouter();
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const t = useTranslations("pages.info.travelInfoClient");
  const popularDestinationsRaw = t.raw("popularDestinationItems");
  const popularDestinations = Array.isArray(popularDestinationsRaw)
    ? popularDestinationsRaw.filter(
        (
          destination
        ): destination is { name: string; country: string } =>
          typeof destination === "object" &&
          destination !== null &&
          "name" in destination &&
          "country" in destination &&
          typeof destination.name === "string" &&
          typeof destination.country === "string"
      )
    : [];
  const [destination, setDestination] = useState("");
  // Initial categories match MANDATORY_CATEGORIES in CategorySelector
  // basic: 基本情報, safety: 治安, manner: マナー
  const [selectedCategories, setSelectedCategories] = useState<
    TravelInfoCategory[]
  >(["basic", "safety", "manner"]);
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * 渡航情報を検索（即座にページ遷移）
   */
  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmedDestination = destination.trim();

      // バリデーション
      if (!trimmedDestination) {
        console.warn("[TravelInfoClient] destination_required");
        return;
      }

      if (selectedCategories.length === 0) {
        console.warn("[TravelInfoClient] category_required");
        return;
      }

      // 遷移中フラグを設定
      setIsNavigating(true);

      // URLを生成して即座に遷移
      const targetUrl = encodeTravelInfoUrl(
        trimmedDestination,
        selectedCategories
      );
      router.push(localizePath(targetUrl, language));
    },
    [destination, language, selectedCategories, router]
  );

  /**
   * 人気の目的地を選択
   */
  const handlePopularDestination = (name: string) => {
    setDestination(name);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full pt-32 pb-12 sm:pb-16 z-10">
        <div className="max-w-5xl mx-auto px-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/50 border border-orange-200 text-orange-800 text-sm font-bold tracking-wider mb-4">
              <Sparkles className="w-4 h-4" />
              <span>{t("badge")}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#2c2c2c] leading-tight drop-shadow-sm">
              {t("heroTitle")}
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 font-sans max-w-2xl mx-auto leading-relaxed">
              {t("heroLead1")}
              <br className="hidden sm:block" />
              {t("heroLead2")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-20 sm:pb-32 relative z-10">
        <div className="space-y-12">
          {/* Search Form - Journal Style */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-white/90 backdrop-blur-sm rounded-xl border border-stone-200 p-6 sm:p-10 shadow-xl"
          >
            <form onSubmit={handleSearch} className="space-y-10">
              {/* 目的地入力 */}
              <div className="space-y-4">
                <label
                  htmlFor="destination"
                  className="flex items-center gap-2 text-xl font-bold text-[#2c2c2c] font-serif"
                >
                  <MapPin className="w-6 h-6 text-primary" />
                  <span>{t("destinationLabel")}</span>
                </label>

                <div className="relative group max-w-2xl mx-auto w-full">
                  <input
                    type="text"
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={t("destinationPlaceholder")}
                    className="w-full bg-stone-50 border border-stone-200 px-6 py-4 pl-12 text-lg sm:text-xl font-bold text-stone-800 placeholder:text-stone-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all rounded-full shadow-inner"
                    disabled={isNavigating}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <Search className="w-5 h-5" />
                  </div>
                </div>

                {/* 人気の目的地 - Minimal & Stylish */}
                <div className="pt-2">
                  <p className="text-xs text-stone-400 font-sans mb-3 ml-1 tracking-widest uppercase">
                    {t("popularDestinations")}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-3">
                    {popularDestinations.map((dest) => (
                      <button
                        key={dest.name}
                        type="button"
                        onClick={() => handlePopularDestination(dest.name)}
                        className="
                          group text-sm font-medium text-stone-500 hover:text-primary transition-colors relative font-sans
                        "
                      >
                        <span className="relative z-10">#{dest.name}</span>
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full opacity-50" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* カテゴリ選択 */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xl font-bold text-[#2c2c2c] font-serif">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <span>{t("categoriesLabel")}</span>
                </label>
                <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100">
                  <CategorySelector
                    selectedCategories={selectedCategories}
                    onSelectionChange={setSelectedCategories}
                    disabled={isNavigating}
                  />
                </div>
              </div>

              {/* 検索ボタン */}
              <div className="flex flex-col items-center gap-6 pt-4">
                <button
                  type="submit"
                  disabled={
                    isNavigating ||
                    !destination.trim() ||
                    selectedCategories.length === 0
                  }
                  className="
                    relative w-full sm:w-auto min-w-[280px]
                    bg-primary hover:bg-[#d35400] text-white
                    font-serif font-bold py-4 px-10 rounded-full
                    transition-all duration-300
                    shadow-lg hover:shadow-xl hover:-translate-y-0.5
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
                    flex items-center justify-center gap-3 text-lg sm:text-xl
                  "
                >
                  <span>
                    {isNavigating ? t("searching") : t("createGuide")}
                  </span>
                  {!isNavigating && <ArrowRight className="w-6 h-6" />}
                </button>

                <p className="text-sm text-stone-500 flex items-center gap-2 font-sans">
                  <Info className="w-4 h-4" />
                  <span>
                    {t("guideDesc")}
                  </span>
                </p>
              </div>
            </form>
          </motion.section>

          {/* How to Use - Visual Flow */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="py-10"
          >
            <h2 className="text-2xl font-serif font-bold text-stone-700 text-center mb-10 relative">
              <span className="relative z-10 bg-[#fcfbf9] px-6">
                {t("doneInThreeSteps")}
              </span>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-stone-300 z-0"></div>
            </h2>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 max-w-3xl mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-3 w-full md:w-1/3">
                <div className="w-20 h-20 bg-white rounded-full border border-stone-200 flex items-center justify-center text-primary shadow-sm">
                  <MapPin className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-800">
                    {t("step1Title")}
                  </h3>
                  <p className="text-stone-500 text-sm font-sans">
                    {t("step1Body").split("\n")[0]}
                    <br />
                    {t("step1Body").split("\n")[1]}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:block text-stone-300">
                <ArrowRight className="w-8 h-8" />
              </div>
              <div className="md:hidden text-stone-300 rotate-90 my-2">
                <ArrowRight className="w-8 h-8" />
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center space-y-3 w-full md:w-1/3">
                <div className="w-20 h-20 bg-white rounded-full border border-stone-200 flex items-center justify-center text-primary shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-800">
                    {t("step2Title")}
                  </h3>
                  <p className="text-stone-500 text-sm font-sans">
                    {t("step2Body").split("\n")[0]}
                    <br />
                    {t("step2Body").split("\n")[1]}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:block text-stone-300">
                <ArrowRight className="w-8 h-8" />
              </div>
              <div className="md:hidden text-stone-300 rotate-90 my-2">
                <ArrowRight className="w-8 h-8" />
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center space-y-3 w-full md:w-1/3">
                <div className="w-20 h-20 bg-white rounded-full border border-stone-200 flex items-center justify-center text-primary shadow-sm">
                  <FaPassport className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-800">
                    {t("step3Title")}
                  </h3>
                  <p className="text-stone-500 text-sm font-sans">
                    {t("step3Body").split("\n")[0]}
                    <br />
                    {t("step3Body").split("\n")[1]}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
