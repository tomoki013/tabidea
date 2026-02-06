/**
 * コスト計算ロジック
 * UserInputとItineraryから旅費の概算を計算
 */

import {
  mapBudgetLevel,
  DOMESTIC_COSTS,
  OVERSEAS_COSTS,
  getRegionMultiplier,
  SAVING_TIPS,
  type BudgetLevel,
  type CostPerDay,
} from '@/data/cost-estimates';
import { isDomesticDestination } from './affiliate-links';

// ============================================
// Types
// ============================================

export interface CostBreakdown {
  accommodation: { min: number; max: number };
  meals: { min: number; max: number };
  transport: { min: number; max: number };
  activities: { min: number; max: number };
}

export interface CostEstimateResult {
  /** 合計金額の範囲 */
  total: { min: number; max: number };
  /** 項目別内訳 */
  breakdown: CostBreakdown;
  /** 1日あたりの金額 */
  perDay: { min: number; max: number };
  /** 旅行日数 */
  days: number;
  /** 泊数 */
  nights: number;
  /** 予算レベル */
  budgetLevel: BudgetLevel;
  /** 国内/海外 */
  isDomestic: boolean;
  /** 地域係数 */
  regionMultiplier: number;
  /** 節約のコツ */
  savingTips: string[];
  /** 通貨 */
  currency: string;
}

// ============================================
// Main Function
// ============================================

/**
 * 旅行コストを概算計算
 */
export function calculateTravelCost(params: {
  destination: string;
  days: number;
  budget: string;
  companions: string;
  region?: string;
}): CostEstimateResult {
  const { destination, days, budget, companions, region } = params;

  const budgetLevel = mapBudgetLevel(budget);
  const isDomestic =
    region === 'domestic' || isDomesticDestination(destination);
  const nights = Math.max(0, days - 1);

  // コストテーブル選択
  const costTable: CostPerDay = isDomestic
    ? DOMESTIC_COSTS[budgetLevel]
    : OVERSEAS_COSTS[budgetLevel];

  // 地域係数
  const multiplier = getRegionMultiplier(destination);

  // 人数推定
  const personCount = estimatePersonCount(companions);

  // 項目別計算
  const accommodation = {
    min: Math.round(costTable.accommodation.min * nights * multiplier),
    max: Math.round(costTable.accommodation.max * nights * multiplier),
  };

  const meals = {
    min: Math.round(costTable.meals.min * days * multiplier * personCount),
    max: Math.round(costTable.meals.max * days * multiplier * personCount),
  };

  const transport = {
    min: Math.round(costTable.transport.min * days * multiplier),
    max: Math.round(costTable.transport.max * days * multiplier),
  };

  const activities = {
    min: Math.round(costTable.activities.min * days * multiplier * personCount),
    max: Math.round(costTable.activities.max * days * multiplier * personCount),
  };

  const breakdown: CostBreakdown = {
    accommodation,
    meals,
    transport,
    activities,
  };

  const totalMin =
    accommodation.min + meals.min + transport.min + activities.min;
  const totalMax =
    accommodation.max + meals.max + transport.max + activities.max;

  return {
    total: { min: totalMin, max: totalMax },
    breakdown,
    perDay: {
      min: days > 0 ? Math.round(totalMin / days) : 0,
      max: days > 0 ? Math.round(totalMax / days) : 0,
    },
    days,
    nights,
    budgetLevel,
    isDomestic,
    regionMultiplier: multiplier,
    savingTips: SAVING_TIPS[budgetLevel],
    currency: 'JPY',
  };
}

// ============================================
// Helpers
// ============================================

/**
 * 同行者の文字列から人数を推定
 */
function estimatePersonCount(companions: string): number {
  if (!companions) return 1;

  const normalized = companions.toLowerCase();

  if (normalized.includes('1人') || normalized.includes('ひとり') || normalized.includes('一人') || normalized.includes('ソロ')) {
    return 1;
  }
  if (normalized.includes('カップル') || normalized.includes('夫婦') || normalized.includes('2人') || normalized.includes('二人')) {
    return 2;
  }
  if (normalized.includes('家族') || normalized.includes('ファミリー')) {
    return 4;
  }
  if (normalized.includes('グループ') || normalized.includes('友人')) {
    return 3;
  }

  // 数値を直接抽出
  const numMatch = companions.match(/(\d+)/);
  if (numMatch) {
    return Math.min(parseInt(numMatch[1], 10), 10);
  }

  return 2; // デフォルト
}

/**
 * 金額をフォーマット
 */
export function formatCurrency(amount: number, currency = 'JPY'): string {
  if (currency === 'JPY') {
    return `¥${amount.toLocaleString('ja-JP')}`;
  }
  return `${amount.toLocaleString()}`;
}

/**
 * 金額範囲をフォーマット
 */
export function formatCostRange(
  min: number,
  max: number,
  currency = 'JPY'
): string {
  return `${formatCurrency(min, currency)} 〜 ${formatCurrency(max, currency)}`;
}
