"use client";

/**
 * TierComparisonTable — Free / Pro / Premium 3段比較テーブル
 *
 * プランの機能差を一覧で比較できる。
 * PricingPageClient から呼ばれる独立コンポーネント。
 */

import { FaCheck, FaTimes } from "react-icons/fa";
import { useTranslations } from "next-intl";
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
// Component
// ============================================================================

export function TierComparisonTable() {
  const t = useTranslations("components.billing.tierComparison");
  const currentFeatures = t.raw("rows") as ComparisonFeature[];
  const availableAria = t("availableAria");
  const unavailableAria = t("unavailableAria");
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
        {t("title")}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b-2 border-stone-200">
              <th className="text-left py-3 px-4 font-medium text-stone-600 w-1/4">
                {t("featureHeader")}
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
                key={`${feature.category ?? "common"}-${feature.label}`}
                feature={feature}
                showCategory={showCategory}
                availableAria={availableAria}
                unavailableAria={unavailableAria}
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
  availableAria,
  unavailableAria,
}: {
  feature: ComparisonFeature;
  showCategory: boolean;
  availableAria: string;
  unavailableAria: string;
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
          <CellValue
            value={feature.free}
            availableAria={availableAria}
            unavailableAria={unavailableAria}
          />
        </td>
        <td className="py-3 px-4 text-center text-primary font-medium">
          <CellValue
            value={feature.pro}
            highlight
            availableAria={availableAria}
            unavailableAria={unavailableAria}
          />
        </td>
        <td className="py-3 px-4 text-center text-amber-700 font-medium">
          <CellValue
            value={feature.premium}
            highlight
            availableAria={availableAria}
            unavailableAria={unavailableAria}
          />
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
  availableAria,
  unavailableAria,
}: {
  value: string | boolean;
  highlight?: boolean;
  availableAria: string;
  unavailableAria: string;
}) {
  if (typeof value === "boolean") {
    return value ? (
      <FaCheck
        className={`w-4 h-4 mx-auto ${highlight ? "text-green-500" : "text-green-400"}`}
        aria-label={availableAria}
      />
    ) : (
      <FaTimes
        className="w-4 h-4 mx-auto text-stone-300"
        aria-label={unavailableAria}
      />
    );
  }
  return <span>{value}</span>;
}
