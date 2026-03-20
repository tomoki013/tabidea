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
  FixedTransportConstraint,
  FixedHotelConstraint,
} from '@/types/itinerary-pipeline';
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

const HARD_REQUEST_PATTERNS = [
  /絶対/,
  /必須/,
  /マスト/,
  /外せない/,
  /予約済/,
  /チェックイン/,
  /チェックアウト/,
  /便/,
  /列車/,
  /バス/,
  /\bmust\b/i,
  /\brequired\b/i,
  /\bbooked\b/i,
];

const MAX_THEME_COUNT = 4;
const MAX_SOFT_REQUEST_COUNT = 6;
const SOFT_TEXT_SPLIT_PATTERN = /[\n\r。！？!?,、]+/;

// ============================================
// Public API
// ============================================

/**
 * パイプラインコンテキスト（ユーザー設定から取得される付加情報）
 */
export interface NormalizeRequestContext {
  /** ユーザーの出発都市（設定の homeBaseCity） */
  homeBaseCity?: string;
  /** 出発都市の上書き（open-jaw 対応用） */
  departureCity?: string;
  /** 帰着都市の上書き（open-jaw 対応用） */
  arrivalCity?: string;
}

/**
 * UserInput を NormalizedRequest に正規化する
 */
export function normalizeRequest(
  input: UserInput,
  outputLanguage: string = 'ja',
  context?: NormalizeRequestContext
): NormalizedRequest {
  const durationDays = parseDuration(input.dates);
  const startDate = extractStartDate(input.dates);
  const budgetLevel = normalizeBudget(input.budget);
  const pace = normalizePace(input.pace);
  const preferredTransport = normalizeTransport(input.preferredTransport);
  const mustVisitPlaces = normalizeMustVisitPlaces(input.mustVisitPlaces);
  const fixedSchedule = normalizeFixedSchedule(input.fixedSchedule);
  const normalizedThemes = normalizeThemes(input.theme);
  const hardDirectives = extractHardFreeTextDirectives(input.freeText);
  const softRequests = extractSoftPreferenceRequests(input.freeText);
  const compactThemes = normalizedThemes.slice(0, MAX_THEME_COUNT);
  const compactSoftRequests = softRequests.slice(0, MAX_SOFT_REQUEST_COUNT);
  const fixedTransports = extractFixedTransports(fixedSchedule, startDate);
  const fixedHotels = extractFixedHotels(fixedSchedule, startDate, durationDays);
  const hardConstraints = buildHardConstraintSummary({
    input,
    startDate,
    mustVisitPlaces,
    fixedTransports,
    fixedHotels,
    hardDirectives,
  });
  const softPreferences = buildSoftPreferenceSummary({
    themes: compactThemes,
    travelVibe: normalizeOptionalText(input.travelVibe),
    softRequests: compactSoftRequests,
    totalSoftCount:
      normalizedThemes.length +
      softRequests.length +
      (normalizeOptionalText(input.travelVibe) ? 1 : 0),
  });
  const compaction = buildCompactionMetadata({
    input,
    hardConstraints,
    softPreferences,
    totalSoftCount:
      normalizedThemes.length +
      softRequests.length +
      (normalizeOptionalText(input.travelVibe) ? 1 : 0),
  });

  return {
    destinations: input.destinations.filter((d) => d.trim().length > 0),
    durationDays,
    startDate,
    companions: input.companions || '',
    themes: compactThemes.length > 0 ? compactThemes : ['Gourmet'],
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
    // 出発・帰着都市
    homeBaseCity: context?.homeBaseCity,
    departureCity: context?.departureCity,
    arrivalCity: context?.arrivalCity,
    // v3 追加フィールド
    durationMinutes: durationDays * 840, // 14h/day default (08:00-22:00)
    locale: outputLanguage,
    hardConstraints,
    softPreferences,
    compaction,
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
  const trimmed = dates.trim();

  const rangeDuration = parseDateRangeDuration(trimmed);
  if (rangeDuration > 0) return rangeDuration;

  // 既存ロジック: "3日間", "2泊3日"
  const existing = extractDuration(trimmed);
  if (existing > 0) return existing;

  // English: "3 days", "5-day"
  const enMatch = trimmed.match(/(\d+)\s*-?\s*days?/i);
  if (enMatch) return parseInt(enMatch[1], 10);

  // "X nights" → X+1 days
  const nightMatch = trimmed.match(/(\d+)\s*nights?/i);
  if (nightMatch) return parseInt(nightMatch[1], 10) + 1;

  // 数字だけの場合
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1], 10);

  // フォールバック: 半日 → 1
  if (/半日|half\s*day/i.test(trimmed)) return 1;

  return 1; // default to 1 day
}

function parseDateRangeDuration(dates: string): number {
  const separatorPattern = /(?:〜|～|~|ー|−|-|to|until)/i;

  // ISO/Slash ranges: 2026-03-17 ~ 2026-03-18
  const fullDateMatches = Array.from(dates.matchAll(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/g));
  if (fullDateMatches.length >= 2) {
    const start = buildUtcDate(
      Number.parseInt(fullDateMatches[0][1], 10),
      Number.parseInt(fullDateMatches[0][2], 10),
      Number.parseInt(fullDateMatches[0][3], 10)
    );
    const end = buildUtcDate(
      Number.parseInt(fullDateMatches[1][1], 10),
      Number.parseInt(fullDateMatches[1][2], 10),
      Number.parseInt(fullDateMatches[1][3], 10)
    );
    return calculateInclusiveDays(start, end);
  }

  // Japanese ranges with year: 2026年3月17日〜3月18日 / 2026年3月17日〜18日
  const jpYearRange = dates.match(
    /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*(?:〜|～|~|ー|−|-)\s*(?:(\d{1,2})月\s*)?(\d{1,2})日/
  );
  if (jpYearRange) {
    const year = Number.parseInt(jpYearRange[1], 10);
    const startMonth = Number.parseInt(jpYearRange[2], 10);
    const startDay = Number.parseInt(jpYearRange[3], 10);
    const endMonth = jpYearRange[4]
      ? Number.parseInt(jpYearRange[4], 10)
      : startMonth;
    const endDay = Number.parseInt(jpYearRange[5], 10);
    const start = buildUtcDate(year, startMonth, startDay);
    const end = buildUtcDate(year, endMonth, endDay);
    return calculateInclusiveDays(start, end);
  }

  // English month name ranges: March 17-18, 2026 / Mar 17 to Mar 18
  const monthRanges = Array.from(
    dates.matchAll(
      /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{4}))?/gi
    )
  );
  if (monthRanges.length >= 2 && separatorPattern.test(dates)) {
    const startMonth = monthNameToNumber(monthRanges[0][1]);
    const endMonth = monthNameToNumber(monthRanges[1][1]);
    if (startMonth > 0 && endMonth > 0) {
      const fallbackYear = new Date().getUTCFullYear();
      const startYear = monthRanges[0][3]
        ? Number.parseInt(monthRanges[0][3], 10)
        : monthRanges[1][3]
          ? Number.parseInt(monthRanges[1][3], 10)
          : fallbackYear;
      const endYear = monthRanges[1][3]
        ? Number.parseInt(monthRanges[1][3], 10)
        : startYear;
      const start = buildUtcDate(startYear, startMonth, Number.parseInt(monthRanges[0][2], 10));
      const end = buildUtcDate(endYear, endMonth, Number.parseInt(monthRanges[1][2], 10));
      return calculateInclusiveDays(start, end);
    }
  }

  return 0;
}

function buildUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function calculateInclusiveDays(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff < 0) {
    return 0;
  }

  return Math.floor(diff / 86_400_000) + 1;
}

function monthNameToNumber(monthName: string): number {
  const short = monthName.toLowerCase().slice(0, 3);
  const MONTHS: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  return MONTHS[short] ?? 0;
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

function normalizeThemes(themes: string[]): string[] {
  const normalized = themes
    .map((theme) => theme.trim())
    .filter((theme) => theme.length > 0);

  return Array.from(new Set(normalized));
}

function normalizeFixedSchedule(items?: UserInput['fixedSchedule']): NonNullable<UserInput['fixedSchedule']> {
  if (!items) return [];
  return items
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      notes: item.notes?.trim(),
      from: item.from?.trim(),
      to: item.to?.trim(),
    }))
    .filter((item) => item.name.length > 0);
}

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function extractHardFreeTextDirectives(freeText: string): string[] {
  return splitFreeText(freeText).filter((sentence) =>
    HARD_REQUEST_PATTERNS.some((pattern) => pattern.test(sentence))
  );
}

function extractSoftPreferenceRequests(freeText: string): string[] {
  const sentences = splitFreeText(freeText);
  return sentences.filter((sentence) =>
    !HARD_REQUEST_PATTERNS.some((pattern) => pattern.test(sentence))
  );
}

function splitFreeText(freeText: string): string[] {
  if (!freeText) return [];
  return Array.from(
    new Set(
      freeText
        .split(SOFT_TEXT_SPLIT_PATTERN)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 0)
    )
  );
}

function buildHardConstraintSummary(input: {
  input: UserInput;
  startDate?: string;
  mustVisitPlaces: string[];
  fixedTransports: FixedTransportConstraint[];
  fixedHotels: FixedHotelConstraint[];
  hardDirectives: string[];
}) {
  const destinations = input.input.destinations.map((destination) => destination.trim()).filter(Boolean);
  const dateConstraints = [input.input.dates.trim()].filter(Boolean);

  const summaryLines = [
    ...destinations.map((destination) => `目的地: ${destination}`),
    ...dateConstraints.map((dates) => `日程: ${dates}`),
    ...input.mustVisitPlaces.map((place) => `必訪問: ${place}`),
    ...input.fixedHotels.map((hotel) => `予約済みホテル: ${hotel.name}`),
    ...input.fixedTransports.map((transport) => `予約済み交通: ${transport.name}`),
    ...input.hardDirectives.map((directive) => `厳守メモ: ${directive}`),
  ];

  return {
    destinations,
    dateConstraints,
    mustVisitPlaces: input.mustVisitPlaces,
    fixedTransports: input.fixedTransports,
    fixedHotels: input.fixedHotels,
    freeTextDirectives: input.hardDirectives,
    summaryLines,
  };
}

function buildSoftPreferenceSummary(input: {
  themes: string[];
  travelVibe?: string;
  softRequests: string[];
  totalSoftCount: number;
}) {
  const rankedRequests = input.softRequests;
  const keptCount = input.themes.length + rankedRequests.length + (input.travelVibe ? 1 : 0);

  return {
    themes: input.themes.length > 0 ? input.themes : ['Gourmet'],
    travelVibe: input.travelVibe,
    rankedRequests,
    suppressedCount: Math.max(input.totalSoftCount - keptCount, 0),
  };
}

function buildCompactionMetadata(input: {
  input: UserInput;
  hardConstraints: NormalizedRequest['hardConstraints'];
  softPreferences: NormalizedRequest['softPreferences'];
  totalSoftCount: number;
}) {
  const freeTextLength = input.input.freeText.trim().length;
  const longInputDetected =
    freeTextLength > 240 ||
    input.totalSoftCount > MAX_THEME_COUNT + MAX_SOFT_REQUEST_COUNT ||
    (input.input.mustVisitPlaces?.length ?? 0) >= 4;

  return {
    applied: input.softPreferences.suppressedCount > 0,
    hardConstraintCount:
      input.hardConstraints.destinations.length +
      input.hardConstraints.dateConstraints.length +
      input.hardConstraints.mustVisitPlaces.length +
      input.hardConstraints.fixedHotels.length +
      input.hardConstraints.fixedTransports.length +
      input.hardConstraints.freeTextDirectives.length,
    softPreferenceCount: input.totalSoftCount,
    suppressedSoftPreferenceCount: input.softPreferences.suppressedCount,
    longInputDetected,
  };
}

function extractFixedTransports(
  fixedSchedule: NonNullable<UserInput['fixedSchedule']>,
  startDate?: string
): FixedTransportConstraint[] {
  return fixedSchedule
    .filter(isFixedTransportItem)
    .map((item) => ({
      type: item.type,
      name: item.name,
      date: item.date,
      time: item.time,
      from: item.from,
      to: item.to,
      notes: item.notes,
      day: resolveTripDay(item.date, startDate),
    }));
}

function isFixedTransportItem(
  item: NonNullable<UserInput['fixedSchedule']>[number]
): item is NonNullable<UserInput['fixedSchedule']>[number] & {
  type: FixedTransportConstraint['type'];
} {
  return (
    item.type === 'flight' ||
    item.type === 'train' ||
    item.type === 'bus' ||
    item.type === 'other'
  );
}

function extractFixedHotels(
  fixedSchedule: NonNullable<UserInput['fixedSchedule']>,
  startDate: string | undefined,
  durationDays: number
): FixedHotelConstraint[] {
  return fixedSchedule
    .filter((item) => item.type === 'hotel')
    .map((item) => {
      const startDay = resolveTripDay(item.date, startDate) ?? 1;
      const checkoutDay = resolveTripDay(item.checkoutDate, startDate);

      return {
        name: item.name,
        checkInDate: item.date,
        checkOutDate: item.checkoutDate,
        notes: item.notes,
        startDay,
        endDay: checkoutDay ? Math.max(startDay, checkoutDay - 1) : Math.min(startDay, durationDays),
      };
    });
}

function resolveTripDay(date: string | undefined, startDate?: string): number | undefined {
  if (!date || !startDate) return undefined;

  try {
    const start = new Date(`${startDate}T00:00:00`);
    const target = new Date(`${date}T00:00:00`);
    const diffMs = target.getTime() - start.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  } catch {
    return undefined;
  }
}
