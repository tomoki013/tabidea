/**
 * Step 1: Request Normalizer
 * 純粋 TypeScript — LLM 不使用
 * UserInput → NormalizedRequest への正規化
 */

import type { UserInput } from '@/types/user-input';
import type {
  NormalizedRequest,
  BudgetLevel,
  PaceLevel,
  TransportMode,
} from '@/types/compose-pipeline';
import { extractDuration } from '@/lib/utils/plan';

// ============================================
// Budget normalization
// ============================================

const BUDGET_MAP: Record<string, BudgetLevel> = {
  // Japanese
  '格安': 'budget',
  '節約': 'budget',
  'リーズナブル': 'standard',
  '普通': 'standard',
  'standard': 'standard',
  'スタンダード': 'standard',
  '少し贅沢': 'premium',
  'プレミアム': 'premium',
  'premium': 'premium',
  '贅沢': 'luxury',
  'ラグジュアリー': 'luxury',
  'luxury': 'luxury',
  // English
  'budget': 'budget',
  'cheap': 'budget',
  'moderate': 'standard',
  'expensive': 'premium',
  'high-end': 'luxury',
};

// ============================================
// Pace normalization
// ============================================

const PACE_MAP: Record<string, PaceLevel> = {
  // Japanese
  'ゆったり': 'relaxed',
  'のんびり': 'relaxed',
  'relaxed': 'relaxed',
  'バランス': 'balanced',
  'balanced': 'balanced',
  '普通': 'balanced',
  'アクティブ': 'active',
  '充実': 'active',
  'active': 'active',
  'たっぷり': 'active',
};

// ============================================
// Transport normalization
// ============================================

const TRANSPORT_MAP: Record<string, TransportMode> = {
  '徒歩': 'walking',
  'walking': 'walking',
  '電車': 'public_transit',
  'バス': 'public_transit',
  '公共交通': 'public_transit',
  'public_transit': 'public_transit',
  'train': 'public_transit',
  'bus': 'public_transit',
  '車': 'car',
  'レンタカー': 'car',
  'car': 'car',
  '自転車': 'bicycle',
  'bicycle': 'bicycle',
};

// ============================================
// Public API
// ============================================

/**
 * UserInput を NormalizedRequest に正規化する
 */
export function normalizeRequest(
  input: UserInput,
  outputLanguage: string = 'ja'
): NormalizedRequest {
  const durationDays = parseDuration(input.dates);
  const budgetLevel = normalizeBudget(input.budget);
  const pace = normalizePace(input.pace);
  const preferredTransport = normalizeTransport(input.preferredTransport);
  const mustVisitPlaces = normalizeMustVisitPlaces(input.mustVisitPlaces);
  const fixedSchedule = input.fixedSchedule ?? [];

  return {
    destinations: input.destinations.filter((d) => d.trim().length > 0),
    durationDays,
    startDate: extractStartDate(input.dates),
    companions: input.companions || '',
    themes: input.theme.length > 0 ? input.theme : ['Gourmet'],
    budgetLevel,
    pace,
    freeText: input.freeText || '',
    travelVibe: input.travelVibe,
    mustVisitPlaces,
    fixedSchedule,
    preferredTransport,
    isDestinationDecided: input.isDestinationDecided ?? true,
    region: input.region || 'domestic',
    outputLanguage,
    originalInput: input,
  };
}

// ============================================
// Internal helpers
// ============================================

/**
 * 日数をパースする
 * extractDuration を拡張し、英語パターンもサポート
 */
function parseDuration(dates: string): number {
  // 既存ロジック: "3日間", "2泊3日"
  const existing = extractDuration(dates);
  if (existing > 0) return existing;

  // English: "3 days", "5-day"
  const enMatch = dates.match(/(\d+)\s*-?\s*days?/i);
  if (enMatch) return parseInt(enMatch[1], 10);

  // "X nights" → X+1 days
  const nightMatch = dates.match(/(\d+)\s*nights?/i);
  if (nightMatch) return parseInt(nightMatch[1], 10) + 1;

  // 数字だけの場合
  const numMatch = dates.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1], 10);

  // フォールバック: 半日 → 1
  if (/半日|half\s*day/i.test(dates)) return 1;

  return 1; // default to 1 day
}

/**
 * 開始日を抽出 (ISO string)
 */
function extractStartDate(dates: string): string | undefined {
  // YYYY-MM-DD pattern
  const isoMatch = dates.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // YYYY/MM/DD pattern
  const slashMatch = dates.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const m = slashMatch[2].padStart(2, '0');
    const d = slashMatch[3].padStart(2, '0');
    return `${slashMatch[1]}-${m}-${d}`;
  }

  return undefined;
}

/**
 * 予算を正規化
 */
function normalizeBudget(budget: string): BudgetLevel {
  if (!budget) return 'standard';
  const lower = budget.toLowerCase().trim();
  return BUDGET_MAP[lower] ?? BUDGET_MAP[budget] ?? 'standard';
}

/**
 * ペースを正規化
 */
function normalizePace(pace: string): PaceLevel {
  if (!pace) return 'balanced';
  const lower = pace.toLowerCase().trim();
  return PACE_MAP[lower] ?? PACE_MAP[pace] ?? 'balanced';
}

/**
 * 移動手段を正規化
 */
function normalizeTransport(transports?: string[]): TransportMode[] {
  if (!transports || transports.length === 0) return ['public_transit'];

  const normalized: TransportMode[] = [];
  for (const t of transports) {
    const lower = t.toLowerCase().trim();
    const mode = TRANSPORT_MAP[lower] ?? TRANSPORT_MAP[t];
    if (mode && !normalized.includes(mode)) {
      normalized.push(mode);
    }
  }

  return normalized.length > 0 ? normalized : ['public_transit'];
}

/**
 * mustVisitPlaces を正規化 (空文字除去, トリム)
 */
function normalizeMustVisitPlaces(places?: string[]): string[] {
  if (!places) return [];
  return places.map((p) => p.trim()).filter((p) => p.length > 0);
}
