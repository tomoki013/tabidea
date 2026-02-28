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
  { label: "マップ表示", free: "静的リスト", pro: "Leaflet対話型", premium: "Google Maps フル機能", category: "マップ & 検索" },
  { label: "Places 詳細取得", free: "なし", pro: "10件/プラン", premium: "無制限" },
  { label: "航空券・ホテル候補", free: "なし", pro: "3件", premium: "7件" },
  // AI & カスタマイズ
  { label: "AIプロバイダー選択", free: false, pro: false, premium: true, category: "AI & カスタマイズ" },
  { label: "旅のスタイル設定", free: false, pro: true, premium: true },
  { label: "カスタム指示 (AI)", free: true, pro: true, premium: true },
  { label: "持ち物リスト閲覧", free: false, pro: true, premium: true },
];

// ============================================================================
// Component
// ============================================================================

export function TierComparisonTable() {
  let lastCategory: string | undefined;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-6 sm:p-8">
      <h2 className="text-xl font-bold text-stone-800 text-center mb-6">
        プラン比較
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b-2 border-stone-200">
              <th className="text-left py-3 px-4 font-medium text-stone-600 w-1/4">
                機能
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
            {COMPARISON_FEATURES.map((feature) => {
              const showCategory = Boolean(
                feature.category && feature.category !== lastCategory
              );
              if (feature.category) lastCategory = feature.category;

              return (
                <ComparisonRow
                  key={feature.label}
                  feature={feature}
                  showCategory={showCategory}
                />
              );
            })}
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
}: {
  feature: ComparisonFeature;
  showCategory: boolean;
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
          <CellValue value={feature.free} />
        </td>
        <td className="py-3 px-4 text-center text-primary font-medium">
          <CellValue value={feature.pro} highlight />
        </td>
        <td className="py-3 px-4 text-center text-amber-700 font-medium">
          <CellValue value={feature.premium} highlight />
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
}: {
  value: string | boolean;
  highlight?: boolean;
}) {
  if (typeof value === "boolean") {
    return value ? (
      <FaCheck
        className={`w-4 h-4 mx-auto ${highlight ? "text-green-500" : "text-green-400"}`}
        aria-label="あり"
      />
    ) : (
      <FaTimes className="w-4 h-4 mx-auto text-stone-300" aria-label="なし" />
    );
  }
  return <span>{value}</span>;
}
