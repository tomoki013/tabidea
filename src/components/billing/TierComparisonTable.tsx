"use client";

/**
 * TierComparisonTable — Free / Pro / Premium 3段比較テーブル
 *
 * プランの機能差を一覧で比較できる。
 * PricingPageClient から呼ばれる独立コンポーネント。
 */

import { FaCheck, FaTimes } from "react-icons/fa";
import { PRO_PLAN_NAME, PREMIUM_PLAN_NAME } from "@/lib/billing/constants";

// ============================================================================
// Types
// ============================================================================

interface ComparisonFeature {
  /** 機能名 */
  label: string;
  /** Free プランの値 */
  free: string | boolean;
  /** Pro プランの値 */
  pro: string | boolean;
  /** Premium プランの値 */
  premium: string | boolean;
  /** カテゴリ（セクション分け用） */
  category?: string;
}

interface TierComparisonTableProps {
  language: "ja" | "en";
}

// ============================================================================
// Data
// ============================================================================

const COMPARISON_FEATURES: ComparisonFeature[] = [
  // 基本
  { label: "プラン生成", free: "月3回", pro: "月30回", premium: "月100回", category: "基本" },
  { label: "プラン保存数", free: "無制限", pro: "無制限", premium: "無制限" },
  // 渡航情報
  { label: "渡航情報取得", free: "週1回", pro: "月10回", premium: "無制限", category: "渡航情報" },
  { label: "渡航情報カテゴリ", free: "3カテゴリ", pro: "3カテゴリ", premium: "全カテゴリ" },
  { label: "プラン内渡航情報表示", free: false, pro: true, premium: true },
  // マップ & 検索
  { label: "マップ表示", free: "静的マップ", pro: "Leaflet対話型", premium: "Google Maps フル機能", category: "マップ & 検索" },
  { label: "Places 詳細取得", free: "なし", pro: "10件/プラン", premium: "無制限" },
  { label: "航空券・ホテル候補", free: "なし", pro: "3件", premium: "7件" },
  // AI & カスタマイズ
  { label: "AIプロバイダー選択", free: false, pro: false, premium: true, category: "AI & カスタマイズ" },
  { label: "旅のスタイル設定", free: false, pro: true, premium: true },
  { label: "カスタム指示 (AI)", free: true, pro: true, premium: true },
  { label: "持ち物リスト閲覧", free: false, pro: true, premium: true },
];

const COMPARISON_FEATURES_EN: ComparisonFeature[] = [
  { label: "Plan generation", free: "3/month", pro: "30/month", premium: "100/month", category: "Core" },
  { label: "Saved plans", free: "Unlimited", pro: "Unlimited", premium: "Unlimited" },
  { label: "Travel info fetch", free: "1/week", pro: "10/month", premium: "Unlimited", category: "Travel Info" },
  { label: "Travel info categories", free: "3 categories", pro: "3 categories", premium: "All categories" },
  { label: "Travel info in plan view", free: false, pro: true, premium: true },
  { label: "Map mode", free: "Static map", pro: "Interactive Leaflet", premium: "Full Google Maps", category: "Map & Search" },
  { label: "Places detail fetch", free: "None", pro: "10/plan", premium: "Unlimited" },
  { label: "Flight/Hotel candidates", free: "None", pro: "3", premium: "7" },
  { label: "AI provider selection", free: false, pro: false, premium: true, category: "AI & Personalization" },
  { label: "Travel style settings", free: false, pro: true, premium: true },
  { label: "Custom AI instructions", free: true, pro: true, premium: true },
  { label: "Packing list access", free: false, pro: true, premium: true },
];

// ============================================================================
// Component
// ============================================================================

export function TierComparisonTable({ language }: TierComparisonTableProps) {
  const currentFeatures = language === "ja" ? COMPARISON_FEATURES : COMPARISON_FEATURES_EN;
  const rows = currentFeatures.map((feature, index, features) => ({
    feature,
    showCategory: Boolean(
      feature.category &&
        (index === 0 || feature.category !== features[index - 1]?.category),
    ),
  }));

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-6 sm:p-8">
      <h2 className="text-xl font-bold text-stone-800 text-center mb-6">
        {language === "ja" ? "プラン比較" : "Plan Comparison"}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b-2 border-stone-200">
              <th className="text-left py-3 px-4 font-medium text-stone-600 w-1/4">
                {language === "ja" ? "機能" : "Feature"}
              </th>
              <th className="text-center py-3 px-4 font-medium text-stone-600 w-1/4">
                Free
              </th>
              <th className="text-center py-3 px-4 font-medium text-primary w-1/4">
                {PRO_PLAN_NAME}
              </th>
              <th className="text-center py-3 px-4 font-medium text-amber-600 w-1/4">
                {PREMIUM_PLAN_NAME}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ feature, showCategory }) => (
              <ComparisonRow
                key={feature.label}
                feature={feature}
                showCategory={showCategory}
                language={language}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Row
// ============================================================================

function ComparisonRow({
  feature,
  showCategory,
  language,
}: {
  feature: ComparisonFeature;
  showCategory: boolean;
  language: "ja" | "en";
}) {
  return (
    <>
      {showCategory && feature.category && (
        <tr>
          <td
            colSpan={4}
            className="pt-5 pb-2 px-4 text-xs font-bold text-stone-400 uppercase tracking-wider"
          >
            {feature.category}
          </td>
        </tr>
      )}
      <tr className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
        <td className="py-3 px-4 text-stone-700">{feature.label}</td>
        <td className="py-3 px-4 text-center text-stone-600">
          <CellValue value={feature.free} language={language} />
        </td>
        <td className="py-3 px-4 text-center text-primary font-medium">
          <CellValue value={feature.pro} highlight language={language} />
        </td>
        <td className="py-3 px-4 text-center text-amber-700 font-medium">
          <CellValue value={feature.premium} highlight language={language} />
        </td>
      </tr>
    </>
  );
}

// ============================================================================
// Cell Value
// ============================================================================

function CellValue({
  value,
  highlight = false,
  language,
}: {
  value: string | boolean;
  highlight?: boolean;
  language: "ja" | "en";
}) {
  if (typeof value === "boolean") {
    return value ? (
      <FaCheck
        className={`w-4 h-4 mx-auto ${highlight ? "text-green-500" : "text-green-400"}`}
        aria-label={language === "ja" ? "あり" : "available"}
      />
    ) : (
      <FaTimes
        className="w-4 h-4 mx-auto text-stone-300"
        aria-label={language === "ja" ? "なし" : "not available"}
      />
    );
  }
  return <span>{value}</span>;
}
