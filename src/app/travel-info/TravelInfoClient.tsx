"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Info,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { FaPassport, FaPlane, FaGlobeAsia, FaStamp } from "react-icons/fa";
import { useRouter } from "next/navigation";
import type { TravelInfoCategory } from "@/lib/types/travel-info";
import { encodeTravelInfoUrl } from "@/lib/travelInfoUrlUtils";
import { CategorySelector } from "@/components/TravelInfo";

/**
 * 人気の目的地リスト
 */
const POPULAR_DESTINATIONS = [
  { name: "パリ", country: "フランス" },
  { name: "ソウル", country: "韓国" },
  { name: "バンコク", country: "タイ" },
  { name: "ニューヨーク", country: "アメリカ" },
  { name: "台北", country: "台湾" },
  { name: "シンガポール", country: "シンガポール" },
];

/**
 * TravelInfoClient - 渡航情報ページのメインクライアントコンポーネント
 *
 * カテゴリ選択と検索フォームを提供
 * トラベルジャーナル（旅行日記）風のUIデザイン
 */
export default function TravelInfoClient() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    TravelInfoCategory[]
  >(["basic", "safety", "climate"]);
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
        console.warn("[TravelInfoClient] 検索失敗: 目的地が入力されていません");
        return;
      }

      if (selectedCategories.length === 0) {
        console.warn(
          "[TravelInfoClient] 検索失敗: カテゴリが選択されていません"
        );
        return;
      }

      // 遷移中フラグを設定
      setIsNavigating(true);

      // URLを生成して即座に遷移
      const targetUrl = encodeTravelInfoUrl(
        trimmedDestination,
        selectedCategories
      );
      router.push(targetUrl);
    },
    [destination, selectedCategories, router]
  );

  /**
   * 人気の目的地を選択
   */
  const handlePopularDestination = (name: string) => {
    setDestination(name);
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] relative overflow-hidden">
      {/* 背景テクスチャ */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none fixed" />

      {/* 装飾的な背景要素 */}
      <div className="absolute top-20 right-10 opacity-10 pointer-events-none rotate-12 hidden lg:block">
        <FaPassport size={200} className="text-primary" />
      </div>
      <div className="absolute bottom-40 left-10 opacity-5 pointer-events-none -rotate-12 hidden lg:block">
        <FaGlobeAsia size={240} className="text-stone-600" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full pt-16 pb-12 sm:pt-24 sm:pb-16 z-10">
        <div className="max-w-5xl mx-auto px-4 text-center relative">
          {/* 浮遊する装飾アイコン */}
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="absolute top-0 left-[10%] sm:left-[20%] text-primary/40 hidden sm:block"
          >
            <FaPlane size={40} />
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
            transition={{
              repeat: Infinity,
              duration: 6,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute top-10 right-[15%] text-stone-400 hidden sm:block"
          >
            <FaStamp size={32} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/50 border border-orange-200 text-orange-800 text-sm font-bold tracking-wider mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Travel Support Guide</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#2c2c2c] leading-tight drop-shadow-sm">
              渡航情報・安全ガイド
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 font-hand max-w-2xl mx-auto leading-relaxed">
              旅の準備は、安心を集めることから。
              <br className="hidden sm:block" />
              知りたい国や都市の情報を、あなたのノートに書き留めるように。
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
            className="relative bg-white/90 backdrop-blur-sm rounded-sm sm:rounded-xl border border-stone-200 p-6 sm:p-10 shadow-xl sm:rotate-1"
          >
            {/* ピン留め風装飾 */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-orange-200/50 backdrop-blur-md shadow-sm rotate-[-1deg] hidden sm:block"></div>

            <form onSubmit={handleSearch} className="space-y-10">
              {/* 目的地入力 */}
              <div className="space-y-4">
                <label
                  htmlFor="destination"
                  className="flex items-center gap-2 text-xl font-bold text-[#2c2c2c] font-serif"
                >
                  <MapPin className="w-6 h-6 text-primary" />
                  <span>目的地を決める</span>
                </label>

                <div className="relative group">
                  <input
                    type="text"
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="どこへ行きますか？（例: パリ、バンコク）"
                    className="w-full bg-white border border-stone-200 px-6 py-4 text-xl sm:text-2xl font-serif text-stone-800 placeholder:text-stone-400 placeholder:font-hand focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-full shadow-sm"
                    disabled={isNavigating}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <Search className="w-6 h-6" />
                  </div>
                </div>

                {/* 人気の目的地 - 付箋風 */}
                <div className="pt-2">
                  <p className="text-sm text-stone-500 font-hand mb-3 ml-1">
                    人気の目的地から選ぶ:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {POPULAR_DESTINATIONS.map((dest, i) => (
                      <button
                        key={dest.name}
                        type="button"
                        onClick={() => handlePopularDestination(dest.name)}
                        className="
                          px-4 py-2 text-sm sm:text-base font-hand text-stone-600
                          bg-white border border-stone-200 hover:border-primary/50 hover:text-primary
                          shadow-sm hover:shadow-md rounded-full
                          transition-all duration-300 transform hover:-translate-y-0.5
                        "
                      >
                        {dest.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* カテゴリ選択 */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-xl font-bold text-[#2c2c2c] font-serif">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  <span>知りたいことを選ぶ</span>
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
                  className="group relative w-full sm:w-auto min-w-[280px]"
                >
                  <div className="absolute inset-0 bg-stone-800 rounded-full translate-y-1 transition-transform group-hover:translate-y-2 group-disabled:translate-y-0" />
                  <div className="relative bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-serif font-bold py-4 px-10 rounded-full transition-all group-hover:-translate-y-1 group-disabled:translate-y-0 group-disabled:from-stone-400 group-disabled:to-stone-400 group-disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg sm:text-xl shadow-lg">
                    <span>
                      {isNavigating ? "ページをめくっています..." : "検索する"}
                    </span>
                    {!isNavigating && <ArrowRight className="w-6 h-6" />}
                  </div>
                </button>

                <p className="text-sm text-stone-500 flex items-center gap-2 font-hand">
                  <Info className="w-4 h-4" />
                  <span>
                    AIが最新の情報を収集して、あなただけのガイドを作成します
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
                3ステップで完了
              </span>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-stone-300 z-0"></div>
            </h2>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 max-w-3xl mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-3 w-full md:w-1/3">
                <div className="w-20 h-20 bg-white rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-primary shadow-sm">
                  <MapPin className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-800">
                    目的地を入力
                  </h3>
                  <p className="text-stone-500 text-sm font-hand">
                    行きたい国や都市を
                    <br />
                    入力します
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
                <div className="w-20 h-20 bg-white rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-primary shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-800">
                    カテゴリを選択
                  </h3>
                  <p className="text-stone-500 text-sm font-hand">
                    知りたい情報だけを
                    <br />
                    ピックアップ
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
                <div className="w-20 h-20 bg-white rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-primary shadow-sm">
                  <FaPassport className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-800">
                    ガイドを作成
                  </h3>
                  <p className="text-stone-500 text-sm font-hand">
                    AIが情報をまとめて
                    <br />
                    表示します
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
