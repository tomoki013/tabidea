"use client";

import Link from "next/link";
import { FaRobot, FaPlane, FaArrowRight } from "react-icons/fa";

/**
 * オーガニック検索からの訪問者に対してTabideaをプロモーションするバナーコンポーネント
 * サンプルプラン詳細ページに配置し、AIによる旅程作成機能をアピールする
 */
export default function AIPromotionBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#e67e22] via-[#f39c12] to-[#e67e22] shadow-xl mb-8">
      {/* 装飾用背景パターン */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px)] bg-size-[32px_32px]" />
      </div>

      {/* 装飾用飛行機アイコン */}
      <div className="absolute top-4 right-4 text-white/20 text-6xl transform rotate-12">
        <FaPlane />
      </div>

      <div className="relative z-10 px-6 py-8 md:px-10 md:py-10">
        {/* ブランドロゴエリア */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm">
            <FaRobot className="text-white text-2xl" />
          </div>
          <div>
            <span className="block text-white/80 text-xs font-bold tracking-widest uppercase">
              Powered by AI
            </span>
            <span className="block text-white text-xl font-serif font-bold tracking-tight">
              Tabidea
            </span>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="mb-6">
          <h2 className="text-white text-lg md:text-2xl font-bold mb-2 leading-tight">
            このプランはAIが作成しました
          </h2>
          <p className="text-white/90 text-sm md:text-base leading-relaxed">
            Tabidea(タビデア)なら、あなたの希望に合わせた
            <br className="hidden md:block" />
            オリジナル旅行プランを<strong>無料</strong>で作成できます
          </p>
        </div>

        {/* 特徴リスト */}
        <div className="flex flex-wrap gap-3 mb-6">
          {["目的地を選ぶだけ", "日程・同行者に最適化", "即座にプラン生成"].map(
            (feature, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs md:text-sm font-medium"
              >
                ✓ {feature}
              </span>
            )
          )}
        </div>

        {/* CTAボタン */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#e67e22] font-bold text-sm md:text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
        >
          <span>今すぐ無料でプランを作成</span>
          <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

/**
 * コンパクト版プロモーションバナー
 * ページ下部のCTAとして使用
 */
export function AIPromotionBannerCompact() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-linear-to-r from-[#2c2c2c] to-[#3d3d3d] shadow-lg mt-8">
      <div className="relative z-10 px-6 py-6 md:px-8 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* 左側：メッセージ */}
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-[#e67e22]/20">
            <FaRobot className="text-[#e67e22] text-lg" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base md:text-lg mb-0.5">
              あなたもAIで旅行プランを作ってみませんか？
            </h3>
            <p className="text-stone-400 text-sm">
              TabideaのAIが、あなただけの旅程を提案します
            </p>
          </div>
        </div>

        {/* 右側：CTAボタン */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#e67e22] text-white font-bold text-sm shadow-md hover:bg-[#d35400] transition-all duration-300 hover:shadow-lg whitespace-nowrap group"
        >
          <span>プランを作成する</span>
          <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
