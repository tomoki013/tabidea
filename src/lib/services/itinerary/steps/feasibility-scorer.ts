/**
 * Step 4: Feasibility Scorer (v3)
 * 純粋 TypeScript — 外部 API 不使用
 * 8 軸スコアリングでスポット候補の実現可能性を評価
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
} from '@/types/itinerary-pipeline';
import { haversineDistance } from '@/lib/services/google/distance-estimator';
import {
  FEASIBILITY_WEIGHTS,
  DEFAULT_FEASIBILITY_THRESHOLD,
  LOW_REVIEW_THRESHOLD,
  BUDGET_PRICE_MAP,
  TIME_SLOT_HOURS,
} from '../constants';

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
  threshold: number = DEFAULT_FEASIBILITY_THRESHOLD
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
        semanticId: group.candidate.semanticId,
      });
      continue;
    }

    // 各候補をスコアリング
    const scored: ScoredPlace[] = group.resolved.map((resolved) => {
      const breakdown = scorePlaceCandidate(
        group.candidate,
        resolved.placeDetails,
        request,
        currentLatLng,
        resolved.matchScore
      );
      const totalScore =
        breakdown.nameMatch +
        breakdown.areaHintMatch +
        breakdown.openHoursMatch +
        breakdown.ratingQuality +
        breakdown.budgetMatch +
        breakdown.categoryRelevance +
        breakdown.distanceFromPrev +
        breakdown.lowReviewPenalty;

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

    // must/high priority 候補は threshold 免除
    const isExempt = isThresholdExempt(group.candidate);

    if (isExempt || best.totalScore >= threshold) {
      selected.push({
        candidate: best.candidate,
        placeDetails: best.placeDetails,
        feasibilityScore: best.totalScore,
        warnings: best.warnings,
        semanticId: group.candidate.semanticId,
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

  if (selected.length === 0 && filtered.length > 0) {
    const rescuedStops = filtered
      .sort((a, b) => {
        const exemptionDelta = Number(isThresholdExempt(b.candidate)) - Number(isThresholdExempt(a.candidate));
        if (exemptionDelta !== 0) return exemptionDelta;
        return b.totalScore - a.totalScore;
      })
      .map((best) => ({
        candidate: best.candidate,
        placeDetails: best.placeDetails,
        feasibilityScore: best.totalScore,
        warnings: [
          ...best.warnings,
          `実現性スコア閾値(${threshold})を一時緩和して採用`,
        ],
        semanticId: best.candidate.semanticId,
      }));

    return { selected: rescuedStops, filtered: [] };
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
    semanticId: candidate.semanticId,
  }));
}

// ============================================
// Internal scoring functions (v3: 8 axes)
// ============================================

function scorePlaceCandidate(
  candidate: SemanticCandidate,
  place: PlaceDetails,
  request: NormalizedRequest,
  prevLatLng?: { lat: number; lng: number },
  resolverMatchScore?: number
): FeasibilityScoreBreakdown {
  return {
    nameMatch: scoreNameMatch(candidate.name, candidate.searchQuery, place.name, resolverMatchScore),
    areaHintMatch: scoreAreaHintMatch(candidate.areaHint, place.formattedAddress),
    openHoursMatch: scoreOpenHours(candidate.timeSlotHint, place.openingHours),
    ratingQuality: scoreRating(place.rating, place.userRatingsTotal),
    budgetMatch: scoreBudget(request.budgetLevel, place.priceLevel),
    categoryRelevance: scoreCategoryRelevance(request.themes, place.types, candidate.categoryHint),
    distanceFromPrev: scoreDistance(place, prevLatLng),
    lowReviewPenalty: scoreLowReview(place.userRatingsTotal),
  };
}

/**
 * 候補名一致度 (0-10)
 */
function scoreNameMatch(
  candidateName: string,
  searchQuery: string,
  placeName: string,
  resolverMatchScore?: number
): number {
  if (!placeName) {
    return resolverMatchScore !== undefined
      ? Math.round(FEASIBILITY_WEIGHTS.nameMatch * clampScore(resolverMatchScore))
      : Math.round(FEASIBILITY_WEIGHTS.nameMatch * 0.5);
  }

  const placeNameLower = placeName.toLowerCase();
  const candidateLower = candidateName.toLowerCase();
  const queryLower = searchQuery.toLowerCase();
  const normalizedPlace = normalizeNameToken(placeNameLower);
  const queryVariants = buildQueryVariants(candidateLower, queryLower);
  let bestScore = 0;

  for (const variant of queryVariants) {
    if (!variant) continue;

    if (normalizedPlace === variant) {
      bestScore = Math.max(bestScore, FEASIBILITY_WEIGHTS.nameMatch);
      continue;
    }

    if (normalizedPlace.includes(variant) || variant.includes(normalizedPlace)) {
      bestScore = Math.max(bestScore, Math.round(FEASIBILITY_WEIGHTS.nameMatch * 0.8));
      continue;
    }

    const overlap = calculateCharOverlap(variant, normalizedPlace);
    bestScore = Math.max(
      bestScore,
      Math.round(FEASIBILITY_WEIGHTS.nameMatch * Math.min(overlap, 1))
    );
  }

  if (resolverMatchScore !== undefined) {
    bestScore = Math.max(
      bestScore,
      Math.round(FEASIBILITY_WEIGHTS.nameMatch * clampScore(resolverMatchScore))
    );
  }

  return bestScore;
}

function calculateCharOverlap(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  let matches = 0;
  const bChars = new Set(b);
  for (const ch of a) {
    if (bChars.has(ch)) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

/**
 * エリアヒント一致度 (0-10)
 */
function scoreAreaHintMatch(
  areaHint: string | undefined,
  formattedAddress: string
): number {
  if (!areaHint) return Math.round(FEASIBILITY_WEIGHTS.areaHintMatch * 0.5);
  if (!formattedAddress) return Math.round(FEASIBILITY_WEIGHTS.areaHintMatch * 0.5);

  const hintLower = areaHint.toLowerCase();
  const addressLower = formattedAddress.toLowerCase();

  if (addressLower.includes(hintLower) || hintLower.includes(addressLower)) {
    return FEASIBILITY_WEIGHTS.areaHintMatch;
  }

  const words = hintLower.split(/[\s、,]+/).filter(Boolean);
  const matchCount = words.filter((w) => addressLower.includes(w)).length;
  if (matchCount > 0) {
    return Math.round(FEASIBILITY_WEIGHTS.areaHintMatch * (matchCount / words.length));
  }

  return 2;
}

/**
 * 営業時間マッチ (0-20)
 */
function scoreOpenHours(
  timeSlot: TimeSlotHint,
  openingHours?: { periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }> }
): number {
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    return Math.round(FEASIBILITY_WEIGHTS.openHoursMatch * 0.5);
  }

  const expected = TIME_SLOT_HOURS[timeSlot];
  const midHour = (expected.start + expected.end) / 2;

  for (const period of openingHours.periods) {
    const openHour = parseTimeToHour(period.open.time);
    const closeHour = period.close
      ? parseTimeToHour(period.close.time)
      : 24;

    if (openHour <= midHour && closeHour >= midHour) {
      return FEASIBILITY_WEIGHTS.openHoursMatch;
    }
    if (openHour < expected.end && closeHour > expected.start) {
      return Math.round(FEASIBILITY_WEIGHTS.openHoursMatch * 0.7);
    }
  }

  return Math.round(FEASIBILITY_WEIGHTS.openHoursMatch * 0.2);
}

/**
 * 評価品質 (0-15)
 */
function scoreRating(rating?: number, userRatingsTotal?: number): number {
  if (!rating) return Math.round(FEASIBILITY_WEIGHTS.ratingQuality * 0.5);

  const normalizedRating = Math.min(rating / 5, 1);
  const reviewWeight = Math.log(1 + (userRatingsTotal || 0)) / Math.log(1 + 10000);
  const clamped = Math.min(reviewWeight, 1);

  return Math.round(
    normalizedRating * (FEASIBILITY_WEIGHTS.ratingQuality * 0.6) +
    clamped * (FEASIBILITY_WEIGHTS.ratingQuality * 0.4)
  );
}

/**
 * 予算マッチ (0-15)
 */
function scoreBudget(
  budgetLevel: BudgetLevel,
  priceLevel?: number
): number {
  if (priceLevel === undefined) return Math.round(FEASIBILITY_WEIGHTS.budgetMatch * 0.75);

  const expectedRange = BUDGET_PRICE_MAP[budgetLevel];
  if (priceLevel >= expectedRange[0] && priceLevel <= expectedRange[1]) {
    return FEASIBILITY_WEIGHTS.budgetMatch;
  }

  const distance = Math.min(
    Math.abs(priceLevel - expectedRange[0]),
    Math.abs(priceLevel - expectedRange[1])
  );

  return Math.max(0, FEASIBILITY_WEIGHTS.budgetMatch - distance * 6);
}

/**
 * カテゴリ関連度 (0-15)
 */
function scoreCategoryRelevance(
  themes: string[],
  placeTypes?: string[],
  categoryHint?: string
): number {
  if (!placeTypes || placeTypes.length === 0) return Math.round(FEASIBILITY_WEIGHTS.categoryRelevance * 0.5);

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

  let score = Math.round(FEASIBILITY_WEIGHTS.categoryRelevance * 0.5);

  for (const theme of themes) {
    const expectedTypes = themeToTypes[theme];
    if (expectedTypes) {
      const hasMatch = placeTypes.some((t) => expectedTypes.includes(t));
      if (hasMatch) {
        score = Math.min(FEASIBILITY_WEIGHTS.categoryRelevance, score + 4);
      }
    }
  }

  if (categoryHint && placeTypes.some((t) => t.includes(categoryHint))) {
    score = Math.min(FEASIBILITY_WEIGHTS.categoryRelevance, score + 4);
  }

  return score;
}

/**
 * 距離ペナルティ (0-10)
 */
function scoreDistance(
  place: PlaceDetails,
  prevLatLng?: { lat: number; lng: number }
): number {
  if (!prevLatLng) return FEASIBILITY_WEIGHTS.distanceFromPrev;

  const dist = haversineDistance(
    prevLatLng.lat,
    prevLatLng.lng,
    place.latitude,
    place.longitude
  );

  if (dist <= 2) return FEASIBILITY_WEIGHTS.distanceFromPrev;
  if (dist <= 5) return Math.round(FEASIBILITY_WEIGHTS.distanceFromPrev * 0.8);
  if (dist <= 10) return Math.round(FEASIBILITY_WEIGHTS.distanceFromPrev * 0.5);
  if (dist <= 20) return Math.round(FEASIBILITY_WEIGHTS.distanceFromPrev * 0.3);
  return Math.round(FEASIBILITY_WEIGHTS.distanceFromPrev * 0.2);
}

/**
 * レビュー数少ペナルティ (0-5)
 */
function scoreLowReview(userRatingsTotal?: number): number {
  if (userRatingsTotal === undefined) return Math.round(FEASIBILITY_WEIGHTS.lowReviewPenalty * 0.5);
  if (userRatingsTotal >= LOW_REVIEW_THRESHOLD) return FEASIBILITY_WEIGHTS.lowReviewPenalty;
  return Math.round(FEASIBILITY_WEIGHTS.lowReviewPenalty * (userRatingsTotal / LOW_REVIEW_THRESHOLD));
}

// ============================================
// Helpers
// ============================================

function parseTimeToHour(time: string): number {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
  }
  if (/^\d{4}$/.test(time)) {
    return parseInt(time.slice(0, 2), 10) + parseInt(time.slice(2), 10) / 60;
  }
  return parseInt(time, 10);
}

function isThresholdExempt(candidate: SemanticCandidate): boolean {
  return candidate.role === 'must_visit' || candidate.priority >= 8;
}

function normalizeNameToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\-_・]/g, '')
    .replace(/[（）()]/g, '');
}

function buildQueryVariants(candidateName: string, searchQuery: string): string[] {
  const rawVariants = [
    candidateName,
    searchQuery,
    ...searchQuery.split(/[\s、,，・/]+/),
  ];

  return Array.from(new Set(
    rawVariants
      .map((variant) => normalizeNameToken(variant))
      .filter((variant) => variant.length > 0)
  ));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(score, 1));
}
