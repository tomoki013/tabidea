/**
 * Step 4: Feasibility Scorer
 * 純粋 TypeScript — 外部 API 不使用
 * 5 軸スコアリングでスポット候補の実現可能性を評価
 */

import type { PlaceDetails } from '@/types/places';
import type {
  NormalizedRequest,
  ResolvedPlaceGroup,
  ScoredPlace,
  SelectedStop,
  FeasibilityScoreBreakdown,
  SemanticCandidate,
  BudgetLevel,
  TimeSlotHint,
} from '@/types/compose-pipeline';
import { haversineDistance } from '@/lib/services/google/distance-estimator';

// ============================================
// Constants
// ============================================

/** デフォルトのフィルタ閾値 */
const DEFAULT_THRESHOLD = 30;

/** 予算レベルと priceLevel のマッピング */
const BUDGET_PRICE_MAP: Record<BudgetLevel, number[]> = {
  budget: [0, 1],
  standard: [1, 2],
  premium: [2, 3],
  luxury: [3, 4],
};

/** 時間帯と営業時間の期待 (24h) */
const TIME_SLOT_HOURS: Record<TimeSlotHint, { start: number; end: number }> = {
  morning: { start: 8, end: 12 },
  midday: { start: 11, end: 14 },
  afternoon: { start: 13, end: 17 },
  evening: { start: 17, end: 21 },
  night: { start: 20, end: 24 },
  flexible: { start: 9, end: 18 },
};

// ============================================
// Public API
// ============================================

/**
 * ResolvedPlaceGroup[] をスコアリングし、SelectedStop[] を返す
 */
export function scoreAndSelect(
  groups: ResolvedPlaceGroup[],
  request: NormalizedRequest,
  prevLatLng?: { lat: number; lng: number },
  threshold: number = DEFAULT_THRESHOLD
): { selected: SelectedStop[]; filtered: ScoredPlace[] } {
  const selected: SelectedStop[] = [];
  const filtered: ScoredPlace[] = [];

  let currentLatLng = prevLatLng;

  for (const group of groups) {
    if (!group.success || group.resolved.length === 0) {
      // Resolve 失敗: 候補を matchScore: 0 で通す (graceful degradation)
      selected.push({
        candidate: group.candidate,
        placeDetails: undefined,
        feasibilityScore: 0,
        warnings: [group.error || 'Place resolve failed'],
      });
      continue;
    }

    // 各候補をスコアリング
    const scored: ScoredPlace[] = group.resolved.map((resolved) => {
      const breakdown = scorePlaceCandidate(
        group.candidate,
        resolved.placeDetails,
        request,
        currentLatLng
      );
      const totalScore =
        breakdown.openHoursMatch +
        breakdown.ratingQuality +
        breakdown.budgetMatch +
        breakdown.categoryRelevance +
        breakdown.distanceFromPrev;

      const warnings: string[] = [];
      if (breakdown.openHoursMatch === 0) {
        warnings.push('営業時間データなし — 要確認');
      }
      if (resolved.placeDetails.businessStatus === 'CLOSED_TEMPORARILY') {
        warnings.push('一時休業中');
      }
      if (resolved.placeDetails.businessStatus === 'CLOSED_PERMANENTLY') {
        warnings.push('閉業済み');
      }

      return {
        candidate: group.candidate,
        placeDetails: resolved.placeDetails,
        totalScore,
        breakdown,
        warnings,
      };
    });

    // 最高スコアの候補を選出
    scored.sort((a, b) => b.totalScore - a.totalScore);
    const best = scored[0];

    if (best.totalScore >= threshold) {
      selected.push({
        candidate: best.candidate,
        placeDetails: best.placeDetails,
        feasibilityScore: best.totalScore,
        warnings: best.warnings,
      });

      // 次の候補の距離計算用に位置を更新
      if (best.placeDetails) {
        currentLatLng = {
          lat: best.placeDetails.latitude,
          lng: best.placeDetails.longitude,
        };
      }
    } else {
      filtered.push(best);
    }
  }

  return { selected, filtered };
}

/**
 * Place 照合なしの場合: SemanticCandidate をそのまま SelectedStop に変換
 */
export function candidatesToStops(
  candidates: SemanticCandidate[]
): SelectedStop[] {
  return candidates.map((candidate) => ({
    candidate,
    placeDetails: undefined,
    feasibilityScore: 50, // デフォルトスコア
    warnings: [],
  }));
}

// ============================================
// Internal scoring functions
// ============================================

function scorePlaceCandidate(
  candidate: SemanticCandidate,
  place: PlaceDetails,
  request: NormalizedRequest,
  prevLatLng?: { lat: number; lng: number }
): FeasibilityScoreBreakdown {
  return {
    openHoursMatch: scoreOpenHours(candidate.timeSlotHint, place.openingHours),
    ratingQuality: scoreRating(place.rating, place.userRatingsTotal),
    budgetMatch: scoreBudget(request.budgetLevel, place.priceLevel),
    categoryRelevance: scoreCategoryRelevance(request.themes, place.types, candidate.categoryHint),
    distanceFromPrev: scoreDistance(place, prevLatLng),
  };
}

/**
 * 営業時間マッチ (0-25)
 */
function scoreOpenHours(
  timeSlot: TimeSlotHint,
  openingHours?: { periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }> }
): number {
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    // 営業時間データなし: 中程度のスコア
    return 12;
  }

  const expected = TIME_SLOT_HOURS[timeSlot];
  const midHour = (expected.start + expected.end) / 2;

  // いずれかの period が訪問予定時間帯をカバーしているかチェック
  for (const period of openingHours.periods) {
    const openHour = parseTimeToHour(period.open.time);
    const closeHour = period.close
      ? parseTimeToHour(period.close.time)
      : 24;

    // 訪問予定時間帯の中央が営業時間内か
    if (openHour <= midHour && closeHour >= midHour) {
      return 25;
    }

    // 部分的に重なるか
    if (openHour < expected.end && closeHour > expected.start) {
      return 18;
    }
  }

  return 5; // 営業時間外
}

/**
 * 評価品質 (0-20): rating × log(1 + userRatingsTotal)
 */
function scoreRating(rating?: number, userRatingsTotal?: number): number {
  if (!rating) return 10; // データなし: 中程度

  const normalizedRating = Math.min(rating / 5, 1); // 0-1
  const reviewWeight = Math.log(1 + (userRatingsTotal || 0)) / Math.log(1 + 10000);
  const clamped = Math.min(reviewWeight, 1);

  return Math.round(normalizedRating * 12 + clamped * 8);
}

/**
 * 予算マッチ (0-20)
 */
function scoreBudget(
  budgetLevel: BudgetLevel,
  priceLevel?: number
): number {
  if (priceLevel === undefined) return 15; // データなし: やや高め

  const expectedRange = BUDGET_PRICE_MAP[budgetLevel];
  if (priceLevel >= expectedRange[0] && priceLevel <= expectedRange[1]) {
    return 20; // 完全マッチ
  }

  const distance = Math.min(
    Math.abs(priceLevel - expectedRange[0]),
    Math.abs(priceLevel - expectedRange[1])
  );

  return Math.max(0, 20 - distance * 8);
}

/**
 * カテゴリ関連度 (0-20)
 */
function scoreCategoryRelevance(
  themes: string[],
  placeTypes?: string[],
  categoryHint?: string
): number {
  if (!placeTypes || placeTypes.length === 0) return 10;

  // テーマとカテゴリの関連マッピング
  const themeToTypes: Record<string, string[]> = {
    'グルメ': ['restaurant', 'cafe', 'bakery', 'meal_delivery', 'food'],
    'Gourmet': ['restaurant', 'cafe', 'bakery', 'meal_delivery', 'food'],
    '歴史': ['museum', 'church', 'hindu_temple', 'mosque', 'tourist_attraction'],
    'History': ['museum', 'church', 'hindu_temple', 'mosque', 'tourist_attraction'],
    '自然': ['park', 'natural_feature', 'campground'],
    'Nature': ['park', 'natural_feature', 'campground'],
    'ショッピング': ['shopping_mall', 'store', 'clothing_store'],
    'Shopping': ['shopping_mall', 'store', 'clothing_store'],
    'アート': ['art_gallery', 'museum'],
    'Art': ['art_gallery', 'museum'],
  };

  let score = 10; // ベーススコア

  // テーマとの関連性チェック
  for (const theme of themes) {
    const expectedTypes = themeToTypes[theme];
    if (expectedTypes) {
      const hasMatch = placeTypes.some((t) => expectedTypes.includes(t));
      if (hasMatch) {
        score = Math.min(20, score + 5);
      }
    }
  }

  // categoryHint との一致
  if (categoryHint && placeTypes.some((t) => t.includes(categoryHint))) {
    score = Math.min(20, score + 5);
  }

  return score;
}

/**
 * 距離ペナルティ (0-15): 近いほど高スコア
 */
function scoreDistance(
  place: PlaceDetails,
  prevLatLng?: { lat: number; lng: number }
): number {
  if (!prevLatLng) return 15; // 最初のスポット: フルスコア

  const dist = haversineDistance(
    prevLatLng.lat,
    prevLatLng.lng,
    place.latitude,
    place.longitude
  );

  // 2km 以内: 15点, 5km: 12点, 10km: 8点, 20km+: 3点
  if (dist <= 2) return 15;
  if (dist <= 5) return 12;
  if (dist <= 10) return 8;
  if (dist <= 20) return 5;
  return 3;
}

// ============================================
// Helpers
// ============================================

function parseTimeToHour(time: string): number {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
  }
  return parseInt(time, 10);
}
