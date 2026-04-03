/**
 * Pass B: Split Canonical Planner Draft Generation
 *
 * 1. Seed request returns day skeleton only.
 * 2. Day requests fill one day's stops at a time.
 * 3. Parser-side salvage is allowed.
 * 4. AI repair fallback is not used.
 */

import type {
  DraftGenerateCurrentDayExecution,
  DraftGenerateResumeSubstage,
  DraftGenerateStrategy,
  PassContext,
  PassResult,
  PlannerDayChunkStop,
  PlannerDayOutline,
  PlannerDayOutlineSlot,
  PlannerDraft,
  PlannerDraftDay,
  PlannerSeed,
  PlannerSeedDay,
} from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import {
  TextJsonParseError,
  generateTextJsonText,
  parseTextJsonObjectDetailed,
} from '@/lib/services/ai/structured-json-recovery';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { ZodError } from 'zod';
import {
  plannerDayChunkLlmSchema,
  plannerDayOutlineLlmSchema,
  plannerDayStopsLlmSchema,
  plannerSeedLlmSchema,
  type PlannerDayChunkLlmOutput,
  type PlannerDayOutlineLlmOutput,
  type PlannerDayStopsLlmOutput,
  type PlannerSeedLlmOutput,
} from '../schemas/draft-plan-schema';
import {
  NETLIFY_FREE_RUNTIME_PROFILE,
  PASS_BUDGET_MS,
  RECOMMENDED_STOPS_PER_DAY,
  STREAM_CLOSE_RESERVE_MS,
  STREAM_FINALIZE_RESERVE_MS,
} from '../constants';

const DEFAULT_PLANNER_CONTRACT_VERSION = 'semantic_draft_v5';
const MICRO_PLANNER_CONTRACT_VERSION = 'semantic_draft_v6';
const CONSTRAINED_COMPLETION_CONTRACT_VERSION = 'semantic_draft_v7';
const MAX_SEED_REQUEST_ATTEMPTS = 3;
const MAX_DAY_REQUEST_ATTEMPTS = 3;
type SeedPromptVariant = 'standard' | 'compact' | 'ultra_compact';
type PlannerStrategy = DraftGenerateStrategy;
const DAY_CHUNK_SIZE = 2;
const MICRO_DAY_FALLBACK_MIN_ATTEMPT = 2;
const MAX_SAME_STRATEGY_ERROR_RECURRENCES = 2;

const SEED_TOKEN_COST = {
  BASE_OVERHEAD: 120,
  DAY_COST: 140,
  SAFETY_BUFFER: 120,
} as const;

const SEED_MAX_TOKENS_CAP = {
  default: 1_024,
  [NETLIFY_FREE_RUNTIME_PROFILE]: 768,
} as const;
const DAY_MAX_TOKENS_CAP = {
  default: 1_536,
  [NETLIFY_FREE_RUNTIME_PROFILE]: 1_024,
} as const;
const CHUNK_MIN_BASE_TOKENS = 900;
const SEED_REQUEST_TIMEOUT_CAP_MS = {
  default: 6_000,
  [NETLIFY_FREE_RUNTIME_PROFILE]: 4_000,
} as const;
const DAY_REQUEST_TIMEOUT_CAP_MS = {
  default: 4_500,
  [NETLIFY_FREE_RUNTIME_PROFILE]: 5_500,
} as const;
const MIN_SEED_REQUEST_TIMEOUT_MS = 2_500;
const MIN_DAY_REQUEST_TIMEOUT_MS = 2_200;
const DAY_PROGRESS_RESERVE_MS = 1_500;

interface PlannerConditionBuildOptions {
  transportLimit: number;
  themeLimit: number;
  mustVisitLimit: number;
  rankedRequestLimit: number;
  directiveLimit: number;
  freeTextLimit: number;
}

const DEFAULT_PLANNER_CONDITION_OPTIONS: PlannerConditionBuildOptions = {
  transportLimit: 2,
  themeLimit: 3,
  mustVisitLimit: 4,
  rankedRequestLimit: 3,
  directiveLimit: 3,
  freeTextLimit: 160,
};

const SEED_PLANNER_CONDITION_OPTIONS: Record<SeedPromptVariant, PlannerConditionBuildOptions> = {
  standard: DEFAULT_PLANNER_CONDITION_OPTIONS,
  compact: {
    transportLimit: 1,
    themeLimit: 2,
    mustVisitLimit: 3,
    rankedRequestLimit: 2,
    directiveLimit: 2,
    freeTextLimit: 120,
  },
  ultra_compact: {
    transportLimit: 1,
    themeLimit: 2,
    mustVisitLimit: 3,
    rankedRequestLimit: 2,
    directiveLimit: 2,
    freeTextLimit: 120,
  },
};

const DAY_PLANNER_CONDITION_OPTIONS: Record<SeedPromptVariant, PlannerConditionBuildOptions> = {
  standard: DEFAULT_PLANNER_CONDITION_OPTIONS,
  compact: {
    transportLimit: 1,
    themeLimit: 2,
    mustVisitLimit: 3,
    rankedRequestLimit: 2,
    directiveLimit: 2,
    freeTextLimit: 120,
  },
  ultra_compact: {
    transportLimit: 1,
    themeLimit: 1,
    mustVisitLimit: 2,
    rankedRequestLimit: 1,
    directiveLimit: 1,
    freeTextLimit: 80,
  },
};

type StopIdentityLike = {
  name?: string | null;
  searchQuery?: string | null;
  areaHint?: string | null;
};

function takeTop<T>(items: readonly T[], limit: number): T[] {
  return items.slice(0, limit);
}

function appendListSection(
  parts: string[],
  title: string,
  items: readonly string[],
): void {
  if (items.length === 0) {
    return;
  }

  parts.push(`\n## ${title}`);
  for (const item of items) {
    parts.push(`- ${item}`);
  }
}

function normalizeStopIdentity(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\([^)]*\)|（[^）]*）/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function buildStopIdentityTokens(stop: StopIdentityLike): string[] {
  const tokens = new Set<string>();
  const normalizedName = normalizeStopIdentity(stop.name);
  const normalizedQuery = normalizeStopIdentity(stop.searchQuery);
  const normalizedArea = normalizeStopIdentity(stop.areaHint);

  if (normalizedName) {
    tokens.add(`name:${normalizedName}`);
  }
  if (normalizedQuery) {
    tokens.add(`query:${normalizedQuery}`);
    if (normalizedName && normalizedQuery.includes(normalizedName)) {
      tokens.add(`name:${normalizedName}`);
    }
  }
  if (normalizedArea && normalizedName) {
    tokens.add(`area:${normalizedArea}:${normalizedName}`);
  }

  return [...tokens];
}

function buildUsedStopIdentitySet(days: PlannerDraft['days']): Set<string> {
  const identities = new Set<string>();
  for (const day of days) {
    for (const stop of day.stops) {
      for (const token of buildStopIdentityTokens(stop)) {
        identities.add(token);
      }
    }
  }
  return identities;
}

function hasOverlappingStopIdentity(
  left: StopIdentityLike,
  right: StopIdentityLike,
): boolean {
  const leftTokens = buildStopIdentityTokens(left);
  if (leftTokens.length === 0) {
    return false;
  }
  const rightTokens = new Set(buildStopIdentityTokens(right));
  return leftTokens.some((token) => rightTokens.has(token));
}

function formatUsedStopPromptItem(stop: StopIdentityLike): string {
  const area = stop.areaHint?.trim();
  return area ? `${stop.name} (${area})` : `${stop.name}`;
}

function collectUsedStopPromptItems(days: PlannerDraft['days']): string[] {
  const items: string[] = [];
  const seen = new Set<string>();

  for (const day of days) {
    for (const stop of day.stops) {
      const label = formatUsedStopPromptItem(stop);
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push(label);
      }
    }
  }

  return items;
}

function resolveHardMinimumStopCount(
  normalized: NormalizedRequest,
  dayNumber: number,
): number {
  const totalDays = normalized.durationDays;
  const range = RECOMMENDED_STOPS_PER_DAY[normalized.pace];
  if (totalDays <= 1) {
    return Math.max(3, range.min);
  }
  if (dayNumber === 1) {
    return 3;
  }
  if (dayNumber === totalDays) {
    return 3;
  }
  return Math.max(5, range.min);
}

function resolveChunkSize(
  normalized: NormalizedRequest,
  dayNumber: number,
): number {
  return resolveHardMinimumStopCount(normalized, dayNumber) >= 4 ? 3 : DAY_CHUNK_SIZE;
}

function countCompletedStops(plannerDraft: PlannerDraft | undefined): number {
  return plannerDraft?.days.reduce((sum, day) => sum + day.stops.length, 0) ?? 0;
}

function countUnderfilledDays(
  normalized: NormalizedRequest,
  plannerDraft: PlannerDraft | undefined,
): number {
  if (!plannerDraft) {
    return 0;
  }

  return plannerDraft.days.filter(
    (day) => countCoreActivityStops(day.stops) < resolveHardMinimumStopCount(normalized, day.day),
  ).length;
}

function countCoreActivityStops(
  stops: Array<{ role: string }>,
): number {
  return stops.filter((stop) => stop.role !== 'accommodation').length;
}

function isSubstantiveActivityStop(
  stop: { role: string },
): boolean {
  return stop.role !== 'meal' && stop.role !== 'accommodation';
}

function destinationMatchesRequest(
  normalized: NormalizedRequest,
  value?: string,
): boolean {
  return value
    ? normalized.destinations.some((destination) => value.includes(destination))
    : false;
}

function hasArrivalTransportConstraint(
  normalized: NormalizedRequest,
  dayNumber: number,
): boolean {
  return normalized.hardConstraints.fixedTransports.some((transport) => {
    if (transport.day !== dayNumber) {
      return false;
    }
    return destinationMatchesRequest(normalized, transport.to) || (!transport.from && dayNumber === 1);
  });
}

function hasDepartureTransportConstraint(
  normalized: NormalizedRequest,
  dayNumber: number,
): boolean {
  return normalized.hardConstraints.fixedTransports.some((transport) => {
    if (transport.day !== dayNumber) {
      return false;
    }
    return destinationMatchesRequest(normalized, transport.from)
      || (!transport.to && dayNumber === normalized.durationDays);
  });
}

function validateDayCoverage(
  day: PlannerDraftDay,
  normalized: NormalizedRequest,
): string | null {
  const substantiveStops = day.stops.filter(isSubstantiveActivityStop);
  const laterDayActivity = substantiveStops.some((stop) =>
    stop.timeSlotHint === 'afternoon' || stop.timeSlotHint === 'evening' || stop.timeSlotHint === 'night');

  if (substantiveStops.length === 0) {
    return 'insufficient_day_coverage';
  }

  const departureConstrained = hasDepartureTransportConstraint(normalized, day.day);
  const arrivalConstrained = hasArrivalTransportConstraint(normalized, day.day);
  const requiresLaterCoverage = !(departureConstrained || arrivalConstrained);

  if (requiresLaterCoverage && !laterDayActivity) {
    const hasOnlyEarlyActivity = substantiveStops.every((stop) =>
      stop.timeSlotHint === 'morning' || stop.timeSlotHint === 'midday' || stop.timeSlotHint === 'flexible');
    return hasOnlyEarlyActivity ? 'activity_only_until_midday' : 'missing_afternoon_activity';
  }

  return null;
}

function resolveDraftDayType(normalized: NormalizedRequest, dayIndex: number): 'arrival' | 'middle' | 'departure' {
  if (normalized.durationDays <= 1) {
    return 'arrival';
  }
  if (dayIndex === 1) {
    return 'arrival';
  }
  if (dayIndex === normalized.durationDays) {
    return 'departure';
  }
  return 'middle';
}

function countDuplicateStops(plannerDraft: PlannerDraft | undefined): number {
  if (!plannerDraft) {
    return 0;
  }

  const seen = new Set<string>();
  let duplicateCount = 0;
  for (const day of plannerDraft.days) {
    for (const stop of day.stops) {
      const primaryKey = buildStopIdentityTokens(stop)[0];
      if (!primaryKey) {
        continue;
      }
      if (seen.has(primaryKey)) {
        duplicateCount += 1;
      } else {
        seen.add(primaryKey);
      }
    }
  }
  return duplicateCount;
}

function isDraftGenerateResumeSubstage(
  value: unknown,
): value is DraftGenerateResumeSubstage {
  return value === 'seed_request'
    || value === 'seed_parse'
    || value === 'day_outline_request'
    || value === 'day_outline_parse'
    || value === 'day_chunk_request'
    || value === 'day_chunk_parse'
    || value === 'day_request'
    || value === 'day_parse';
}

function resolveSubstage(
  value: unknown,
): DraftGenerateResumeSubstage | null {
  return isDraftGenerateResumeSubstage(value) ? value : null;
}

function resolveSeedMaxTokens(runtimeProfile?: string, tripDays?: number): number {
  const base = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    ? SEED_MAX_TOKENS_CAP[NETLIFY_FREE_RUNTIME_PROFILE]
    : SEED_MAX_TOKENS_CAP.default;
  if (tripDays !== undefined && tripDays >= 10) return Math.round(base * 1.5);
  if (tripDays !== undefined && tripDays >= 7) return Math.round(base * 1.3);
  return base;
}

function resolveDayMaxTokens(runtimeProfile?: string, tripDays?: number): number {
  const base = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    ? DAY_MAX_TOKENS_CAP[NETLIFY_FREE_RUNTIME_PROFILE]
    : DAY_MAX_TOKENS_CAP.default;
  if (tripDays !== undefined && tripDays >= 10) return Math.round(base * 1.5);
  if (tripDays !== undefined && tripDays >= 7) return Math.round(base * 1.3);
  return base;
}

function calculateSeedMaxTokens(
  normalized: NormalizedRequest,
  runtimeProfile?: string,
  seedAttempt = 1,
): number {
  const estimated =
    SEED_TOKEN_COST.BASE_OVERHEAD
    + normalized.durationDays * SEED_TOKEN_COST.DAY_COST
    + SEED_TOKEN_COST.SAFETY_BUFFER;
  const retryBonus = Math.max(0, seedAttempt - 1) * 128;
  return Math.min(estimated + retryBonus, resolveSeedMaxTokens(runtimeProfile, normalized.durationDays));
}

function calculateDayMaxTokens(
  normalized: NormalizedRequest,
  runtimeProfile?: string,
  dayAttempt = 1,
): number {
  const tripDays = normalized.durationDays;
  const recommendedStops = RECOMMENDED_STOPS_PER_DAY[normalized.pace].max;
  const estimated = 180 + recommendedStops * 95;
  const base = Math.min(Math.max(estimated, 640), resolveDayMaxTokens(runtimeProfile, tripDays));
  if (dayAttempt >= 3) {
    return resolveDayMaxTokens(runtimeProfile, tripDays);
  }
  if (dayAttempt === 2) {
    return Math.min(base + 128, resolveDayMaxTokens(runtimeProfile, tripDays));
  }
  return base;
}

function calculateOutlineMaxTokens(
  targetSlotCount: number,
  runtimeProfile?: string,
  outlineAttempt = 1,
  tripDays?: number,
): number {
  // Outline slots only contain slotIndex/role/timeSlotHint/areaHint — much smaller than full stops
  const estimated = 80 + targetSlotCount * 50;
  const cap = resolveDayMaxTokens(runtimeProfile, tripDays);
  const base = Math.min(Math.max(estimated, 400), cap);
  if (outlineAttempt >= 3) return cap;
  if (outlineAttempt === 2) return Math.min(base + 100, cap);
  return base;
}

function calculateChunkMaxTokens(
  chunkSlotCount: number,
  runtimeProfile?: string,
  chunkAttempt = 1,
  tripDays?: number,
): number {
  const estimated = 100 + chunkSlotCount * 90;
  const base = Math.min(
    Math.max(estimated, CHUNK_MIN_BASE_TOKENS),
    resolveDayMaxTokens(runtimeProfile, tripDays),
  );
  if (chunkAttempt >= 3) {
    return resolveDayMaxTokens(runtimeProfile, tripDays);
  }
  if (chunkAttempt === 2) {
    return Math.min(base + 128, resolveDayMaxTokens(runtimeProfile, tripDays));
  }
  return base;
}

function resolveTargetStopCount(
  normalized: NormalizedRequest,
  runtimeProfile?: string,
  dayAttempt = 1,
  dayNumber = 1,
): number {
  const range = RECOMMENDED_STOPS_PER_DAY[normalized.pace];
  const hardMinimum = resolveHardMinimumStopCount(normalized, dayNumber);
  if (runtimeProfile !== NETLIFY_FREE_RUNTIME_PROFILE || dayAttempt <= 1) {
    return Math.max(range.max, hardMinimum);
  }

  if (normalized.pace === 'relaxed') {
    return Math.max(4, hardMinimum);
  }
  if (normalized.pace === 'balanced') {
    return Math.max(4, hardMinimum);
  }
  return Math.max(5, hardMinimum);
}

function isMicroPlannerResumeSubstage(
  substage: DraftGenerateResumeSubstage | null | undefined,
): boolean {
  return substage === 'day_outline_request'
    || substage === 'day_outline_parse'
    || substage === 'day_chunk_request'
    || substage === 'day_chunk_parse';
}

function resolvePlannerStrategy(
  _runtimeProfile?: string,
  _plannerModelName?: string,
  _currentStrategyDay?: number | null,
  _currentHarnessStrategy?: PlannerStrategy | null,
  _nextDayIndex?: number | null,
  resumeSubstage?: DraftGenerateResumeSubstage | null,
): PlannerStrategy {
  if (isMicroPlannerResumeSubstage(resumeSubstage)) {
    return 'micro_day_split';
  }

  return 'split_day_v5';
}

function resolvePlannerContractVersion(strategy: PlannerStrategy): string {
  if (strategy === 'micro_day_split') {
    return MICRO_PLANNER_CONTRACT_VERSION;
  }
  if (strategy === 'constrained_completion') {
    return CONSTRAINED_COMPLETION_CONTRACT_VERSION;
  }
  return DEFAULT_PLANNER_CONTRACT_VERSION;
}

function shouldFallbackToMicroDaySplit(
  runtimeProfile: string | undefined,
  plannerModelName: string,
  dayAttempt: number,
): boolean {
  return runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    && /gemini-3-flash-preview/i.test(plannerModelName)
    && dayAttempt >= MICRO_DAY_FALLBACK_MIN_ATTEMPT;
}

function resolvePlannerPathType(
  strategy: PlannerStrategy,
): 'full_day' | 'micro_day_split' | 'constrained_completion' {
  if (strategy === 'micro_day_split') {
    return 'micro_day_split';
  }
  if (strategy === 'constrained_completion') {
    return 'constrained_completion';
  }
  return 'full_day';
}

function resolveSeedTimeoutCap(runtimeProfile?: string): number {
  return runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    ? SEED_REQUEST_TIMEOUT_CAP_MS[NETLIFY_FREE_RUNTIME_PROFILE]
    : SEED_REQUEST_TIMEOUT_CAP_MS.default;
}

function resolveDayTimeoutCap(runtimeProfile?: string): number {
  return runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    ? DAY_REQUEST_TIMEOUT_CAP_MS[NETLIFY_FREE_RUNTIME_PROFILE]
    : DAY_REQUEST_TIMEOUT_CAP_MS.default;
}

function resolveSeedPromptVariant(seedAttempt: number): SeedPromptVariant {
  if (seedAttempt >= 3) {
    return 'ultra_compact';
  }
  if (seedAttempt === 2) {
    return 'compact';
  }
  return 'standard';
}

function resolveSeedTemperature(baseTemperature: number, seedAttempt: number): number {
  if (seedAttempt >= 3) {
    return Math.min(baseTemperature, 0.3);
  }
  if (seedAttempt === 2) {
    return Math.min(baseTemperature, 0.4);
  }
  return baseTemperature;
}

function resolveDayPromptVariant(dayAttempt: number): SeedPromptVariant {
  if (dayAttempt >= 3) {
    return 'ultra_compact';
  }
  if (dayAttempt === 2) {
    return 'compact';
  }
  return 'standard';
}

function resolveDayTemperature(baseTemperature: number, dayAttempt: number): number {
  if (dayAttempt >= 3) {
    return Math.min(baseTemperature, 0.3);
  }
  if (dayAttempt === 2) {
    return Math.min(baseTemperature, 0.4);
  }
  return baseTemperature;
}

function resolveRecommendedStopsLine(normalized: NormalizedRequest): string {
  const range = RECOMMENDED_STOPS_PER_DAY[normalized.pace];
  return `${range.min}-${range.max}`;
}

function buildPlannerConditions(
  normalized: NormalizedRequest,
  options: PlannerConditionBuildOptions = DEFAULT_PLANNER_CONDITION_OPTIONS,
): string[] {
  const hard = normalized.hardConstraints;
  const soft = normalized.softPreferences;
  const parts: string[] = [];

  parts.push('## 旅行条件');
  parts.push(`- 目的地: ${takeTop(normalized.destinations, 1).join(', ')}`);
  parts.push(`- 日数: ${normalized.durationDays}日`);
  parts.push(`- 同行者: ${normalized.companions}`);
  parts.push(`- 予算: ${normalized.budgetLevel}`);
  parts.push(`- ペース: ${normalized.pace}`);
  parts.push(`- 推奨ストップ数: ${resolveRecommendedStopsLine(normalized)}件/日`);

  if (normalized.travelVibe) {
    parts.push(`- 雰囲気: ${normalized.travelVibe}`);
  }
  if (normalized.preferredTransport.length > 0) {
    parts.push(`- 移動手段: ${takeTop(normalized.preferredTransport, options.transportLimit).join(', ')}`);
  }
  if (normalized.themes.length > 0) {
    parts.push(`- テーマ: ${takeTop(normalized.themes, options.themeLimit).join(', ')}`);
  }

  appendListSection(parts, '必ず含めるスポット', takeTop(hard.mustVisitPlaces, options.mustVisitLimit));
  appendListSection(parts, '優先度の高い要望', takeTop(soft.rankedRequests, options.rankedRequestLimit));
  appendListSection(parts, '追加指示', takeTop(hard.freeTextDirectives, options.directiveLimit));

  if (normalized.freeText) {
    parts.push('\n## 自由記述');
    parts.push(normalized.freeText.slice(0, options.freeTextLimit));
  }

  return parts;
}

function buildSeedSystemInstruction(variant: SeedPromptVariant): string {
  const strictnessLine = variant === 'standard'
    ? 'mainArea と overnightLocation を省略しない'
    : 'mainArea と overnightLocation を短い地名で必ず埋め、空欄にしない';

  return `あなたは Tabidea の canonical planner seed generator です。
役割は、旅行全体の day skeleton を 1 つの JSON オブジェクトで返すことです。

厳守事項:
- 必ず有効な JSON オブジェクトのみを返す
- Markdown、前置き、補足説明は出さない
- days は指定日数ぶん必ず返す
- 各 day は day, mainArea, overnightLocation だけを返す
- ${strictnessLine}
- 初日は軽め、最終日は出発しやすい構成にする
- エリアは無理に広げず、日ごとにまとまりを持たせる`;
}

function buildSeedPrompt(normalized: NormalizedRequest, variant: SeedPromptVariant): string {
  const parts = buildPlannerConditions(normalized, SEED_PLANNER_CONDITION_OPTIONS[variant]);
  parts.push('\n## 出力指示');
  parts.push(`1. days は ${normalized.durationDays} 件ちょうど返す`);
  parts.push('2. 各 day は day, mainArea, overnightLocation のみ返す');
  parts.push('3. 1日ごとに主エリアを絞る');
  parts.push('4. 初日と最終日は移動負荷を下げる');
  parts.push('5. mainArea と overnightLocation は必ず両方埋める');
  parts.push('6. JSON 以外は返さない');

  if (variant !== 'standard') {
    parts.push('7. 値は短い地名だけにして説明文を書かない');
  }

  return parts.join('\n');
}

function buildDaySystemInstruction(): string {
  return `あなたは Tabidea の canonical planner day generator です。
役割は、指定された 1 日ぶんの stops を 1 つの JSON オブジェクトで返すことです。

厳守事項:
- 必ず有効な JSON オブジェクトのみを返す
- Markdown、前置き、補足説明は出さない
- 出力は day, stops のみ
- stops の各要素は name, role, timeSlotHint を必ず返す
- areaHint は分かる場合だけ短い地名で返す
- 各日に少なくとも 1 つ role=meal を含める
- 実在する具体的な固有名詞だけを使う
- 既に使ったスポットは重複させない`;
}

function buildConstrainedCompletionSystemInstruction(): string {
  return `あなたは Tabidea の constrained day completion planner です。
役割は、失敗した 1 日ぶんを最小限かつ成立性優先で再構成することです。

厳守事項:
- 必ず有効な JSON オブジェクトのみを返す
- Markdown、前置き、補足説明は出さない
- 出力は day, stops のみ
- stops の各要素は name, role, timeSlotHint を必ず返す
- areaHint は分かる場合だけ短い地名で返す
- stop 数は必要最小限でよいが、指定された最低件数は必ず満たす
- 各日に少なくとも 1 つ role=meal を含める
- 実在する具体的な固有名詞だけを使う
- 既に使ったスポットは重複させない
- 迷ったら派手さより成立性を優先する`;
}

function buildDayOutlineSystemInstruction(): string {
  return `あなたは Tabidea の canonical planner day outline generator です。
役割は、指定された 1 日ぶんの訪問スロット骨格だけを 1 つの JSON オブジェクトで返すことです。

厳守事項:
- 必ず有効な JSON オブジェクトのみを返す
- Markdown、前置き、補足説明は出さない
- 出力は day, slots のみ
- slots の各要素は slotIndex, role, timeSlotHint を必ず返す
- areaHint は分かる場合だけ短い地名で返す
- slotIndex は 1 から連番にする
- 各日に少なくとも 1 つ role=meal を含める`;
}

function buildDayChunkSystemInstruction(): string {
  return `あなたは Tabidea の canonical planner day chunk generator です。
役割は、指定された訪問スロットに対応する具体的なスポット名だけを 1 つの JSON オブジェクトで返すことです。

厳守事項:
- 必ず有効な JSON オブジェクトのみを返す
- Markdown、前置き、補足説明は出さない
- 出力は day, stops のみ
- stops の各要素は slotIndex, name, role, timeSlotHint を必ず返す
- areaHint は分かる場合だけ短い地名で返す
- 与えられた slotIndex 以外は返さない
- 実在する具体的な固有名詞だけを使う
- 既に使ったスポットは重複させない`;
}

function buildDayPrompt(
  normalized: NormalizedRequest,
  seed: PlannerSeed,
  targetDay: PlannerSeedDay,
  completedDraft: PlannerDraft,
  variant: SeedPromptVariant,
  runtimeProfile?: string,
  dayAttempt = 1,
): string {
  const usedStopItems = collectUsedStopPromptItems(completedDraft.days);
  const remainingMustVisit = normalized.hardConstraints.mustVisitPlaces
    .filter((place) => !buildUsedStopIdentitySet(completedDraft.days).has(`name:${normalizeStopIdentity(place)}`));
  const targetStopCount = resolveTargetStopCount(normalized, runtimeProfile, dayAttempt, targetDay.day);
  const hardMinimum = resolveHardMinimumStopCount(normalized, targetDay.day);

  if (variant === 'ultra_compact') {
    const parts: string[] = [];
    parts.push('## 旅行条件');
    parts.push(`- 目的地: ${takeTop(normalized.destinations, 1).join(', ')}`);
    parts.push(`- 日数: ${normalized.durationDays}日`);
    parts.push(`- ペース: ${normalized.pace}`);
    parts.push(`- Day ${targetDay.day}`);
    parts.push(`- mainArea: ${targetDay.mainArea}`);
    parts.push(`- overnightLocation: ${targetDay.overnightLocation}`);
    parts.push(`- この日の中心エリアは ${targetDay.mainArea} から大きく外さない`);
    parts.push(`- stop 数の目安: ${targetStopCount} (最低 ${hardMinimum})`);
    parts.push('- 昼で終わらせない。固定の帰路制約がない限り、午後以降の実活動を必ず入れる');
    parts.push('- hotel / accommodation / check-in / check-out / flight / airport を観光 stop として使わない');

    if (usedStopItems.length > 0) {
      appendListSection(parts, '既に確定したスポット', usedStopItems.slice(0, 12));
    }
    if (remainingMustVisit.length > 0) {
      appendListSection(parts, '優先 must_visit', takeTop(remainingMustVisit, 2));
    }

    parts.push('\n## 出力指示');
    parts.push(`1. この日の JSON だけを返す (day は ${targetDay.day})`);
    parts.push('2. stops は訪問順に並べる');
    parts.push(`3. stops は ${targetStopCount} 件前後にし、少なくとも ${hardMinimum} 件は返す`);
    parts.push('4. 各 stop は name, role, timeSlotHint を必ず埋める');
    parts.push('5. areaHint は分かるなら短い地名を書く');
    parts.push('6. role=meal を必ず 1 件以上含める');
    parts.push('7. 固定の帰路制約がない限り、afternoon または evening の recommended/must_visit を必ず 1 件以上含める');
    parts.push('8. JSON 以外は返さない');
    parts.push('\n## stop 例');
    parts.push('{"name":"近江町市場","role":"meal","timeSlotHint":"midday","areaHint":"武蔵"}');
    return parts.join('\n');
  }

  const parts = buildPlannerConditions(normalized, DAY_PLANNER_CONDITION_OPTIONS[variant]);

  parts.push('\n## 全体 skeleton');
  for (const day of seed.days) {
    parts.push(`- Day ${day.day}: ${day.mainArea} / 宿泊 ${day.overnightLocation}`);
  }

  parts.push('\n## 対象日');
  parts.push(`- Day ${targetDay.day}`);
  parts.push(`- mainArea: ${targetDay.mainArea}`);
  parts.push(`- overnightLocation: ${targetDay.overnightLocation}`);
  parts.push(`- stop 数の目安: ${targetStopCount} (最低 ${hardMinimum})`);
  parts.push('- 昼で終わらせない。固定の帰路制約がない限り、午後以降の実活動を必ず入れる');
  parts.push('- hotel / accommodation / check-in / check-out / flight / airport を観光 stop として使わない');

  if (usedStopItems.length > 0) {
    parts.push('\n## 既に確定したスポット');
    const usedStopLimit = variant === 'compact' ? 10 : 16;
    for (const stop of usedStopItems.slice(0, usedStopLimit)) {
      parts.push(`- ${stop}`);
    }
  }

  if (remainingMustVisit.length > 0) {
    appendListSection(
      parts,
      'この日以降で優先したい must_visit',
      takeTop(remainingMustVisit, variant === 'compact' ? 3 : 4),
    );
  }

  parts.push('\n## 出力指示');
  parts.push(`1. この日の JSON だけを返す (day は ${targetDay.day})`);
  parts.push('2. stops は訪問順に並べる');
  parts.push(`3. stops は通常 ${targetStopCount} 件前後に収め、少なくとも ${hardMinimum} 件は返す`);
  parts.push('4. 各 stop は name, role, timeSlotHint を必ず埋める');
  parts.push('5. areaHint は分かる範囲で対象日の mainArea に沿わせる');
  parts.push('6. role=meal を必ず 1 件以上含める');
  parts.push('7. 固定の帰路制約がない限り、afternoon または evening の recommended/must_visit を必ず 1 件以上含める');
  parts.push('8. 重複スポットは出さない');
  parts.push('9. JSON 以外は返さない');

  return parts.join('\n');
}

function buildDayOutlinePrompt(
  normalized: NormalizedRequest,
  targetDay: PlannerSeedDay,
  completedDraft: PlannerDraft,
  runtimeProfile?: string,
): string {
  const usedStopItems = collectUsedStopPromptItems(completedDraft.days);
  const targetStopCount = resolveTargetStopCount(normalized, runtimeProfile, 1, targetDay.day);
  const hardMinimum = resolveHardMinimumStopCount(normalized, targetDay.day);
  const remainingMustVisit = normalized.hardConstraints.mustVisitPlaces
    .filter((place) => !buildUsedStopIdentitySet(completedDraft.days).has(`name:${normalizeStopIdentity(place)}`))
    .slice(0, 2);

  const parts: string[] = [];
  parts.push('## 旅行条件');
  parts.push(`- 目的地: ${takeTop(normalized.destinations, 1).join(', ')}`);
  parts.push(`- 日数: ${normalized.durationDays}日`);
  parts.push(`- ペース: ${normalized.pace}`);
  parts.push(`- Day ${targetDay.day}`);
  parts.push(`- mainArea: ${targetDay.mainArea}`);
  parts.push(`- overnightLocation: ${targetDay.overnightLocation}`);
  parts.push(`- slot 数の目安: ${targetStopCount} (最低 ${hardMinimum})`);
  parts.push('- 昼で終わらせない。固定の帰路制約がない限り、afternoon または evening の実活動 slot を必ず含める');
  parts.push('- hotel / accommodation / check-in / check-out / flight / airport を slot に使わない');
  if (usedStopItems.length > 0) {
    appendListSection(parts, '既に確定したスポット', usedStopItems.slice(0, 12));
  }
  if (remainingMustVisit.length > 0) {
    appendListSection(parts, '優先 must_visit', remainingMustVisit);
  }
  parts.push('\n## 出力指示');
  parts.push(`1. この日の JSON だけを返す (day は ${targetDay.day})`);
  parts.push(`2. slots は ${targetStopCount} 件前後にし、少なくとも ${hardMinimum} 件は返す`);
  parts.push('3. slotIndex は 1 から連番にする');
  parts.push('4. 各 slot は slotIndex, role, timeSlotHint を必ず埋める');
  parts.push('5. areaHint は分かる場合だけ短い地名を書く');
  parts.push('6. role=meal を必ず 1 件以上含める');
  parts.push('7. 固定の帰路制約がない限り、afternoon または evening の recommended/must_visit slot を必ず 1 件以上含める');
  parts.push('8. JSON 以外は返さない');
  parts.push('\n## slot 例');
  parts.push('{"slotIndex":1,"role":"meal","timeSlotHint":"midday","areaHint":"近江町周辺"}');
  return parts.join('\n');
}

function buildConstrainedCompletionPrompt(
  normalized: NormalizedRequest,
  targetDay: PlannerSeedDay,
  completedDraft: PlannerDraft,
): string {
  const usedStopItems = collectUsedStopPromptItems(completedDraft.days);
  const hardMinimum = resolveHardMinimumStopCount(normalized, targetDay.day);
  const remainingMustVisit = normalized.hardConstraints.mustVisitPlaces
    .filter((place) => !buildUsedStopIdentitySet(completedDraft.days).has(`name:${normalizeStopIdentity(place)}`))
    .slice(0, 2);

  const parts: string[] = [];
  parts.push('## 旅行条件');
  parts.push(`- 目的地: ${takeTop(normalized.destinations, 1).join(', ')}`);
  parts.push(`- Day ${targetDay.day}`);
  parts.push(`- mainArea: ${targetDay.mainArea}`);
  parts.push(`- overnightLocation: ${targetDay.overnightLocation}`);
  parts.push(`- 最低 stop 数: ${hardMinimum}`);
  parts.push('- この日は成立性優先で最小限の完成形を作る');
  parts.push('- hotel / accommodation / check-in / check-out / flight / airport を stop に使わない');
  if (usedStopItems.length > 0) {
    appendListSection(parts, '既に確定したスポット', usedStopItems.slice(0, 12));
  }
  if (remainingMustVisit.length > 0) {
    appendListSection(parts, 'まだ入っていない must_visit', remainingMustVisit);
  }
  parts.push('\n## 出力指示');
  parts.push(`1. この日の JSON だけを返す (day は ${targetDay.day})`);
  parts.push(`2. stops は ${hardMinimum} 件から ${hardMinimum + 1} 件だけ返す`);
  parts.push('3. 各 stop は name, role, timeSlotHint を必ず埋める');
  parts.push('4. role=meal を必ず 1 件以上含める');
  parts.push('5. areaHint は対象日の mainArea から大きく外さない');
  parts.push('6. 固定の帰路制約がない限り、afternoon または evening の recommended/must_visit を必ず 1 件以上含める');
  parts.push('7. 同じスポットを再利用しない');
  parts.push('8. JSON 以外は返さない');
  parts.push('\n## stop 例');
  parts.push('{"name":"近江町市場","role":"meal","timeSlotHint":"midday","areaHint":"武蔵"}');
  return parts.join('\n');
}

function buildDayChunkPrompt(
  normalized: NormalizedRequest,
  targetDay: PlannerSeedDay,
  outline: PlannerDayOutline,
  chunkSlots: PlannerDayOutlineSlot[],
  completedDraft: PlannerDraft,
): string {
  const usedStopItems = collectUsedStopPromptItems(completedDraft.days);
  const parts: string[] = [];
  parts.push('## 旅行条件');
  parts.push(`- 目的地: ${takeTop(normalized.destinations, 1).join(', ')}`);
  parts.push(`- Day ${targetDay.day}`);
  parts.push(`- mainArea: ${targetDay.mainArea}`);
  parts.push(`- overnightLocation: ${targetDay.overnightLocation}`);
  parts.push('\n## この日の slot 骨格');
  for (const slot of outline.slots) {
    parts.push(`- slot ${slot.slotIndex}: ${slot.role} / ${slot.timeSlotHint}${slot.areaHint ? ` / ${slot.areaHint}` : ''}`);
  }
  parts.push('\n## 今回埋める slot');
  for (const slot of chunkSlots) {
    parts.push(`- slot ${slot.slotIndex}: ${slot.role} / ${slot.timeSlotHint}${slot.areaHint ? ` / ${slot.areaHint}` : ''}`);
  }
  if (usedStopItems.length > 0) {
    appendListSection(parts, '既に確定したスポット', usedStopItems.slice(0, 16));
  }
  parts.push('\n## 出力指示');
  parts.push(`1. この日の JSON だけを返す (day は ${targetDay.day})`);
  parts.push(`2. stops は今回埋める slot ${chunkSlots.map((slot) => slot.slotIndex).join(', ')} だけ返す`);
  parts.push('3. 各 stop は slotIndex, name, role, timeSlotHint を必ず埋める');
  parts.push('4. role と timeSlotHint は指定 slot と一致させる');
  parts.push('5. areaHint は分かる場合だけ短い地名を書く');
  parts.push('6. JSON 以外は返さない');
  parts.push('\n## stop 例');
  parts.push('{"slotIndex":1,"name":"近江町市場","role":"meal","timeSlotHint":"midday","areaHint":"武蔵"}');
  return parts.join('\n');
}

function seedOutputToPlannerSeed(output: PlannerSeedLlmOutput): PlannerSeed {
  return {
    days: output.days.map((day) => ({
      day: day.day,
      mainArea: day.mainArea,
      overnightLocation: day.overnightLocation,
    })),
  };
}

function dayOutputToPlannerDay(output: PlannerDayStopsLlmOutput, seedDay: PlannerSeedDay): PlannerDraftDay {
  return {
    day: seedDay.day,
    mainArea: seedDay.mainArea,
    overnightLocation: seedDay.overnightLocation,
    stops: output.stops.map((stop) => ({
      name: stop.name,
      searchQuery: stop.name,
      role: stop.role,
      timeSlotHint: stop.timeSlotHint,
      areaHint: stop.areaHint || seedDay.mainArea,
    })),
  };
}

function outlineOutputToPlannerOutline(output: PlannerDayOutlineLlmOutput): PlannerDayOutline {
  return {
    day: output.day,
    slots: output.slots.map((slot) => ({
      slotIndex: slot.slotIndex,
      role: slot.role,
      timeSlotHint: slot.timeSlotHint,
      areaHint: slot.areaHint,
    })),
  };
}

function chunkOutputToPlannerChunkStops(
  output: PlannerDayChunkLlmOutput,
  seedDay: PlannerSeedDay,
): PlannerDayChunkStop[] {
  return output.stops.map((stop) => ({
    slotIndex: stop.slotIndex,
    name: stop.name,
    searchQuery: stop.name,
    role: stop.role,
    timeSlotHint: stop.timeSlotHint,
    areaHint: stop.areaHint || seedDay.mainArea,
  }));
}

function upsertPlannerChunkStops(
  existing: PlannerDayChunkStop[],
  incoming: PlannerDayChunkStop[],
): PlannerDayChunkStop[] {
  const bySlot = new Map(existing.map((stop) => [stop.slotIndex, stop]));
  for (const stop of incoming) {
    bySlot.set(stop.slotIndex, stop);
  }
  return [...bySlot.values()].sort((left, right) => left.slotIndex - right.slotIndex);
}

function buildPlannerDayFromOutlineAndChunks(
  seedDay: PlannerSeedDay,
  outline: PlannerDayOutline,
  chunkStops: PlannerDayChunkStop[],
): PlannerDraftDay | null {
  const bySlot = new Map(chunkStops.map((stop) => [stop.slotIndex, stop]));
  if (outline.slots.some((slot) => !bySlot.has(slot.slotIndex))) {
    return null;
  }

  return {
    day: seedDay.day,
    mainArea: seedDay.mainArea,
    overnightLocation: seedDay.overnightLocation,
    stops: outline.slots.map((slot) => {
      const stop = bySlot.get(slot.slotIndex)!;
      return {
        name: stop.name,
        searchQuery: stop.searchQuery,
        role: stop.role,
        timeSlotHint: stop.timeSlotHint,
        areaHint: stop.areaHint || slot.areaHint || seedDay.mainArea,
      };
    }),
  };
}

function upsertPlannerDay(
  plannerDraft: PlannerDraft,
  dayDraft: PlannerDraftDay,
): PlannerDraft {
  const filtered = plannerDraft.days.filter((day) => day.day !== dayDraft.day);
  return {
    days: [...filtered, dayDraft].sort((left, right) => left.day - right.day),
  };
}

function resolveTargetDay(
  seed: PlannerSeed,
  plannerDraft: PlannerDraft,
  requestedDayIndex?: number | null,
): number {
  if (requestedDayIndex && requestedDayIndex >= 1 && requestedDayIndex <= seed.days.length) {
    return requestedDayIndex;
  }

  const completed = new Set(plannerDraft.days.map((day) => day.day));
  const next = seed.days.find((day) => !completed.has(day.day));
  return next?.day ?? (seed.days.length + 1);
}

function mergeSeedAndDraft(seed: PlannerSeed, plannerDraft: PlannerDraft): PlannerDraft | null {
  const byDay = new Map(plannerDraft.days.map((day) => [day.day, day]));
  const days: PlannerDraftDay[] = [];

  for (const seedDay of seed.days) {
    const draftDay = byDay.get(seedDay.day);
    if (!draftDay || draftDay.stops.length === 0) {
      return null;
    }

    days.push({
      day: seedDay.day,
      mainArea: seedDay.mainArea,
      overnightLocation: seedDay.overnightLocation,
      stops: draftDay.stops,
    });
  }

  return { days };
}

function calculateCanonicalDraftTimeoutMs(
  ctx: PassContext,
): number {
  const reserveMs = STREAM_FINALIZE_RESERVE_MS + STREAM_CLOSE_RESERVE_MS;
  return Math.max(
    0,
    Math.min(PASS_BUDGET_MS.draft_generate, ctx.budget.remainingMs() - reserveMs),
  );
}

function calculateSeedTimeoutMs(
  runtimeProfile: string | undefined,
  overallTimeoutMs: number,
  seedAttempt = 1,
): number {
  const retryAdjustedCap = Math.min(
    runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE ? 5_000 : 7_000,
    resolveSeedTimeoutCap(runtimeProfile) + Math.max(0, seedAttempt - 1) * 500,
  );
  return Math.max(
    0,
    Math.min(overallTimeoutMs, retryAdjustedCap),
  );
}

function calculateDayTimeoutMs(
  runtimeProfile: string | undefined,
  overallTimeoutMs: number,
  remainingDays: number,
  dayAttempt = 1,
): number {
  if (dayAttempt >= 3) {
    const cap = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE ? 7_000 : 5_500;
    return Math.max(0, Math.min(cap, overallTimeoutMs));
  }

  if (dayAttempt === 2) {
    const cap = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE ? 6_000 : 5_000;
    return Math.max(0, Math.min(cap, overallTimeoutMs));
  }

  const cap = resolveDayTimeoutCap(runtimeProfile);
  const evenlySplit = Math.floor(overallTimeoutMs / Math.max(remainingDays, 1));
  const minimumFirstAttempt = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE ? 5_000 : MIN_DAY_REQUEST_TIMEOUT_MS;
  return Math.max(0, Math.min(cap, overallTimeoutMs, Math.max(evenlySplit, minimumFirstAttempt)));
}

function calculateOutlineTimeoutMs(
  runtimeProfile: string | undefined,
  overallTimeoutMs: number,
  outlineAttempt = 1,
): number {
  return calculateDayTimeoutMs(runtimeProfile, overallTimeoutMs, 1, outlineAttempt);
}

function calculateChunkTimeoutMs(
  runtimeProfile: string | undefined,
  overallTimeoutMs: number,
  chunkAttempt = 1,
): number {
  if (chunkAttempt >= 3) {
    const cap = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE ? 6_500 : 7_000;
    return Math.max(0, Math.min(cap, overallTimeoutMs));
  }
  if (chunkAttempt === 2) {
    const cap = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE ? 5_500 : 6_000;
    return Math.max(0, Math.min(cap, overallTimeoutMs));
  }
  const cap = runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE ? 4_500 : 5_000;
  return Math.max(0, Math.min(cap, overallTimeoutMs));
}

function resolveMinimumDayStartBudgetMs(
  runtimeProfile: string | undefined,
  dayAttempt: number,
): number {
  if (dayAttempt <= 1 && runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE) {
    return 5_000;
  }

  return MIN_DAY_REQUEST_TIMEOUT_MS;
}

function shouldPauseBeforeFirstDay(params: {
  runtimeProfile?: string;
  seedAttempt: number;
  usedTextRecovery: boolean;
  seedTimeoutMs: number;
  elapsedMs: number;
  remainingMs: number;
}): boolean {
  const minimumDayStartBudgetMs = resolveMinimumDayStartBudgetMs(params.runtimeProfile, 1);
  const minimumSafeRemainingMs = params.runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    ? minimumDayStartBudgetMs + 1_500
    : minimumDayStartBudgetMs + DAY_PROGRESS_RESERVE_MS;

  return (
    params.usedTextRecovery
    || params.seedAttempt >= 3
    || params.elapsedMs >= Math.floor(PASS_BUDGET_MS.draft_generate * 0.45)
    || params.remainingMs < minimumSafeRemainingMs
  );
}

function clearDraftGenerateResumePatch() {
  return {
    resumePassId: null,
    resumeSubstage: null,
    pauseReason: null,
    plannerRawText: null,
    plannerAttempt: null,
    nextDayIndex: null,
    dayChunkIndex: null,
    seedAttempt: null,
    dayAttempt: null,
    outlineAttempt: null,
    chunkAttempt: null,
    plannerRequestAttempt: null,
    draftGenerateStrategyDay: null,
    draftGenerateCurrentStrategy: null,
    draftGenerateStrategyEscalationCount: null,
    draftGenerateRecoveryCount: null,
    draftGeneratePauseCount: null,
    draftGenerateSameErrorFingerprint: null,
    draftGenerateSameErrorRecurrenceCount: null,
    currentDayExecution: null,
  };
}

interface DraftGenerateHarnessState {
  strategyDay: number | null;
  currentStrategy: PlannerStrategy | null;
  strategyEscalationCount: number;
  recoveryCount: number;
  pauseCount: number;
  sameErrorFingerprint: string | null;
  sameErrorRecurrenceCount: number;
}

function resolveLegacyDraftGenerateCurrentDayExecution(
  pipelineContext: PassContext['session']['pipelineContext'],
): DraftGenerateCurrentDayExecution | null {
  if (!pipelineContext || pipelineContext.resumePassId !== 'draft_generate') {
    return null;
  }

  const substage = resolveSubstage(pipelineContext.resumeSubstage);
  const dayIndex = typeof pipelineContext.nextDayIndex === 'number'
    ? pipelineContext.nextDayIndex
    : null;
  const strategy = pipelineContext.draftGenerateCurrentStrategy;

  if (!substage || dayIndex === null || !strategy) {
    return null;
  }

  return {
    dayIndex,
    strategy,
    substage,
    attempt: Math.max(
      1,
      pipelineContext.plannerRequestAttempt
      ?? pipelineContext.dayAttempt
      ?? pipelineContext.outlineAttempt
      ?? pipelineContext.chunkAttempt
      ?? 1,
    ),
    seedAttempt: pipelineContext.seedAttempt ?? null,
    dayAttempt: pipelineContext.dayAttempt ?? null,
    outlineAttempt: pipelineContext.outlineAttempt ?? null,
    chunkAttempt: pipelineContext.chunkAttempt ?? null,
    plannerRequestAttempt: pipelineContext.plannerRequestAttempt ?? null,
    dayChunkIndex: pipelineContext.dayChunkIndex ?? null,
    sameErrorFingerprint: pipelineContext.draftGenerateSameErrorFingerprint ?? null,
    sameErrorRecurrenceCount: pipelineContext.draftGenerateSameErrorRecurrenceCount ?? 0,
    strategyEscalationCount: pipelineContext.draftGenerateStrategyEscalationCount ?? 0,
    recoveryCount: pipelineContext.draftGenerateRecoveryCount ?? 0,
    pauseCount: pipelineContext.draftGeneratePauseCount ?? 0,
    requiredMissingRoles: null,
  };
}

function resolveCurrentDayExecutionFromPipelineContext(
  pipelineContext: PassContext['session']['pipelineContext'],
): DraftGenerateCurrentDayExecution | null {
  const current = pipelineContext?.currentDayExecution;
  if (
    current
    && typeof current.dayIndex === 'number'
    && resolveSubstage(current.substage)
    && (
      current.strategy === 'split_day_v5'
      || current.strategy === 'micro_day_split'
    )
  ) {
    return current;
  }

  return resolveLegacyDraftGenerateCurrentDayExecution(pipelineContext);
}

function buildRequiredMissingRoles(options: {
  errorCode?: string;
  validationIssueCode?: string;
}): string[] | null {
  if (
    options.errorCode === 'draft_generation_missing_meal'
    || options.validationIssueCode === 'missing_meal'
  ) {
    return ['meal'];
  }

  if (
    options.errorCode === 'activity_only_until_midday'
    || options.errorCode === 'missing_afternoon_activity'
    || options.validationIssueCode === 'missing_afternoon_activity'
  ) {
    return ['afternoon_activity'];
  }

  return null;
}

function buildCurrentDayExecution(
  harnessState: DraftGenerateHarnessState,
  options: {
    plannerAttempt: number;
    plannerStrategy?: PlannerStrategy;
    resumeSubstage: DraftGenerateResumeSubstage;
    nextDayIndex?: number | null;
    dayChunkIndex?: number | null;
    seedAttempt?: number | null;
    dayAttempt?: number | null;
    outlineAttempt?: number | null;
    chunkAttempt?: number | null;
    requiredMissingRoles?: string[] | null;
    dayType?: 'arrival' | 'middle' | 'departure' | null;
    outlineArtifact?: PlannerDayOutline | null;
    chunkArtifacts?: PlannerDayChunkStop[] | null;
    candidateStops?: PlannerDraftStop[] | null;
  },
): DraftGenerateCurrentDayExecution | null {
  if (
    typeof options.nextDayIndex !== 'number'
    || !options.plannerStrategy
  ) {
    return null;
  }

  return {
    dayIndex: options.nextDayIndex,
    dayType: options.dayType ?? null,
    strategy: options.plannerStrategy,
    substage: options.resumeSubstage,
    attempt: Math.max(1, options.plannerAttempt),
    seedAttempt: options.seedAttempt ?? null,
    dayAttempt: options.dayAttempt ?? null,
    outlineAttempt: options.outlineAttempt ?? null,
    chunkAttempt: options.chunkAttempt ?? null,
    plannerRequestAttempt: options.plannerAttempt,
    dayChunkIndex: options.dayChunkIndex ?? null,
    sameErrorFingerprint: harnessState.sameErrorFingerprint,
    sameErrorRecurrenceCount: harnessState.sameErrorRecurrenceCount,
    strategyEscalationCount: harnessState.strategyEscalationCount,
    recoveryCount: harnessState.recoveryCount,
    pauseCount: harnessState.pauseCount,
    requiredMissingRoles: options.requiredMissingRoles ?? null,
    outlineArtifact: options.outlineArtifact ?? null,
    chunkArtifacts: options.chunkArtifacts ?? null,
    candidateStops: options.candidateStops ?? null,
  };
}

interface DraftGenerateClassificationContext {
  plannerStrategy?: PlannerStrategy;
  substage?: DraftGenerateResumeSubstage;
  rawText?: string;
}

function resolveDraftGenerateHarnessState(ctx: PassContext): DraftGenerateHarnessState {
  const pipelineContext = ctx.session.pipelineContext;
  const currentDayExecution = resolveCurrentDayExecutionFromPipelineContext(pipelineContext);
  const currentStrategy = currentDayExecution?.strategy ?? pipelineContext?.draftGenerateCurrentStrategy;

  return {
    strategyDay: currentDayExecution?.dayIndex
      ?? pipelineContext?.draftGenerateStrategyDay
      ?? (currentStrategy ? pipelineContext?.nextDayIndex ?? null : null),
    currentStrategy: currentStrategy === 'micro_day_split'
      || currentStrategy === 'split_day_v5'
      ? currentStrategy
      : null,
    strategyEscalationCount: Math.max(
      0,
      currentDayExecution?.strategyEscalationCount
      ?? pipelineContext?.draftGenerateStrategyEscalationCount
      ?? 0,
    ),
    recoveryCount: Math.max(
      0,
      currentDayExecution?.recoveryCount
      ?? pipelineContext?.draftGenerateRecoveryCount
      ?? 0,
    ),
    pauseCount: Math.max(
      0,
      currentDayExecution?.pauseCount
      ?? pipelineContext?.draftGeneratePauseCount
      ?? 0,
    ),
    sameErrorFingerprint: currentDayExecution?.sameErrorFingerprint
      ?? pipelineContext?.draftGenerateSameErrorFingerprint
      ?? null,
    sameErrorRecurrenceCount: Math.max(
      0,
      currentDayExecution?.sameErrorRecurrenceCount
      ?? pipelineContext?.draftGenerateSameErrorRecurrenceCount
      ?? 0,
    ),
  };
}

function buildDraftGenerateErrorFingerprint(options: {
  plannerStrategy?: PlannerStrategy;
  substage: DraftGenerateResumeSubstage;
  nextDayIndex?: number | null;
  dayChunkIndex?: number | null;
  errorCode?: string;
  invalidFieldPath?: string;
}): string | null {
  if (!options.plannerStrategy || !options.errorCode) {
    return null;
  }

  return [
    options.plannerStrategy,
    options.substage,
    options.errorCode,
    options.invalidFieldPath ?? 'base',
    options.nextDayIndex ?? 'seed',
    options.dayChunkIndex ?? 'base',
  ].join(':');
}

function resolveNextDraftGenerateHarnessState(
  ctx: PassContext,
  options: {
    plannerStrategy?: PlannerStrategy;
    substage: DraftGenerateResumeSubstage;
    nextDayIndex?: number | null;
    dayChunkIndex?: number | null;
    pauseReason?: 'recovery_required' | 'runtime_budget_exhausted';
    errorCode?: string;
    invalidFieldPath?: string;
  },
): DraftGenerateHarnessState {
  const previous = resolveDraftGenerateHarnessState(ctx);
  const strategyDay = options.nextDayIndex ?? previous.strategyDay;
  const isSameDay = previous.strategyDay !== null && strategyDay !== null && previous.strategyDay === strategyDay;
  const strategy = options.plannerStrategy ?? previous.currentStrategy;
  const strategyEscalationCount = isSameDay && strategy && previous.currentStrategy && strategy !== previous.currentStrategy
    ? previous.strategyEscalationCount + 1
    : isSameDay
      ? previous.strategyEscalationCount
      : 0;
  const recoveryCount = isSameDay
    ? (options.pauseReason === 'recovery_required' ? previous.recoveryCount + 1 : previous.recoveryCount)
    : (options.pauseReason === 'recovery_required' ? 1 : 0);
  const pauseCount = isSameDay ? previous.pauseCount + 1 : 1;
  const sameErrorFingerprint = buildDraftGenerateErrorFingerprint({
    plannerStrategy: strategy ?? undefined,
    substage: options.substage,
    nextDayIndex: options.nextDayIndex,
    dayChunkIndex: options.dayChunkIndex,
    errorCode: options.errorCode,
    invalidFieldPath: options.invalidFieldPath,
  });
  const sameErrorRecurrenceCount = sameErrorFingerprint && isSameDay
    ? previous.sameErrorFingerprint === sameErrorFingerprint
      ? previous.sameErrorRecurrenceCount + 1
      : 1
    : 0;

  return {
    strategyDay,
    currentStrategy: strategy ?? null,
    strategyEscalationCount,
    recoveryCount,
    pauseCount,
    sameErrorFingerprint,
    sameErrorRecurrenceCount,
  };
}

function buildFinalDraftStrategySummary(state: DraftGenerateHarnessState) {
  return {
    strategyDay: state.strategyDay,
    lastStrategy: state.currentStrategy,
    escalationCount: state.strategyEscalationCount,
    recoveryCount: state.recoveryCount,
    pauseCount: state.pauseCount,
    fallbackHeavy: state.strategyEscalationCount > 0 || state.recoveryCount >= 3 || state.pauseCount >= 3,
  };
}

function logPlannerSubstageStart(
  ctx: PassContext,
  substage: DraftGenerateResumeSubstage,
  timeoutMs: number,
  maxTokens: number,
  promptChars: number,
  plannerAttempt: number,
  nextDayIndex?: number | null,
  dayChunkIndex?: number | null,
  seedPromptVariant?: SeedPromptVariant,
  dayPromptVariant?: SeedPromptVariant,
  plannerStrategy?: PlannerStrategy,
  plannerContractVersion?: string,
) {
  logRunCheckpoint({
    checkpoint: 'pass_started',
    runId: ctx.session.id,
    state: ctx.session.state,
    pipelineContext: ctx.session.pipelineContext,
    passId: 'draft_generate',
    attempt: plannerAttempt,
    substage,
    remainingMs: Math.max(0, ctx.budget.remainingMs()),
    timeoutMs,
    selectedTimeoutMs: timeoutMs,
    maxTokens,
    promptChars,
    plannerContractVersion: plannerContractVersion
      ?? resolvePlannerContractVersion(plannerStrategy ?? 'split_day_v5'),
    recoveryMode: substage.startsWith('seed_') ? 'draft_seed' : 'draft_day',
    dayCount: ctx.session.normalizedInput?.durationDays,
    nextDayIndex: nextDayIndex ?? undefined,
    dayChunkIndex: dayChunkIndex ?? undefined,
    seedPromptVariant,
    dayPromptVariant,
    plannerStrategy,
  });
}

function buildPauseResult(
  ctx: PassContext,
  options: {
    start: number;
    substage: DraftGenerateResumeSubstage;
    resumeSubstage: DraftGenerateResumeSubstage;
    timeoutMs: number;
    maxTokens: number;
    promptChars: number;
    plannerAttempt: number;
    pauseReason: 'recovery_required' | 'runtime_budget_exhausted';
    checkpointCursor: string;
    plannerSeed?: PlannerSeed | null;
    plannerDraft?: PlannerDraft;
    nextDayIndex?: number | null;
    dayChunkIndex?: number | null;
    seedAttempt?: number | null;
    dayAttempt?: number | null;
    outlineAttempt?: number | null;
    chunkAttempt?: number | null;
    usedTextRecovery?: boolean;
    salvagedDayCount?: number;
    expectedDayCount?: number;
    seedPromptVariant?: SeedPromptVariant;
    dayPromptVariant?: SeedPromptVariant;
    salvagedStopCount?: number;
    requiredMealRecovered?: boolean;
    completedDayCount?: number;
    continuedToNextDayInSameStream?: boolean;
    pauseAfterDayCompletion?: boolean;
    pauseAfterSeedCompletion?: boolean;
    seedElapsedMs?: number;
    minimumDayStartBudgetMs?: number;
    plannerStrategy?: PlannerStrategy;
    plannerContractVersion?: string;
    plannerDayOutline?: PlannerDayOutline | null;
    plannerDayChunks?: PlannerDayChunkStop[] | null;
    warnings?: string[];
    fallbackTriggered?: boolean;
    fallbackReason?: string;
    errorCode?: string;
    rootCause?: string;
    invalidFieldPath?: string;
    validationIssueCode?: string;
    message?: string;
    resetHarnessState?: boolean;
    finalDraftStrategySummary?: ReturnType<typeof buildFinalDraftStrategySummary>;
  },
): PassResult<PlannerDraft> {
  const harnessState = resolveNextDraftGenerateHarnessState(ctx, {
    plannerStrategy: options.plannerStrategy,
    substage: options.substage,
    nextDayIndex: options.nextDayIndex,
    dayChunkIndex: options.dayChunkIndex,
    pauseReason: options.pauseReason,
    errorCode: options.errorCode,
    invalidFieldPath: options.invalidFieldPath,
  });
  const effectiveHarnessState: DraftGenerateHarnessState = options.resetHarnessState
    ? {
      strategyDay: null,
      currentStrategy: null,
      strategyEscalationCount: 0,
      recoveryCount: 0,
      pauseCount: 0,
      sameErrorFingerprint: null,
      sameErrorRecurrenceCount: 0,
    }
    : harnessState;

  if (
    options.pauseReason === 'recovery_required'
    && options.errorCode
    && options.plannerStrategy === 'split_day_v5'
    && (
      options.errorCode === 'draft_generation_contract_mismatch'
      || options.errorCode === 'draft_generation_missing_meal'
    )
    && harnessState.sameErrorRecurrenceCount >= MAX_SAME_STRATEGY_ERROR_RECURRENCES
  ) {
    const escalatedHarnessState = resolveNextDraftGenerateHarnessState(ctx, {
      plannerStrategy: 'micro_day_split',
      substage: 'day_outline_request',
      nextDayIndex: options.nextDayIndex,
      pauseReason: 'recovery_required',
      errorCode: options.errorCode,
    });

    return {
      outcome: 'partial',
      data: options.plannerDraft,
      checkpointCursor: `draft_generate:day_outline_request:${options.nextDayIndex ?? 1}:1`,
      warnings: ['draft_generation_strategy_escalated'],
      durationMs: Date.now() - options.start,
      metadata: {
        substage: 'day_outline_request',
        selectedTimeoutMs: options.timeoutMs,
        maxTokens: options.maxTokens,
        promptChars: options.promptChars,
        plannerContractVersion: resolvePlannerContractVersion('micro_day_split'),
        recoveryMode: 'draft_day',
        usedTextRecovery: options.usedTextRecovery ?? false,
        pauseReason: 'recovery_required',
        errorCode: options.errorCode,
        rootCause: options.rootCause,
        previousErrorCode: options.errorCode,
        previousRootCause: options.rootCause,
        nextDayIndex: options.nextDayIndex ?? undefined,
        dayChunkIndex: undefined,
        seedAttempt: options.seedAttempt ?? undefined,
        dayAttempt: undefined,
        outlineAttempt: 1,
        chunkAttempt: undefined,
        invalidFieldPath: options.invalidFieldPath,
        validationIssueCode: options.validationIssueCode,
        message: options.message,
        completedDayCount: options.completedDayCount,
        completedStopCount: countCompletedStops(options.plannerDraft),
        duplicateStopCount: options.plannerDraft ? countDuplicateStops(options.plannerDraft) : undefined,
        underfilledDayCount: options.plannerDraft
          ? countUnderfilledDays(ctx.session.normalizedInput!, options.plannerDraft)
          : undefined,
        plannerStrategy: 'micro_day_split',
        pathType: resolvePlannerPathType('micro_day_split'),
        fallbackTriggered: true,
        fallbackReason: 'full_day_contract_recurrence_micro_split',
        currentStrategy: escalatedHarnessState.currentStrategy,
        strategyEscalationCount: escalatedHarnessState.strategyEscalationCount,
        recoveryCount: escalatedHarnessState.recoveryCount,
        pauseCount: escalatedHarnessState.pauseCount,
        sameErrorRecurrenceCount: escalatedHarnessState.sameErrorRecurrenceCount,
        completionGateFailed: false,
        resumeSourceRunId: ctx.session.pipelineContext?.resumedFromRunId,
        resumeStrategy: ctx.session.pipelineContext?.resumeStrategy,
        reusedArtifactKinds: ctx.session.pipelineContext?.reusedArtifactKinds,
        pipelineContextPatch: {
          resumePassId: 'draft_generate',
          resumeSubstage: 'day_outline_request',
          pauseReason: 'recovery_required',
          nextDayIndex: options.nextDayIndex ?? null,
          dayChunkIndex: null,
          seedAttempt: options.seedAttempt ?? null,
          dayAttempt: null,
          outlineAttempt: 1,
          chunkAttempt: null,
          plannerRequestAttempt: 1,
          plannerRawText: null,
          draftGenerateStrategyDay: escalatedHarnessState.strategyDay,
          draftGenerateCurrentStrategy: escalatedHarnessState.currentStrategy,
          draftGenerateStrategyEscalationCount: escalatedHarnessState.strategyEscalationCount,
          draftGenerateRecoveryCount: escalatedHarnessState.recoveryCount,
          draftGeneratePauseCount: escalatedHarnessState.pauseCount,
          draftGenerateSameErrorFingerprint: escalatedHarnessState.sameErrorFingerprint,
          draftGenerateSameErrorRecurrenceCount: escalatedHarnessState.sameErrorRecurrenceCount,
          currentDayExecution: buildCurrentDayExecution(escalatedHarnessState, {
            plannerAttempt: 1,
            plannerStrategy: 'micro_day_split',
            resumeSubstage: 'day_outline_request',
            nextDayIndex: options.nextDayIndex,
            seedAttempt: options.seedAttempt ?? null,
            outlineAttempt: 1,
            requiredMissingRoles: buildRequiredMissingRoles({
              errorCode: options.errorCode,
              validationIssueCode: options.validationIssueCode,
            }),
          }),
        },
        sessionPatch: {
          plannerSeed: options.plannerSeed ?? null,
          plannerDayOutline: null,
          plannerDayChunks: null,
        },
      },
    };
  }

  if (
    options.pauseReason === 'recovery_required'
    && options.errorCode
    && options.plannerStrategy === 'micro_day_split'
    && harnessState.sameErrorRecurrenceCount >= MAX_SAME_STRATEGY_ERROR_RECURRENCES
  ) {
    return buildTerminalFailureResult(ctx, {
      start: options.start,
      substage: options.substage,
      timeoutMs: options.timeoutMs,
      maxTokens: options.maxTokens,
      promptChars: options.promptChars,
      errorCode: options.errorCode,
      warningCode: options.errorCode,
      rootCause: options.rootCause ?? 'strategy_loop_exhausted',
      plannerSeed: options.plannerSeed,
      plannerDraft: options.plannerDraft,
      nextDayIndex: options.nextDayIndex,
      dayChunkIndex: options.dayChunkIndex,
      seedAttempt: options.seedAttempt,
      dayAttempt: options.dayAttempt,
      outlineAttempt: options.outlineAttempt,
      chunkAttempt: options.chunkAttempt,
      usedTextRecovery: options.usedTextRecovery,
      invalidFieldPath: options.invalidFieldPath,
      validationIssueCode: options.validationIssueCode,
      salvagedDayCount: options.salvagedDayCount,
      expectedDayCount: options.expectedDayCount,
      seedPromptVariant: options.seedPromptVariant,
      dayPromptVariant: options.dayPromptVariant,
      salvagedStopCount: options.salvagedStopCount,
      requiredMealRecovered: options.requiredMealRecovered,
      completedDayCount: options.completedDayCount,
      continuedToNextDayInSameStream: options.continuedToNextDayInSameStream,
      pauseAfterDayCompletion: options.pauseAfterDayCompletion,
      pauseAfterSeedCompletion: options.pauseAfterSeedCompletion,
      seedElapsedMs: options.seedElapsedMs,
      minimumDayStartBudgetMs: options.minimumDayStartBudgetMs,
      plannerStrategy: options.plannerStrategy,
      plannerContractVersion: options.plannerContractVersion,
      plannerDayOutline: options.plannerDayOutline,
      plannerDayChunks: options.plannerDayChunks,
      message: options.message,
      fallbackTriggered: true,
      fallbackReason: 'micro_strategy_exhausted',
      completionGateFailed: true,
    });
  }

  if (
    options.pauseReason === 'recovery_required'
    && options.errorCode === 'draft_generation_constrained_contract_mismatch'
    && options.plannerStrategy === 'constrained_completion'
    && harnessState.sameErrorRecurrenceCount >= MAX_SAME_STRATEGY_ERROR_RECURRENCES
  ) {
    return buildTerminalFailureResult(ctx, {
      start: options.start,
      substage: options.substage,
      timeoutMs: options.timeoutMs,
      maxTokens: options.maxTokens,
      promptChars: options.promptChars,
      errorCode: 'draft_generation_constrained_contract_mismatch',
      warningCode: 'draft_generation_constrained_contract_mismatch',
      rootCause: 'strategy_contract_mismatch',
      plannerSeed: options.plannerSeed,
      plannerDraft: options.plannerDraft,
      nextDayIndex: options.nextDayIndex,
      dayChunkIndex: options.dayChunkIndex,
      seedAttempt: options.seedAttempt,
      dayAttempt: options.dayAttempt,
      outlineAttempt: options.outlineAttempt,
      chunkAttempt: options.chunkAttempt,
      usedTextRecovery: options.usedTextRecovery,
      invalidFieldPath: options.invalidFieldPath,
      validationIssueCode: options.validationIssueCode,
      salvagedDayCount: options.salvagedDayCount,
      expectedDayCount: options.expectedDayCount,
      seedPromptVariant: options.seedPromptVariant,
      dayPromptVariant: options.dayPromptVariant,
      salvagedStopCount: options.salvagedStopCount,
      requiredMealRecovered: options.requiredMealRecovered,
      completedDayCount: options.completedDayCount,
      continuedToNextDayInSameStream: options.continuedToNextDayInSameStream,
      pauseAfterDayCompletion: options.pauseAfterDayCompletion,
      pauseAfterSeedCompletion: options.pauseAfterSeedCompletion,
      seedElapsedMs: options.seedElapsedMs,
      minimumDayStartBudgetMs: options.minimumDayStartBudgetMs,
      plannerStrategy: options.plannerStrategy,
      plannerContractVersion: options.plannerContractVersion,
      plannerDayOutline: options.plannerDayOutline,
      plannerDayChunks: options.plannerDayChunks,
      message: options.message,
      fallbackTriggered: true,
      fallbackReason: 'constrained_contract_recurrence_exhausted',
      completionGateFailed: true,
    });
  }

  return {
    outcome: 'partial',
    data: options.plannerDraft,
    checkpointCursor: options.checkpointCursor,
    warnings: options.warnings ?? [],
    durationMs: Date.now() - options.start,
    metadata: {
      substage: options.substage,
      selectedTimeoutMs: options.timeoutMs,
      maxTokens: options.maxTokens,
      promptChars: options.promptChars,
      plannerContractVersion: options.plannerContractVersion
        ?? resolvePlannerContractVersion(options.plannerStrategy ?? 'split_day_v5'),
      recoveryMode: options.substage.startsWith('seed_') ? 'draft_seed' : 'draft_day',
      usedTextRecovery: options.usedTextRecovery ?? false,
      pauseReason: options.pauseReason,
      errorCode: options.errorCode,
      rootCause: options.rootCause,
      invalidFieldPath: options.invalidFieldPath,
      validationIssueCode: options.validationIssueCode,
      message: options.message,
      nextDayIndex: options.nextDayIndex ?? undefined,
      dayChunkIndex: options.dayChunkIndex ?? undefined,
      seedAttempt: options.seedAttempt ?? undefined,
      dayAttempt: options.dayAttempt ?? undefined,
      outlineAttempt: options.outlineAttempt ?? undefined,
      chunkAttempt: options.chunkAttempt ?? undefined,
      salvagedDayCount: options.salvagedDayCount,
      expectedDayCount: options.expectedDayCount,
      seedPromptVariant: options.seedPromptVariant,
      dayPromptVariant: options.dayPromptVariant,
      salvagedStopCount: options.salvagedStopCount,
      requiredMealRecovered: options.requiredMealRecovered,
      completedDayCount: options.completedDayCount,
      completedStopCount: countCompletedStops(options.plannerDraft),
      duplicateStopCount: options.plannerDraft ? countDuplicateStops(options.plannerDraft) : undefined,
      underfilledDayCount: options.plannerDraft
        ? countUnderfilledDays(ctx.session.normalizedInput!, options.plannerDraft)
        : undefined,
      continuedToNextDayInSameStream: options.continuedToNextDayInSameStream,
      pauseAfterDayCompletion: options.pauseAfterDayCompletion,
      pauseAfterSeedCompletion: options.pauseAfterSeedCompletion,
      seedElapsedMs: options.seedElapsedMs,
      minimumDayStartBudgetMs: options.minimumDayStartBudgetMs,
      plannerStrategy: options.plannerStrategy,
      pathType: resolvePlannerPathType(options.plannerStrategy ?? 'split_day_v5'),
      fallbackTriggered: options.fallbackTriggered ?? false,
      fallbackReason: options.fallbackReason,
      currentStrategy: effectiveHarnessState.currentStrategy,
      strategyEscalationCount: effectiveHarnessState.strategyEscalationCount,
      recoveryCount: effectiveHarnessState.recoveryCount,
      pauseCount: effectiveHarnessState.pauseCount,
      sameErrorRecurrenceCount: effectiveHarnessState.sameErrorRecurrenceCount,
      finalDraftStrategySummary: options.finalDraftStrategySummary,
      resumeSourceRunId: ctx.session.pipelineContext?.resumedFromRunId,
      resumeStrategy: ctx.session.pipelineContext?.resumeStrategy,
      reusedArtifactKinds: ctx.session.pipelineContext?.reusedArtifactKinds,
      pipelineContextPatch: {
        resumePassId: 'draft_generate',
        resumeSubstage: options.resumeSubstage,
        pauseReason: options.pauseReason,
        nextDayIndex: options.nextDayIndex ?? null,
        dayChunkIndex: options.dayChunkIndex ?? null,
        seedAttempt: options.seedAttempt ?? null,
        dayAttempt: options.dayAttempt ?? null,
        outlineAttempt: options.outlineAttempt ?? null,
        chunkAttempt: options.chunkAttempt ?? null,
        plannerRequestAttempt: options.plannerAttempt,
        draftGenerateStrategyDay: effectiveHarnessState.strategyDay,
        draftGenerateCurrentStrategy: effectiveHarnessState.currentStrategy,
        draftGenerateStrategyEscalationCount: effectiveHarnessState.strategyEscalationCount,
        draftGenerateRecoveryCount: effectiveHarnessState.recoveryCount,
        draftGeneratePauseCount: effectiveHarnessState.pauseCount,
        draftGenerateSameErrorFingerprint: effectiveHarnessState.sameErrorFingerprint,
        draftGenerateSameErrorRecurrenceCount: effectiveHarnessState.sameErrorRecurrenceCount,
        currentDayExecution: options.resetHarnessState
          ? null
          : buildCurrentDayExecution(effectiveHarnessState, {
            plannerAttempt: options.plannerAttempt,
            plannerStrategy: options.plannerStrategy,
            resumeSubstage: options.resumeSubstage,
            nextDayIndex: options.nextDayIndex,
            dayChunkIndex: options.dayChunkIndex,
            seedAttempt: options.seedAttempt,
            dayAttempt: options.dayAttempt,
            outlineAttempt: options.outlineAttempt,
            chunkAttempt: options.chunkAttempt,
            dayType: typeof options.nextDayIndex === 'number' && ctx.session.normalizedInput
              ? resolveDraftDayType(ctx.session.normalizedInput, options.nextDayIndex)
              : null,
            requiredMissingRoles: buildRequiredMissingRoles({
              errorCode: options.errorCode,
              validationIssueCode: options.validationIssueCode,
            }),
            outlineArtifact: options.plannerDayOutline ?? null,
            chunkArtifacts: options.plannerDayChunks ?? null,
          }),
        finalDraftStrategySummary: options.finalDraftStrategySummary,
        plannerRawText: null,
      },
      sessionPatch: {
        plannerSeed: options.plannerSeed,
        plannerDayOutline: options.plannerDayOutline ?? null,
        plannerDayChunks: options.plannerDayChunks ?? null,
      },
    },
  };
}

function buildTerminalFailureResult(
  ctx: PassContext,
  options: {
    start: number;
    substage: DraftGenerateResumeSubstage;
    timeoutMs: number;
    maxTokens: number;
    promptChars: number;
    errorCode: string;
    warningCode: string;
    rootCause: string;
    plannerSeed?: PlannerSeed | null;
    plannerDraft?: PlannerDraft;
    nextDayIndex?: number | null;
    dayChunkIndex?: number | null;
    seedAttempt?: number | null;
    dayAttempt?: number | null;
    outlineAttempt?: number | null;
    chunkAttempt?: number | null;
    usedTextRecovery?: boolean;
    invalidFieldPath?: string;
    validationIssueCode?: string;
    salvagedDayCount?: number;
    expectedDayCount?: number;
    seedPromptVariant?: SeedPromptVariant;
    dayPromptVariant?: SeedPromptVariant;
    salvagedStopCount?: number;
    requiredMealRecovered?: boolean;
    completedDayCount?: number;
    continuedToNextDayInSameStream?: boolean;
    pauseAfterDayCompletion?: boolean;
    pauseAfterSeedCompletion?: boolean;
    seedElapsedMs?: number;
    minimumDayStartBudgetMs?: number;
    plannerStrategy?: PlannerStrategy;
    plannerContractVersion?: string;
    plannerDayOutline?: PlannerDayOutline | null;
    plannerDayChunks?: PlannerDayChunkStop[] | null;
    message?: string;
    fallbackTriggered?: boolean;
    fallbackReason?: string;
    completionGateFailed?: boolean;
  },
): PassResult<PlannerDraft> {
  const harnessState = resolveNextDraftGenerateHarnessState(ctx, {
    plannerStrategy: options.plannerStrategy,
    substage: options.substage,
    nextDayIndex: options.nextDayIndex,
    dayChunkIndex: options.dayChunkIndex,
    errorCode: options.errorCode,
    invalidFieldPath: options.invalidFieldPath,
  });
  const preservedPlannerSeed = options.plannerSeed ?? ctx.session.plannerSeed ?? null;
  const preservedPlannerDayOutline = options.plannerDayOutline ?? ctx.session.plannerDayOutline ?? null;
  const preservedPlannerDayChunks = options.plannerDayChunks ?? ctx.session.plannerDayChunks ?? null;
  const resumeSubstage: DraftGenerateResumeSubstage =
    options.substage === 'seed_request' || options.substage === 'seed_parse'
      ? 'seed_request'
      : options.plannerStrategy === 'micro_day_split'
        ? (
          options.substage === 'day_chunk_request' || options.substage === 'day_chunk_parse'
            ? 'day_chunk_request'
            : 'day_outline_request'
        )
        : 'day_request';

  return {
    outcome: 'failed_terminal',
    data: options.plannerDraft,
    warnings: [options.warningCode],
    durationMs: Date.now() - options.start,
    metadata: {
      substage: options.substage,
      selectedTimeoutMs: options.timeoutMs,
      maxTokens: options.maxTokens,
      promptChars: options.promptChars,
      plannerContractVersion: options.plannerContractVersion
        ?? resolvePlannerContractVersion(options.plannerStrategy ?? 'split_day_v5'),
      recoveryMode: options.substage.startsWith('seed_') ? 'draft_seed' : 'draft_day',
      usedTextRecovery: options.usedTextRecovery ?? false,
      errorCode: options.errorCode,
      rootCause: options.rootCause,
      nextDayIndex: options.nextDayIndex ?? undefined,
      dayChunkIndex: options.dayChunkIndex ?? undefined,
      seedAttempt: options.seedAttempt ?? undefined,
      dayAttempt: options.dayAttempt ?? undefined,
      outlineAttempt: options.outlineAttempt ?? undefined,
      chunkAttempt: options.chunkAttempt ?? undefined,
      invalidFieldPath: options.invalidFieldPath,
      validationIssueCode: options.validationIssueCode,
      salvagedDayCount: options.salvagedDayCount,
      expectedDayCount: options.expectedDayCount,
      seedPromptVariant: options.seedPromptVariant,
      dayPromptVariant: options.dayPromptVariant,
      salvagedStopCount: options.salvagedStopCount,
      requiredMealRecovered: options.requiredMealRecovered,
      completedDayCount: options.completedDayCount,
      completedStopCount: countCompletedStops(options.plannerDraft),
      duplicateStopCount: options.plannerDraft ? countDuplicateStops(options.plannerDraft) : undefined,
      underfilledDayCount: options.plannerDraft
        ? countUnderfilledDays(ctx.session.normalizedInput!, options.plannerDraft)
        : undefined,
      continuedToNextDayInSameStream: options.continuedToNextDayInSameStream,
      pauseAfterDayCompletion: options.pauseAfterDayCompletion,
      pauseAfterSeedCompletion: options.pauseAfterSeedCompletion,
      seedElapsedMs: options.seedElapsedMs,
      minimumDayStartBudgetMs: options.minimumDayStartBudgetMs,
      plannerStrategy: options.plannerStrategy,
      pathType: resolvePlannerPathType(options.plannerStrategy ?? 'split_day_v5'),
      fallbackTriggered: options.fallbackTriggered ?? false,
      fallbackReason: options.fallbackReason,
      currentStrategy: harnessState.currentStrategy,
      strategyEscalationCount: harnessState.strategyEscalationCount,
      recoveryCount: harnessState.recoveryCount,
      pauseCount: harnessState.pauseCount,
      sameErrorRecurrenceCount: harnessState.sameErrorRecurrenceCount,
      completionGateFailed: options.completionGateFailed ?? false,
      originalError: options.message,
      resumeSourceRunId: ctx.session.pipelineContext?.resumedFromRunId,
      resumeStrategy: ctx.session.pipelineContext?.resumeStrategy,
      reusedArtifactKinds: ctx.session.pipelineContext?.reusedArtifactKinds,
      pipelineContextPatch: {
        resumePassId: 'draft_generate',
        resumeSubstage,
        pauseReason: 'recovery_required',
        nextDayIndex: options.nextDayIndex ?? null,
        dayChunkIndex: options.dayChunkIndex ?? null,
        seedAttempt: options.seedAttempt ?? null,
        dayAttempt: options.dayAttempt ?? null,
        outlineAttempt: options.outlineAttempt ?? null,
        chunkAttempt: options.chunkAttempt ?? null,
        plannerRequestAttempt: options.dayAttempt ?? options.outlineAttempt ?? options.chunkAttempt ?? null,
        draftGenerateStrategyDay: harnessState.strategyDay,
        draftGenerateCurrentStrategy: harnessState.currentStrategy,
        draftGenerateStrategyEscalationCount: harnessState.strategyEscalationCount,
        draftGenerateRecoveryCount: harnessState.recoveryCount,
        draftGeneratePauseCount: harnessState.pauseCount,
        draftGenerateSameErrorFingerprint: harnessState.sameErrorFingerprint,
        draftGenerateSameErrorRecurrenceCount: harnessState.sameErrorRecurrenceCount,
        currentDayExecution: buildCurrentDayExecution(harnessState, {
          plannerAttempt: options.dayAttempt ?? options.outlineAttempt ?? options.chunkAttempt ?? 1,
          plannerStrategy: options.plannerStrategy,
          resumeSubstage,
          nextDayIndex: options.nextDayIndex,
          dayChunkIndex: options.dayChunkIndex,
          seedAttempt: options.seedAttempt,
          dayAttempt: options.dayAttempt,
          outlineAttempt: options.outlineAttempt,
          chunkAttempt: options.chunkAttempt,
          dayType: typeof options.nextDayIndex === 'number' && ctx.session.normalizedInput
            ? resolveDraftDayType(ctx.session.normalizedInput, options.nextDayIndex)
            : null,
          requiredMissingRoles: buildRequiredMissingRoles({
            errorCode: options.errorCode,
            validationIssueCode: options.validationIssueCode,
          }),
          outlineArtifact: preservedPlannerDayOutline,
          chunkArtifacts: preservedPlannerDayChunks,
        }),
        finalDraftStrategySummary: buildFinalDraftStrategySummary(harnessState),
        plannerRawText: null,
      },
      sessionPatch: {
        plannerSeed: preservedPlannerSeed,
        plannerDayOutline: preservedPlannerDayOutline,
        plannerDayChunks: preservedPlannerDayChunks,
      },
    },
  };
}

interface DraftGenerateErrorClassification {
  warningCode: string;
  errorCode: string;
  rootCause: string;
  invalidFieldPath?: string;
  validationIssueCode?: string;
  message: string;
}

function formatValidationIssuePath(path: readonly (string | number)[]): string | undefined {
  if (path.length === 0) {
    return undefined;
  }

  return path.map((segment) => String(segment)).join('.');
}

function detectContractShape(rawText: string | undefined): 'stops' | 'slots' | 'unknown' {
  if (!rawText) {
    return 'unknown';
  }

  const hasStops = /"stops"\s*:/i.test(rawText);
  const hasSlots = /"slots"\s*:/i.test(rawText);
  if (hasStops && !hasSlots) {
    return 'stops';
  }
  if (hasSlots && !hasStops) {
    return 'slots';
  }
  return 'unknown';
}

function specializeDraftGenerateClassification(
  classification: DraftGenerateErrorClassification,
  context: DraftGenerateClassificationContext,
): DraftGenerateErrorClassification {
  const normalizedMessage = classification.message.toLowerCase();
  const normalizedPath = classification.invalidFieldPath?.toLowerCase() ?? '';
  const contractShape = detectContractShape(context.rawText);

  if (
    context.plannerStrategy === 'constrained_completion'
    && (context.substage === 'day_request' || context.substage === 'day_parse')
    && (
      contractShape === 'slots'
      || normalizedPath.startsWith('slots')
      || normalizedPath.startsWith('stops.')
      || /(^|[^a-z])slots([^a-z]|$)/i.test(normalizedMessage)
      || (normalizedPath.startsWith('stops.') && /(invalid_type|required)/i.test(normalizedMessage))
    )
  ) {
    return {
      ...classification,
      warningCode: 'draft_generation_constrained_contract_mismatch',
      errorCode: 'draft_generation_constrained_contract_mismatch',
      rootCause: 'strategy_contract_mismatch',
    };
  }

  if (
    context.plannerStrategy === 'micro_day_split'
    && (context.substage === 'day_outline_request' || context.substage === 'day_outline_parse')
    && (
      contractShape === 'stops'
      || contractShape === 'slots'
      || normalizedPath.startsWith('slots')
      || normalizedPath.startsWith('stops')
      || /(^|[^a-z])stops([^a-z]|$)/i.test(normalizedMessage)
      || /(^|[^a-z])slots([^a-z]|$)/i.test(normalizedMessage)
    )
  ) {
    return {
      ...classification,
      warningCode: 'draft_generation_outline_contract_mismatch',
      errorCode: 'draft_generation_outline_contract_mismatch',
      rootCause: 'strategy_contract_mismatch',
    };
  }

  if (
    context.plannerStrategy === 'split_day_v5'
    && (context.substage === 'day_request' || context.substage === 'day_parse')
    && (
      contractShape === 'slots'
      || normalizedPath.startsWith('slots')
      || normalizedPath.startsWith('stops.')
      || /(^|[^a-z])slots([^a-z]|$)/i.test(normalizedMessage)
      || (normalizedPath.startsWith('stops.') && /(invalid_type|required)/i.test(normalizedMessage))
    )
  ) {
    return {
      ...classification,
      warningCode: 'draft_generation_contract_mismatch',
      errorCode: 'draft_generation_contract_mismatch',
      rootCause: 'strategy_contract_mismatch',
    };
  }

  return classification;
}

function classifyDraftGenerateError(
  error: unknown,
  context: DraftGenerateClassificationContext = {},
): DraftGenerateErrorClassification {
  const message = error instanceof Error ? error.message : String(error);

  if (/missing_meal/i.test(message)) {
    return {
      warningCode: 'draft_generation_missing_meal',
      errorCode: 'draft_generation_missing_meal',
      rootCause: 'invalid_structured_output',
      message,
    };
  }

  if (/insufficient_stops/i.test(message)) {
    return {
      warningCode: 'draft_generation_insufficient_stops',
      errorCode: 'draft_generation_insufficient_stops',
      rootCause: 'invalid_structured_output',
      message,
    };
  }

  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return specializeDraftGenerateClassification({
      warningCode: 'draft_generation_invalid_output',
      errorCode: 'draft_generation_invalid_output',
      rootCause: 'invalid_structured_output',
      invalidFieldPath: issue ? formatValidationIssuePath(issue.path) : undefined,
      validationIssueCode: issue?.code,
      message,
    }, context);
  }

  if (error instanceof TextJsonParseError) {
    const cause = error.cause;
    if (cause instanceof ZodError) {
      const issue = cause.issues[0];
      return specializeDraftGenerateClassification({
        warningCode: 'draft_generation_invalid_output',
        errorCode: 'draft_generation_invalid_output',
        rootCause: 'invalid_structured_output',
        invalidFieldPath: issue ? formatValidationIssuePath(issue.path) : undefined,
        validationIssueCode: issue?.code,
        message,
      }, context);
    }

    if (/abort|timeout|timed out/i.test(message)) {
      return {
        warningCode: 'draft_generation_timeout',
        errorCode: 'draft_generation_timeout',
        rootCause: 'timeout',
        message,
      };
    }

    return specializeDraftGenerateClassification({
      warningCode: 'draft_generation_invalid_output',
      errorCode: 'draft_generation_invalid_output',
      rootCause: 'invalid_structured_output',
      message,
    }, context);
  }

  if (/abort|timeout|timed out/i.test(message)) {
    return {
      warningCode: 'draft_generation_timeout',
      errorCode: 'draft_generation_timeout',
      rootCause: 'timeout',
      message,
    };
  }

  if (/schema|validation|json|parse|object|day_count|missing_meal|insufficient_stops|day_mismatch|required|invalid_type/i.test(message)) {
    return specializeDraftGenerateClassification({
      warningCode: 'draft_generation_invalid_output',
      errorCode: 'draft_generation_invalid_output',
      rootCause: 'invalid_structured_output',
      message,
    }, context);
  }

  return {
    warningCode: 'draft_generation_provider_error',
    errorCode: 'draft_generation_provider_error',
    rootCause: 'llm_error',
    message,
  };
}

async function resolveLanguageModel(provider: string, modelName: string) {
  if (provider === 'openai') {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(modelName);
  }

  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return google(modelName);
}

function validateSeed(
  seed: PlannerSeed,
  expectedDayCount: number,
): string | null {
  if (seed.days.length !== expectedDayCount) {
    return 'day_count_mismatch';
  }

  const expectedDays = new Set<number>();
  for (let day = 1; day <= expectedDayCount; day += 1) {
    expectedDays.add(day);
  }

  for (const day of seed.days) {
    if (!expectedDays.has(day.day)) {
      return 'day_number_mismatch';
    }
    expectedDays.delete(day.day);
  }

  return expectedDays.size === 0 ? null : 'day_number_mismatch';
}

function normalizeSeedDayNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return parsed > 0 ? parsed : null;
  }
  return null;
}

function normalizeSeedField(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface SalvagedPlannerSeedResult {
  seed: PlannerSeed;
  salvagedDayCount: number;
  expectedDayCount: number;
  usedTextRecovery: boolean;
}

function salvagePlannerSeedFromExtractedJson(
  extractedJson: string,
  expectedDayCount: number,
  usedTextRecovery: boolean,
): SalvagedPlannerSeedResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractedJson);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const daysValue = (parsed as Record<string, unknown>).days;
  if (!Array.isArray(daysValue)) {
    return {
      seed: { days: [] },
      salvagedDayCount: 0,
      expectedDayCount,
      usedTextRecovery,
    };
  }

  const days: PlannerSeed['days'] = [];
  let expectedDayNumber = 1;

  for (const entry of daysValue) {
    if (!entry || typeof entry !== 'object') {
      break;
    }

    const record = entry as Record<string, unknown>;
    const day = normalizeSeedDayNumber(record.day);
    const mainArea = normalizeSeedField(record.mainArea);
    const overnightLocation = normalizeSeedField(record.overnightLocation);

    if (
      day !== expectedDayNumber
      || mainArea === null
      || overnightLocation === null
    ) {
      break;
    }

    days.push({
      day,
      mainArea,
      overnightLocation,
    });
    expectedDayNumber += 1;
  }

  return {
    seed: { days },
    salvagedDayCount: days.length,
    expectedDayCount,
    usedTextRecovery,
  };
}

function trySalvageSeedFromError(
  error: unknown,
  expectedDayCount: number,
): SalvagedPlannerSeedResult | null {
  if (!(error instanceof TextJsonParseError) || !error.extractedJson) {
    return null;
  }

  return salvagePlannerSeedFromExtractedJson(
    error.extractedJson,
    expectedDayCount,
    error.salvageApplied || error.extractedJson !== null,
  );
}

const VALID_DAY_STOP_ROLES = ['must_visit', 'recommended', 'meal', 'accommodation', 'filler'] as const;
const VALID_DAY_TIME_SLOTS = ['morning', 'midday', 'afternoon', 'evening', 'night', 'flexible'] as const;

function normalizeDayStopRole(
  value: unknown,
): PlannerDayStopsLlmOutput['stops'][number]['role'] | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if ((VALID_DAY_STOP_ROLES as readonly string[]).includes(normalized)) {
    return normalized as PlannerDayStopsLlmOutput['stops'][number]['role'];
  }
  if (/(meal|lunch|dinner|breakfast|brunch|cafe|restaurant)/i.test(normalized)) {
    return 'meal';
  }
  if (/(hotel|stay|accommodation|lodging)/i.test(normalized)) {
    return 'accommodation';
  }
  if (/(must|anchor|priority)/i.test(normalized)) {
    return 'must_visit';
  }
  if (/(filler|rest|break)/i.test(normalized)) {
    return 'filler';
  }
  if (/(recommended|regular|visit|sightseeing)/i.test(normalized)) {
    return 'recommended';
  }
  return null;
}

function normalizeDayTimeSlot(
  value: unknown,
): PlannerDayStopsLlmOutput['stops'][number]['timeSlotHint'] | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if ((VALID_DAY_TIME_SLOTS as readonly string[]).includes(normalized)) {
    return normalized as PlannerDayStopsLlmOutput['stops'][number]['timeSlotHint'];
  }
  if (/(morning|朝)/i.test(normalized)) {
    return 'morning';
  }
  if (/(midday|noon|昼|lunch)/i.test(normalized)) {
    return 'midday';
  }
  if (/(afternoon|午後)/i.test(normalized)) {
    return 'afternoon';
  }
  if (/(evening|夕方|夕食)/i.test(normalized)) {
    return 'evening';
  }
  if (/(night|夜)/i.test(normalized)) {
    return 'night';
  }
  if (/(flex|anytime|free)/i.test(normalized)) {
    return 'flexible';
  }
  return null;
}

interface SalvagedPlannerDayResult {
  day: PlannerDayStopsLlmOutput;
  salvagedStopCount: number;
  requiredMealRecovered: boolean;
  usedTextRecovery: boolean;
}

interface SalvagedPlannerOutlineResult {
  outline: PlannerDayOutline;
  salvagedSlotCount: number;
  requiredMealRecovered: boolean;
  usedTextRecovery: boolean;
}

interface SalvagedPlannerChunkResult {
  day: number;
  stops: PlannerDayChunkStop[];
  usedTextRecovery: boolean;
}

function salvagePlannerDayFromExtractedJson(
  extractedJson: string,
  seedDay: PlannerSeedDay,
  usedTextRecovery: boolean,
): SalvagedPlannerDayResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractedJson);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const day = normalizeSeedDayNumber(record.day);
  if (day !== seedDay.day) {
    return null;
  }

  const stopsValue = record.stops;
  if (!Array.isArray(stopsValue)) {
      return {
        day: {
        day: seedDay.day,
        stops: [],
      },
      salvagedStopCount: 0,
      requiredMealRecovered: false,
      usedTextRecovery,
    };
  }

  const stops: PlannerDayStopsLlmOutput['stops'] = [];
  let requiredMealRecovered = false;

  for (const entry of stopsValue) {
    if (!entry || typeof entry !== 'object') {
      break;
    }

    const stopRecord = entry as Record<string, unknown>;
    const name = normalizeSeedField(stopRecord.name);
    const role = normalizeDayStopRole(stopRecord.role);
    const timeSlotHint = normalizeDayTimeSlot(stopRecord.timeSlotHint);
    const areaHint = normalizeSeedField(stopRecord.areaHint) || seedDay.mainArea;

    if (!name || !role || !timeSlotHint) {
      break;
    }

    if (role === 'meal') {
      requiredMealRecovered = true;
    }

    stops.push({
      name,
      role,
      timeSlotHint,
      areaHint,
    });
  }

  return {
    day: {
      day: seedDay.day,
      stops,
    },
    salvagedStopCount: stops.length,
    requiredMealRecovered,
    usedTextRecovery,
  };
}

function trySalvageDayFromError(
  error: unknown,
  seedDay: PlannerSeedDay,
): SalvagedPlannerDayResult | null {
  if (!(error instanceof TextJsonParseError) || !error.extractedJson) {
    return null;
  }

  return salvagePlannerDayFromExtractedJson(
    error.extractedJson,
    seedDay,
    error.salvageApplied || error.extractedJson !== null,
  );
}

function salvagePlannerOutlineFromExtractedJson(
  extractedJson: string,
  seedDay: PlannerSeedDay,
  usedTextRecovery: boolean,
): SalvagedPlannerOutlineResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractedJson);
  } catch {
    return salvagePlannerOutlineFromPartialJsonText(extractedJson, seedDay, usedTextRecovery);
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const day = normalizeSeedDayNumber(record.day);
  if (day !== seedDay.day) {
    return null;
  }

  // Fallback: model may emit "stops" (wrong field name) instead of "slots"
  const rawArray: unknown[] | null = Array.isArray(record.slots)
    ? (record.slots as unknown[])
    : Array.isArray(record.stops)
      ? (record.stops as unknown[])
      : null;

  if (!rawArray) {
    return {
      outline: { day: seedDay.day, slots: [] },
      salvagedSlotCount: 0,
      requiredMealRecovered: false,
      usedTextRecovery,
    };
  }

  const slots: PlannerDayOutlineSlot[] = [];
  let requiredMealRecovered = false;
  let expectedSlotIndex = 1;
  for (const entry of rawArray) {
    if (!entry || typeof entry !== 'object') {
      break;
    }
    const slotRecord = entry as Record<string, unknown>;
    // Auto-assign slotIndex when falling back from stops format (stops have no slotIndex)
    const slotIndex = normalizeSeedDayNumber(slotRecord.slotIndex) ?? expectedSlotIndex;
    const role = normalizeDayStopRole(slotRecord.role);
    const timeSlotHint = normalizeDayTimeSlot(slotRecord.timeSlotHint);
    const areaHint = normalizeSeedField(slotRecord.areaHint) ?? undefined;
    if (slotIndex !== expectedSlotIndex || !role || !timeSlotHint) {
      break;
    }
    if (role === 'meal') {
      requiredMealRecovered = true;
    }
    slots.push({ slotIndex, role, timeSlotHint, areaHint });
    expectedSlotIndex += 1;
  }

  return {
    outline: {
      day: seedDay.day,
      slots,
    },
    salvagedSlotCount: slots.length,
    requiredMealRecovered,
    usedTextRecovery,
  };
}

function salvagePlannerOutlineFromPartialJsonText(
  extractedJson: string,
  seedDay: PlannerSeedDay,
  usedTextRecovery: boolean,
): SalvagedPlannerOutlineResult | null {
  const dayMatch = extractedJson.match(/"day"\s*:\s*(\d+)/);
  const day = dayMatch ? Number.parseInt(dayMatch[1] ?? '', 10) : null;
  if (day !== seedDay.day) {
    return null;
  }

  const slots: PlannerDayOutlineSlot[] = [];
  let requiredMealRecovered = false;
  let expectedSlotIndex = 1;
  const arrayKey = /"slots"\s*:/.test(extractedJson)
    ? 'slots'
    : /"stops"\s*:/.test(extractedJson)
      ? 'stops'
      : null;
  if (!arrayKey) {
    return {
      outline: {
        day: seedDay.day,
        slots,
      },
      salvagedSlotCount: 0,
      requiredMealRecovered,
      usedTextRecovery,
    };
  }

  const arrayStart = extractedJson.search(new RegExp(`"${arrayKey}"\\s*:\\s*\\[`));
  if (arrayStart < 0) {
    return {
      outline: {
        day: seedDay.day,
        slots,
      },
      salvagedSlotCount: 0,
      requiredMealRecovered,
      usedTextRecovery,
    };
  }

  const fragments: string[] = [];
  let fragmentStart = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart; index < extractedJson.length; index += 1) {
    const char = extractedJson[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) {
        fragmentStart = index;
      }
      depth += 1;
      continue;
    }
    if (char === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && fragmentStart >= 0) {
          fragments.push(extractedJson.slice(fragmentStart, index + 1));
          fragmentStart = -1;
        }
      }
      continue;
    }
    if (char === ']' && depth === 0) {
      break;
    }
  }

  if (fragmentStart >= 0) {
    fragments.push(extractedJson.slice(fragmentStart));
  }

  for (const fragment of fragments) {
    const slotIndexMatch = fragment.match(/"slotIndex"\s*:\s*(\d+)/);
    const roleMatch = fragment.match(/"role"\s*:\s*"([^"]+)"/);
    const timeSlotHintMatch = fragment.match(/"timeSlotHint"\s*:\s*"([^"]+)"/);
    const areaHintMatch = fragment.match(/"areaHint"\s*:\s*"([^"]*)"/);

    const slotIndex = slotIndexMatch
      ? normalizeSeedDayNumber(slotIndexMatch[1] ?? null)
      : expectedSlotIndex;
    const role = normalizeDayStopRole(roleMatch?.[1] ?? null);
    const timeSlotHint = normalizeDayTimeSlot(timeSlotHintMatch?.[1] ?? null);
    const areaHint = normalizeSeedField(areaHintMatch?.[1] ?? null) ?? undefined;

    if (slotIndex !== expectedSlotIndex || !role || !timeSlotHint) {
      break;
    }

    if (role === 'meal') {
      requiredMealRecovered = true;
    }

    slots.push({ slotIndex, role, timeSlotHint, areaHint });
    expectedSlotIndex += 1;
  }

  return {
    outline: {
      day: seedDay.day,
      slots,
    },
    salvagedSlotCount: slots.length,
    requiredMealRecovered,
    usedTextRecovery,
  };
}

function trySalvageOutlineFromError(
  error: unknown,
  seedDay: PlannerSeedDay,
): SalvagedPlannerOutlineResult | null {
  if (!(error instanceof TextJsonParseError) || !error.extractedJson) {
    return null;
  }
  return salvagePlannerOutlineFromExtractedJson(
    error.extractedJson,
    seedDay,
    error.salvageApplied || error.extractedJson !== null,
  );
}

function salvagePlannerOutlinePrefixFromOutline(
  outline: PlannerDayOutline,
  seedDay: PlannerSeedDay,
  usedTextRecovery: boolean,
): SalvagedPlannerOutlineResult | null {
  if (outline.day !== seedDay.day) {
    return null;
  }

  const slots: PlannerDayOutlineSlot[] = [];
  let requiredMealRecovered = false;
  let expectedSlotIndex = 1;

  for (const slot of outline.slots) {
    if (slot.slotIndex !== expectedSlotIndex) {
      break;
    }
    if (slot.role === 'meal') {
      requiredMealRecovered = true;
    }
    slots.push(slot);
    expectedSlotIndex += 1;
  }

  return {
    outline: {
      day: seedDay.day,
      slots,
    },
    salvagedSlotCount: slots.length,
    requiredMealRecovered,
    usedTextRecovery,
  };
}

function salvagePlannerChunkFromExtractedJson(
  extractedJson: string,
  seedDay: PlannerSeedDay,
  chunkSlots: PlannerDayOutlineSlot[],
  usedTextRecovery: boolean,
): SalvagedPlannerChunkResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractedJson);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const day = normalizeSeedDayNumber(record.day);
  if (day !== seedDay.day) {
    return null;
  }

  const stopsValue = record.stops;
  if (!Array.isArray(stopsValue)) {
    return { day: seedDay.day, stops: [], usedTextRecovery };
  }

  const expectedSlotIndexes = new Set(chunkSlots.map((slot) => slot.slotIndex));
  const stops: PlannerDayChunkStop[] = [];
  for (const entry of stopsValue) {
    if (!entry || typeof entry !== 'object') {
      break;
    }
    const stopRecord = entry as Record<string, unknown>;
    const slotIndex = normalizeSeedDayNumber(stopRecord.slotIndex);
    const name = normalizeSeedField(stopRecord.name);
    const role = normalizeDayStopRole(stopRecord.role);
    const timeSlotHint = normalizeDayTimeSlot(stopRecord.timeSlotHint);
    const areaHint = normalizeSeedField(stopRecord.areaHint) || seedDay.mainArea;
    if (!slotIndex || !expectedSlotIndexes.has(slotIndex) || !name || !role || !timeSlotHint) {
      break;
    }
    stops.push({
      slotIndex,
      name,
      searchQuery: name,
      role,
      timeSlotHint,
      areaHint,
    });
  }

  return { day: seedDay.day, stops, usedTextRecovery };
}

function trySalvageChunkFromError(
  error: unknown,
  seedDay: PlannerSeedDay,
  chunkSlots: PlannerDayOutlineSlot[],
): SalvagedPlannerChunkResult | null {
  if (!(error instanceof TextJsonParseError) || !error.extractedJson) {
    return null;
  }
  return salvagePlannerChunkFromExtractedJson(
    error.extractedJson,
    seedDay,
    chunkSlots,
    error.salvageApplied || error.extractedJson !== null,
  );
}

function validateOutline(
  outline: PlannerDayOutline,
  targetDay: PlannerSeedDay,
  normalized: NormalizedRequest,
): string | null {
  if (outline.day !== targetDay.day) {
    return 'day_mismatch';
  }
  if (outline.slots.length === 0) {
    return 'missing_slots';
  }
  if (outline.slots.length < resolveHardMinimumStopCount(normalized, targetDay.day)) {
    return 'insufficient_slots';
  }
  for (let index = 0; index < outline.slots.length; index += 1) {
    if (outline.slots[index]?.slotIndex !== index + 1) {
      return 'slot_index_mismatch';
    }
  }
  return null;
}

function validateChunkStops(
  stops: PlannerDayChunkStop[],
  chunkSlots: PlannerDayOutlineSlot[],
  completedDraft: PlannerDraft,
): string | null {
  if (stops.length === 0) {
    return 'missing_stops';
  }

  const allowedSlots = new Set(chunkSlots.map((slot) => slot.slotIndex));
  const usedIdentities = buildUsedStopIdentitySet(completedDraft.days);
  const seenInChunk: StopIdentityLike[] = [];
  for (const stop of stops) {
    if (!allowedSlots.has(stop.slotIndex)) {
      return 'slot_index_mismatch';
    }
    if (buildStopIdentityTokens(stop).some((token) => usedIdentities.has(token))) {
      return 'duplicate_stop';
    }
    if (seenInChunk.some((existing) => hasOverlappingStopIdentity(existing, stop))) {
      return 'duplicate_stop';
    }
    seenInChunk.push(stop);
  }

  return null;
}

function validatePlannerDay(
  day: PlannerDraftDay,
  normalized: NormalizedRequest,
  completedDraft: PlannerDraft,
): string | null {
  if (countCoreActivityStops(day.stops) < resolveHardMinimumStopCount(normalized, day.day)) {
    return 'insufficient_stops';
  }

  const usedIdentities = buildUsedStopIdentitySet(
    completedDraft.days.filter((existingDay) => existingDay.day !== day.day),
  );
  const seenInDay: StopIdentityLike[] = [];

  for (const stop of day.stops) {
    if (buildStopIdentityTokens(stop).some((token) => usedIdentities.has(token))) {
      return 'duplicate_stop';
    }
    if (seenInDay.some((existing) => hasOverlappingStopIdentity(existing, stop))) {
      return 'duplicate_stop';
    }
    seenInDay.push(stop);
  }

  const coverageIssue = validateDayCoverage(day, normalized);
  if (coverageIssue) {
    return coverageIssue;
  }

  return null;
}

function validateDayStops(
  parsedDay: PlannerDayStopsLlmOutput,
  expectedDay: PlannerSeedDay,
  normalized: NormalizedRequest,
  completedDraft: PlannerDraft,
): string | null {
  if (parsedDay.day !== expectedDay.day) {
    return 'day_mismatch';
  }
  if (parsedDay.stops.length === 0) {
    return 'missing_stops';
  }
  if (!parsedDay.stops.some((stop) => stop.role === 'meal')) {
    return 'missing_meal';
  }

  return validatePlannerDay(dayOutputToPlannerDay(parsedDay, expectedDay), normalized, completedDraft);
}

export async function draftGeneratePass(ctx: PassContext): Promise<PassResult<PlannerDraft>> {
  const start = Date.now();
  const normalized = ctx.session.normalizedInput;
  if (!normalized) {
    return {
      outcome: 'failed_terminal',
      warnings: ['No normalizedInput in session'],
      durationMs: Date.now() - start,
    };
  }

  const runtimeProfile = ctx.session.pipelineContext?.runtimeProfile;
  const overallTimeoutMs = calculateCanonicalDraftTimeoutMs(ctx);
  const plannerProvider = ctx.session.generationProfile?.plannerProvider
    ?? ctx.session.generationProfile?.provider
    ?? 'gemini';
  const plannerModelName = ctx.session.generationProfile?.plannerModelName
    ?? ctx.session.generationProfile?.modelName
    ?? 'gemini-2.5-flash';
  const temperature = ctx.session.generationProfile?.temperature ?? 0.5;
  const currentDayExecution = resolveCurrentDayExecutionFromPipelineContext(ctx.session.pipelineContext);
  const resumeSubstage = currentDayExecution?.substage
    ?? (
      ctx.session.pipelineContext?.resumePassId === 'draft_generate'
        ? resolveSubstage(ctx.session.pipelineContext?.resumeSubstage)
        : null
    );
  let activeResumeSubstage = resumeSubstage;
  let plannerSeed = ctx.session.plannerSeed ?? null;
  let plannerDayOutline = ctx.session.plannerDayOutline ?? null;
  let plannerDayChunks = ctx.session.plannerDayChunks ?? [];
  let plannerDraft = ctx.session.plannerDraft ?? { days: [] };
  const harnessState = resolveDraftGenerateHarnessState(ctx);
  const plannerStrategy = resolvePlannerStrategy(
    runtimeProfile,
    plannerModelName,
    harnessState.strategyDay,
    harnessState.currentStrategy,
    currentDayExecution?.dayIndex ?? ctx.session.pipelineContext?.nextDayIndex ?? 1,
    resumeSubstage,
  );
  const plannerContractVersion = resolvePlannerContractVersion(plannerStrategy);

  if (!plannerSeed) {
    const seedAttempt = Math.max(
      1,
      currentDayExecution?.seedAttempt
        ?? (currentDayExecution ? 1 : ctx.session.pipelineContext?.seedAttempt ?? 1),
    );
    const seedPromptVariant = resolveSeedPromptVariant(seedAttempt);
    const seedTemperature = resolveSeedTemperature(temperature, seedAttempt);
    const seedMaxTokens = calculateSeedMaxTokens(normalized, runtimeProfile, seedAttempt);
    const seedTimeoutMs = calculateSeedTimeoutMs(runtimeProfile, overallTimeoutMs, seedAttempt);
    const seedPrompt = buildSeedPrompt(normalized, seedPromptVariant);
    const seedSystem = buildSeedSystemInstruction(seedPromptVariant);
    const promptChars = seedPrompt.length + seedSystem.length;

    console.log(
      `[draft_generate] Starting split canonical planner  model=${plannerModelName}, provider=${plannerProvider}, ` +
      `runtimeProfile=${runtimeProfile ?? 'default'}, remainingMs=${ctx.budget.remainingMs()}ms, timeout=${overallTimeoutMs}ms, ` +
      `seedTimeout=${seedTimeoutMs}ms, seedMaxTokens=${seedMaxTokens}, plannerContractVersion=${plannerContractVersion}, ` +
      `seedPromptVariant=${seedPromptVariant}, ` +
      `resumeSubstage=${resumeSubstage ?? 'seed_request'}`,
    );

    if (seedTimeoutMs < MIN_SEED_REQUEST_TIMEOUT_MS) {
      return buildPauseResult(ctx, {
        start,
        substage: 'seed_request',
        resumeSubstage: 'seed_request',
        timeoutMs: seedTimeoutMs,
        maxTokens: seedMaxTokens,
        promptChars,
        plannerAttempt: seedAttempt,
        pauseReason: 'runtime_budget_exhausted',
        checkpointCursor: 'draft_generate:seed_request',
        nextDayIndex: 1,
        seedAttempt,
        seedPromptVariant,
        plannerStrategy,
        plannerContractVersion,
      });
    }

    logPlannerSubstageStart(
      ctx,
      'seed_request',
      seedTimeoutMs,
      seedMaxTokens,
      promptChars,
      seedAttempt,
      1,
      undefined,
      seedPromptVariant,
      undefined,
      plannerStrategy,
      plannerContractVersion,
    );

    let seedText = '';
    try {
      seedText = await generateTextJsonText<PlannerSeedLlmOutput>({
        resolveModel: () => resolveLanguageModel(plannerProvider, plannerModelName),
        modelName: plannerModelName,
        llmSchema: plannerSeedLlmSchema,
        system: seedSystem,
        prompt: seedPrompt,
        temperature: seedTemperature,
        maxTokens: seedMaxTokens,
        timeoutMs: seedTimeoutMs,
        fallbackLabel: 'draft_generate.seed',
        recoveryMode: 'draft_seed',
      });

    } catch (error) {
      const classification = classifyDraftGenerateError(error, {
        plannerStrategy,
        substage: 'day_request',
      });

      if (seedAttempt >= MAX_SEED_REQUEST_ATTEMPTS) {
        console.error(
          `[draft_generate] ${classification.errorCode} at seed_request after ${Date.now() - start}ms  ${classification.message}`,
        );

        return buildTerminalFailureResult(ctx, {
          start,
          substage: 'seed_request',
          timeoutMs: seedTimeoutMs,
          maxTokens: seedMaxTokens,
          promptChars,
          errorCode: classification.errorCode,
          warningCode: classification.warningCode,
          rootCause: classification.rootCause,
          seedAttempt,
          invalidFieldPath: classification.invalidFieldPath,
          validationIssueCode: classification.validationIssueCode,
          seedPromptVariant,
          message: classification.message,
        });
      }

      return buildPauseResult(ctx, {
        start,
        substage: 'seed_request',
        resumeSubstage: 'seed_request',
        timeoutMs: seedTimeoutMs,
        maxTokens: seedMaxTokens,
        promptChars,
        plannerAttempt: seedAttempt + 1,
        pauseReason: classification.rootCause === 'timeout'
          ? 'runtime_budget_exhausted'
          : 'recovery_required',
        checkpointCursor: 'draft_generate:seed_request',
        nextDayIndex: 1,
        seedAttempt: seedAttempt + 1,
        seedPromptVariant,
      });
    }

    logPlannerSubstageStart(
      ctx,
      'seed_parse',
      0,
      seedMaxTokens,
      promptChars,
      seedAttempt,
      1,
      undefined,
      seedPromptVariant,
      undefined,
      plannerStrategy,
      plannerContractVersion,
    );

    let parsedSeed: PlannerSeed | null = null;
    let usedSeedTextRecovery = false;
    let salvagedDayCount: number | undefined;
    let seedErrorClassification: DraftGenerateErrorClassification | null = null;

    try {
      const parsed = parseTextJsonObjectDetailed(plannerSeedLlmSchema, seedText);
      parsedSeed = seedOutputToPlannerSeed(parsed.object);
      usedSeedTextRecovery = parsed.salvageApplied;
    } catch (error) {
      const salvagedSeed = trySalvageSeedFromError(error, normalized.durationDays);
      if (salvagedSeed) {
        parsedSeed = salvagedSeed.seed;
        usedSeedTextRecovery = salvagedSeed.usedTextRecovery;
        salvagedDayCount = salvagedSeed.salvagedDayCount;
        seedErrorClassification = classifyDraftGenerateError(error, {
          substage: 'seed_parse',
        });
      } else {
        const classification = classifyDraftGenerateError(error, {
          substage: 'seed_parse',
        });

        if (seedAttempt >= MAX_SEED_REQUEST_ATTEMPTS) {
          console.error(
            `[draft_generate] ${classification.errorCode} at seed_parse after ${Date.now() - start}ms  ${classification.message}`,
          );

          return buildTerminalFailureResult(ctx, {
            start,
            substage: 'seed_parse',
            timeoutMs: seedTimeoutMs,
            maxTokens: seedMaxTokens,
            promptChars,
            errorCode: classification.errorCode,
            warningCode: classification.warningCode,
            rootCause: classification.rootCause,
            seedAttempt,
            usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
            invalidFieldPath: classification.invalidFieldPath,
            validationIssueCode: classification.validationIssueCode,
            seedPromptVariant,
            plannerStrategy,
            plannerContractVersion,
            message: classification.message,
          });
        }

        return buildPauseResult(ctx, {
          start,
          substage: 'seed_parse',
          resumeSubstage: 'seed_request',
          timeoutMs: seedTimeoutMs,
          maxTokens: seedMaxTokens,
          promptChars,
          plannerAttempt: seedAttempt + 1,
          pauseReason: 'recovery_required',
          checkpointCursor: 'draft_generate:seed_request',
          nextDayIndex: 1,
          seedAttempt: seedAttempt + 1,
          usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
          seedPromptVariant,
          plannerStrategy,
          plannerContractVersion,
        });
      }
    }

    if (!parsedSeed) {
      return buildTerminalFailureResult(ctx, {
        start,
        substage: 'seed_parse',
        timeoutMs: seedTimeoutMs,
        maxTokens: seedMaxTokens,
        promptChars,
        errorCode: 'draft_generation_invalid_output',
        warningCode: 'draft_generation_invalid_output',
        rootCause: 'invalid_structured_output',
        seedAttempt,
        usedTextRecovery: usedSeedTextRecovery,
        salvagedDayCount,
        expectedDayCount: normalized.durationDays,
        seedPromptVariant,
        plannerStrategy,
        plannerContractVersion,
        message: 'missing_seed_after_parse',
      });
    }

    const seedError = validateSeed(parsedSeed, normalized.durationDays);
    if (seedError) {
      if (seedAttempt >= MAX_SEED_REQUEST_ATTEMPTS) {
        const classification = seedErrorClassification;
        console.error(
          `[draft_generate] draft_generation_invalid_output at seed_parse after ${Date.now() - start}ms  ${classification?.message ?? seedError}`,
        );

        return buildTerminalFailureResult(ctx, {
          start,
          substage: 'seed_parse',
          timeoutMs: seedTimeoutMs,
          maxTokens: seedMaxTokens,
          promptChars,
          errorCode: 'draft_generation_invalid_output',
          warningCode: 'draft_generation_invalid_output',
          rootCause: 'invalid_structured_output',
          seedAttempt,
          usedTextRecovery: usedSeedTextRecovery,
          invalidFieldPath: classification?.invalidFieldPath,
          validationIssueCode: classification?.validationIssueCode,
          salvagedDayCount: salvagedDayCount ?? parsedSeed.days.length,
          expectedDayCount: normalized.durationDays,
          seedPromptVariant,
          plannerStrategy,
          plannerContractVersion,
          message: classification?.message ?? seedError,
        });
      }

      return buildPauseResult(ctx, {
        start,
        substage: 'seed_parse',
        resumeSubstage: 'seed_request',
        timeoutMs: seedTimeoutMs,
        maxTokens: seedMaxTokens,
        promptChars,
        plannerAttempt: seedAttempt + 1,
        pauseReason: 'recovery_required',
        checkpointCursor: 'draft_generate:seed_request',
        nextDayIndex: 1,
        seedAttempt: seedAttempt + 1,
        usedTextRecovery: usedSeedTextRecovery,
        salvagedDayCount: salvagedDayCount ?? parsedSeed.days.length,
        expectedDayCount: normalized.durationDays,
        seedPromptVariant,
        plannerStrategy,
        plannerContractVersion,
        errorCode: 'draft_generation_invalid_output',
        rootCause: 'invalid_structured_output',
        invalidFieldPath: seedErrorClassification?.invalidFieldPath,
        validationIssueCode: seedErrorClassification?.validationIssueCode,
        message: seedErrorClassification?.message ?? seedError,
      });
    }

    plannerSeed = parsedSeed;

    const seedElapsedMs = Date.now() - start;
    const minimumDayStartBudgetMs = resolveMinimumDayStartBudgetMs(runtimeProfile, 1);
    if (shouldPauseBeforeFirstDay({
      runtimeProfile,
      seedAttempt,
      usedTextRecovery: usedSeedTextRecovery,
      seedTimeoutMs,
      elapsedMs: seedElapsedMs,
      remainingMs: ctx.budget.remainingMs(),
    })) {
      return buildPauseResult(ctx, {
        start,
        substage: 'seed_parse',
        resumeSubstage: plannerStrategy === 'micro_day_split' ? 'day_outline_request' : 'day_request',
        timeoutMs: seedTimeoutMs,
        maxTokens: seedMaxTokens,
        promptChars,
        plannerAttempt: 1,
        pauseReason: 'runtime_budget_exhausted',
        checkpointCursor: plannerStrategy === 'micro_day_split'
          ? 'draft_generate:day_outline_request:1'
          : 'draft_generate:day_request:1',
        plannerSeed,
        plannerDraft,
        nextDayIndex: 1,
        dayAttempt: plannerStrategy === 'micro_day_split' ? null : 1,
        outlineAttempt: plannerStrategy === 'micro_day_split' ? 1 : null,
        usedTextRecovery: usedSeedTextRecovery,
        seedPromptVariant,
        completedDayCount: 0,
        continuedToNextDayInSameStream: false,
        pauseAfterSeedCompletion: true,
        seedElapsedMs,
        minimumDayStartBudgetMs,
        plannerStrategy,
        plannerContractVersion,
      });
    }
  }

  if (!plannerSeed) {
    return buildTerminalFailureResult(ctx, {
      start,
      substage: 'seed_request',
      timeoutMs: 0,
      maxTokens: 0,
      promptChars: 0,
      errorCode: 'draft_generation_invalid_output',
      warningCode: 'draft_generation_invalid_output',
      rootCause: 'missing_seed',
    });
  }

  let nextDayIndex = resolveTargetDay(
    plannerSeed,
    plannerDraft,
    currentDayExecution?.dayIndex ?? ctx.session.pipelineContext?.nextDayIndex ?? null,
  );

  while (nextDayIndex <= plannerSeed.days.length) {
    const targetDay = plannerSeed.days.find((day) => day.day === nextDayIndex);
    if (!targetDay) {
      return buildTerminalFailureResult(ctx, {
        start,
        substage: 'day_request',
        timeoutMs: 0,
        maxTokens: 0,
        promptChars: 0,
        errorCode: 'draft_generation_invalid_output',
        warningCode: 'draft_generation_invalid_output',
        rootCause: 'missing_target_day',
        plannerSeed,
        plannerDraft,
        nextDayIndex,
      });
    }

    if (plannerStrategy === 'micro_day_split') {
      if (plannerDayOutline?.day !== targetDay.day) {
        plannerDayOutline = null;
        plannerDayChunks = [];
      }

      if (!plannerDayOutline) {
        const outlineAttempt = activeResumeSubstage === 'day_outline_request' || activeResumeSubstage === 'day_outline_parse'
          ? Math.max(1, currentDayExecution?.outlineAttempt ?? (currentDayExecution ? 1 : ctx.session.pipelineContext?.outlineAttempt ?? 1))
          : 1;
        const outlinePromptVariant = resolveDayPromptVariant(outlineAttempt);
        const outlineTemperature = resolveDayTemperature(temperature, outlineAttempt);
        const outlineTargetSlotCount = resolveTargetStopCount(normalized, runtimeProfile, outlineAttempt);
        const outlineMaxTokens = calculateOutlineMaxTokens(outlineTargetSlotCount, runtimeProfile, outlineAttempt, normalized.durationDays);
        const outlineTimeoutMs = calculateOutlineTimeoutMs(
          runtimeProfile,
          calculateCanonicalDraftTimeoutMs(ctx),
          outlineAttempt,
        );
        const outlinePrompt = buildDayOutlinePrompt(normalized, targetDay, plannerDraft, runtimeProfile);
        const outlineSystem = buildDayOutlineSystemInstruction();
        const outlinePromptChars = outlinePrompt.length + outlineSystem.length;

        logPlannerSubstageStart(
          ctx,
          'day_outline_request',
          outlineTimeoutMs,
          outlineMaxTokens,
          outlinePromptChars,
          outlineAttempt,
          targetDay.day,
          undefined,
          undefined,
          undefined,
          plannerStrategy,
        );

        let outlineText = '';
        try {
          outlineText = await generateTextJsonText<PlannerDayOutlineLlmOutput>({
            resolveModel: () => resolveLanguageModel(plannerProvider, plannerModelName),
            modelName: plannerModelName,
            llmSchema: plannerDayOutlineLlmSchema,
            system: outlineSystem,
            prompt: outlinePrompt,
            temperature: outlineTemperature,
            maxTokens: outlineMaxTokens,
            timeoutMs: outlineTimeoutMs,
            fallbackLabel: `draft_generate.day_outline_${targetDay.day}`,
            recoveryMode: 'draft_outline',
          });
        } catch (error) {
          const classification = classifyDraftGenerateError(error, {
            plannerStrategy: 'micro_day_split',
            substage: 'day_outline_request',
          });
          if (outlineAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
            return buildTerminalFailureResult(ctx, {
              start,
              substage: 'day_outline_request',
              timeoutMs: outlineTimeoutMs,
              maxTokens: outlineMaxTokens,
              promptChars: outlinePromptChars,
              errorCode: classification.errorCode,
              warningCode: classification.warningCode,
              rootCause: classification.rootCause,
              plannerSeed,
              plannerDraft,
              plannerDayChunks,
              nextDayIndex: targetDay.day,
              outlineAttempt,
              plannerStrategy,
              message: classification.message,
            });
          }

          return buildPauseResult(ctx, {
            start,
            substage: 'day_outline_request',
            resumeSubstage: 'day_outline_request',
            timeoutMs: outlineTimeoutMs,
            maxTokens: outlineMaxTokens,
            promptChars: outlinePromptChars,
            plannerAttempt: outlineAttempt + 1,
            pauseReason: classification.rootCause === 'timeout' ? 'runtime_budget_exhausted' : 'recovery_required',
            checkpointCursor: `draft_generate:day_outline_request:${targetDay.day}`,
            plannerSeed,
            plannerDraft,
            plannerDayChunks: [],
            nextDayIndex: targetDay.day,
            outlineAttempt: outlineAttempt + 1,
            dayPromptVariant: outlinePromptVariant,
            plannerStrategy,
            errorCode: classification.errorCode,
            rootCause: classification.rootCause,
            invalidFieldPath: classification.invalidFieldPath,
            validationIssueCode: classification.validationIssueCode,
            message: classification.message,
          });
        }

        logPlannerSubstageStart(
          ctx,
          'day_outline_parse',
          0,
          outlineMaxTokens,
          outlinePromptChars,
          outlineAttempt,
          targetDay.day,
          undefined,
          undefined,
          undefined,
          plannerStrategy,
        );

        let parsedOutline: PlannerDayOutline | null = null;
        let usedOutlineTextRecovery = false;
        let salvagedSlotCount: number | undefined;
        let requiredOutlineMealRecovered: boolean | undefined;
        try {
          const parsed = parseTextJsonObjectDetailed(plannerDayOutlineLlmSchema, outlineText);
          parsedOutline = outlineOutputToPlannerOutline(parsed.object);
          usedOutlineTextRecovery = parsed.salvageApplied;
        } catch (error) {
          const salvagedOutline = trySalvageOutlineFromError(error, targetDay);
          if (salvagedOutline) {
            parsedOutline = salvagedOutline.outline;
            salvagedSlotCount = salvagedOutline.salvagedSlotCount;
            requiredOutlineMealRecovered = salvagedOutline.requiredMealRecovered;
            usedOutlineTextRecovery = salvagedOutline.usedTextRecovery;
          } else {
            const classification = classifyDraftGenerateError(error, {
              plannerStrategy: 'micro_day_split',
              substage: 'day_outline_parse',
              rawText: outlineText,
            });
            if (outlineAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
              return buildTerminalFailureResult(ctx, {
                start,
                substage: 'day_outline_parse',
                timeoutMs: outlineTimeoutMs,
                maxTokens: outlineMaxTokens,
                promptChars: outlinePromptChars,
                errorCode: classification.errorCode,
                warningCode: classification.warningCode,
                rootCause: classification.rootCause,
                plannerSeed,
                plannerDraft,
                plannerDayChunks,
                nextDayIndex: targetDay.day,
                outlineAttempt,
                usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
                invalidFieldPath: classification.invalidFieldPath,
                validationIssueCode: classification.validationIssueCode,
                plannerStrategy,
                message: classification.message,
              });
            }

            return buildPauseResult(ctx, {
              start,
              substage: 'day_outline_parse',
              resumeSubstage: 'day_outline_request',
              timeoutMs: outlineTimeoutMs,
              maxTokens: outlineMaxTokens,
              promptChars: outlinePromptChars,
              plannerAttempt: outlineAttempt + 1,
              pauseReason: 'recovery_required',
              checkpointCursor: `draft_generate:day_outline_request:${targetDay.day}`,
              plannerSeed,
              plannerDraft,
              plannerDayChunks: [],
              nextDayIndex: targetDay.day,
              outlineAttempt: outlineAttempt + 1,
              usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
              plannerStrategy,
              errorCode: classification.errorCode,
              rootCause: classification.rootCause,
              invalidFieldPath: classification.invalidFieldPath,
              validationIssueCode: classification.validationIssueCode,
              message: classification.message,
            });
          }
        }

        const outlineError = parsedOutline
          ? validateOutline(parsedOutline, targetDay, normalized)
          : 'missing_outline';
        if (parsedOutline && outlineError) {
          const salvagedOutlinePrefix = salvagePlannerOutlinePrefixFromOutline(
            parsedOutline,
            targetDay,
            usedOutlineTextRecovery,
          );
          if (salvagedOutlinePrefix && salvagedOutlinePrefix.salvagedSlotCount > 0) {
            parsedOutline = salvagedOutlinePrefix.outline;
            salvagedSlotCount = Math.max(
              salvagedSlotCount ?? 0,
              salvagedOutlinePrefix.salvagedSlotCount,
            );
            requiredOutlineMealRecovered = salvagedOutlinePrefix.requiredMealRecovered;
            usedOutlineTextRecovery = salvagedOutlinePrefix.usedTextRecovery;
          }
        }
        const normalizedOutlineError = parsedOutline
          ? validateOutline(parsedOutline, targetDay, normalized)
          : 'missing_outline';
        if (!parsedOutline || normalizedOutlineError) {
          const outlineInvalidFieldPath = normalizedOutlineError === 'day_mismatch'
            ? 'day'
            : normalizedOutlineError === 'slot_index_mismatch'
              ? 'slots'
              : normalizedOutlineError === 'missing_slots'
                ? 'slots'
                : normalizedOutlineError === 'insufficient_slots'
                  ? 'slots'
                : undefined;
          const outlineErrorCode = outlineInvalidFieldPath === 'slots'
            ? 'draft_generation_outline_contract_mismatch'
            : 'draft_generation_invalid_output';
          if (outlineAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
            return buildTerminalFailureResult(ctx, {
              start,
              substage: 'day_outline_parse',
              timeoutMs: outlineTimeoutMs,
              maxTokens: outlineMaxTokens,
              promptChars: outlinePromptChars,
              errorCode: outlineErrorCode,
              warningCode: outlineErrorCode,
              rootCause: outlineErrorCode === 'draft_generation_outline_contract_mismatch'
                ? 'strategy_contract_mismatch'
                : 'invalid_structured_output',
              plannerSeed,
              plannerDraft,
              plannerDayChunks,
              nextDayIndex: targetDay.day,
              outlineAttempt,
              usedTextRecovery: usedOutlineTextRecovery,
              salvagedStopCount: salvagedSlotCount,
              requiredMealRecovered: requiredOutlineMealRecovered,
              invalidFieldPath: outlineInvalidFieldPath,
              plannerStrategy,
              message: normalizedOutlineError ?? 'missing_outline',
            });
          }

          return buildPauseResult(ctx, {
            start,
            substage: 'day_outline_parse',
            resumeSubstage: 'day_outline_request',
            timeoutMs: outlineTimeoutMs,
            maxTokens: outlineMaxTokens,
            promptChars: outlinePromptChars,
            plannerAttempt: outlineAttempt + 1,
            pauseReason: 'recovery_required',
            checkpointCursor: `draft_generate:day_outline_request:${targetDay.day}`,
            plannerSeed,
            plannerDraft,
            plannerDayChunks: [],
            nextDayIndex: targetDay.day,
            outlineAttempt: outlineAttempt + 1,
            usedTextRecovery: usedOutlineTextRecovery,
            salvagedStopCount: salvagedSlotCount,
            requiredMealRecovered: requiredOutlineMealRecovered,
            plannerStrategy,
            errorCode: outlineErrorCode,
            rootCause: outlineErrorCode === 'draft_generation_outline_contract_mismatch'
              ? 'strategy_contract_mismatch'
              : 'invalid_structured_output',
            invalidFieldPath: outlineInvalidFieldPath,
            message: normalizedOutlineError ?? 'missing_outline',
          });
        }

        plannerDayOutline = parsedOutline;
        plannerDayChunks = [];
        activeResumeSubstage = null;
      }

      const completedSlotIndexes = new Set(plannerDayChunks.map((stop) => stop.slotIndex));
      const remainingSlots = plannerDayOutline.slots.filter((slot) => !completedSlotIndexes.has(slot.slotIndex));
      if (remainingSlots.length === 0) {
        const completedDay = buildPlannerDayFromOutlineAndChunks(targetDay, plannerDayOutline, plannerDayChunks);
        if (!completedDay) {
          return buildTerminalFailureResult(ctx, {
            start,
            substage: 'day_chunk_parse',
            timeoutMs: 0,
            maxTokens: 0,
            promptChars: 0,
            errorCode: 'draft_generation_invalid_output',
            warningCode: 'draft_generation_invalid_output',
            rootCause: 'incomplete_planner_draft',
            plannerSeed,
            plannerDraft,
            plannerDayOutline,
            plannerDayChunks,
            nextDayIndex: targetDay.day,
            plannerStrategy,
          });
        }
        plannerDraft = upsertPlannerDay(plannerDraft, completedDay);
        plannerDayOutline = null;
        plannerDayChunks = [];
        nextDayIndex += 1;
        activeResumeSubstage = null;

        const completedDraft = mergeSeedAndDraft(plannerSeed, plannerDraft);
        if (completedDraft) {
          const finalHarnessState = resolveNextDraftGenerateHarnessState(ctx, {
            plannerStrategy,
            substage: 'day_chunk_parse',
            nextDayIndex: targetDay.day,
          });
          return {
            outcome: 'completed',
            data: completedDraft,
            warnings: [],
            durationMs: Date.now() - start,
            metadata: {
              substage: 'day_chunk_parse',
              selectedTimeoutMs: 0,
              maxTokens: 0,
              promptChars: 0,
              plannerContractVersion,
              recoveryMode: 'draft_day',
              usedTextRecovery: false,
              dayCount: completedDraft.days.length,
              totalStops: completedDraft.days.reduce((sum, day) => sum + day.stops.length, 0),
              plannerStrategy,
              completedDayCount: plannerDraft.days.length,
              currentStrategy: finalHarnessState.currentStrategy,
              strategyEscalationCount: finalHarnessState.strategyEscalationCount,
              recoveryCount: finalHarnessState.recoveryCount,
              pauseCount: finalHarnessState.pauseCount,
              sameErrorRecurrenceCount: finalHarnessState.sameErrorRecurrenceCount,
              pipelineContextPatch: {
                ...clearDraftGenerateResumePatch(),
                finalDraftStrategySummary: buildFinalDraftStrategySummary(finalHarnessState),
              },
              sessionPatch: {
                plannerSeed: null,
                plannerDayOutline: null,
                plannerDayChunks: null,
              },
            },
          };
        }

        return buildPauseResult(ctx, {
          start,
          substage: 'day_chunk_parse',
          resumeSubstage: 'day_request',
          timeoutMs: 0,
          maxTokens: 0,
          promptChars: 0,
          plannerAttempt: 1,
          pauseReason: 'runtime_budget_exhausted',
          checkpointCursor: `draft_generate:day_request:${nextDayIndex}`,
          plannerSeed,
          plannerDraft,
          plannerDayOutline: null,
          plannerDayChunks: [],
          nextDayIndex,
          dayAttempt: 1,
          completedDayCount: plannerDraft.days.length,
          continuedToNextDayInSameStream: false,
          pauseAfterDayCompletion: true,
          plannerStrategy,
          resetHarnessState: true,
          finalDraftStrategySummary: buildFinalDraftStrategySummary(resolveNextDraftGenerateHarnessState(ctx, {
            plannerStrategy,
            substage: 'day_chunk_parse',
            nextDayIndex: targetDay.day,
          })),
        });
      } else {
        const chunkSize = resolveChunkSize(normalized, targetDay.day);
        const currentChunkIndex = activeResumeSubstage === 'day_chunk_request' || activeResumeSubstage === 'day_chunk_parse'
          ? Math.max(1, currentDayExecution?.dayChunkIndex ?? (currentDayExecution ? 1 : ctx.session.pipelineContext?.dayChunkIndex ?? 1))
          : Math.floor(completedSlotIndexes.size / chunkSize) + 1;
        const chunkAttempt = activeResumeSubstage === 'day_chunk_request' || activeResumeSubstage === 'day_chunk_parse'
          ? Math.max(1, currentDayExecution?.chunkAttempt ?? (currentDayExecution ? 1 : ctx.session.pipelineContext?.chunkAttempt ?? 1))
          : 1;
        const chunkSlots = remainingSlots.slice(0, chunkSize);
        const chunkPromptVariant = resolveDayPromptVariant(chunkAttempt);
        const chunkTemperature = resolveDayTemperature(temperature, chunkAttempt);
        const chunkMaxTokens = calculateChunkMaxTokens(chunkSlots.length, runtimeProfile, chunkAttempt, normalized.durationDays);
        const chunkTimeoutMs = calculateChunkTimeoutMs(
          runtimeProfile,
          calculateCanonicalDraftTimeoutMs(ctx),
          chunkAttempt,
        );
        const chunkPrompt = buildDayChunkPrompt(
          normalized,
          targetDay,
          plannerDayOutline,
          chunkSlots,
          plannerDraft,
        );
        const chunkSystem = buildDayChunkSystemInstruction();
        const chunkPromptChars = chunkPrompt.length + chunkSystem.length;

        logPlannerSubstageStart(
          ctx,
          'day_chunk_request',
          chunkTimeoutMs,
          chunkMaxTokens,
          chunkPromptChars,
          chunkAttempt,
          targetDay.day,
          currentChunkIndex,
          undefined,
          chunkPromptVariant,
          plannerStrategy,
        );

        let chunkText = '';
        try {
          chunkText = await generateTextJsonText<PlannerDayChunkLlmOutput>({
            resolveModel: () => resolveLanguageModel(plannerProvider, plannerModelName),
            modelName: plannerModelName,
            llmSchema: plannerDayChunkLlmSchema,
            system: chunkSystem,
            prompt: chunkPrompt,
            temperature: chunkTemperature,
            maxTokens: chunkMaxTokens,
            timeoutMs: chunkTimeoutMs,
            fallbackLabel: `draft_generate.day_chunk_${targetDay.day}_${currentChunkIndex}`,
            recoveryMode: 'draft_day',
          });
        } catch (error) {
          const classification = classifyDraftGenerateError(error, {
            plannerStrategy: 'micro_day_split',
            substage: 'day_chunk_request',
          });
          if (chunkAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
            return buildTerminalFailureResult(ctx, {
              start,
              substage: 'day_chunk_request',
              timeoutMs: chunkTimeoutMs,
              maxTokens: chunkMaxTokens,
              promptChars: chunkPromptChars,
              errorCode: classification.errorCode,
              warningCode: classification.warningCode,
              rootCause: classification.rootCause,
              plannerSeed,
              plannerDraft,
              plannerDayOutline,
              plannerDayChunks,
              nextDayIndex: targetDay.day,
              dayChunkIndex: currentChunkIndex,
              chunkAttempt,
              plannerStrategy,
              message: classification.message,
            });
          }

          return buildPauseResult(ctx, {
            start,
            substage: 'day_chunk_request',
            resumeSubstage: 'day_chunk_request',
            timeoutMs: chunkTimeoutMs,
            maxTokens: chunkMaxTokens,
            promptChars: chunkPromptChars,
            plannerAttempt: chunkAttempt + 1,
            pauseReason: classification.rootCause === 'timeout' ? 'runtime_budget_exhausted' : 'recovery_required',
            checkpointCursor: `draft_generate:day_chunk_request:${targetDay.day}:${currentChunkIndex}`,
            plannerSeed,
            plannerDraft,
            plannerDayOutline,
            plannerDayChunks,
            nextDayIndex: targetDay.day,
            dayChunkIndex: currentChunkIndex,
            chunkAttempt: chunkAttempt + 1,
            dayPromptVariant: chunkPromptVariant,
            plannerStrategy,
            errorCode: classification.errorCode,
            rootCause: classification.rootCause,
            invalidFieldPath: classification.invalidFieldPath,
            validationIssueCode: classification.validationIssueCode,
            message: classification.message,
          });
        }

        logPlannerSubstageStart(
          ctx,
          'day_chunk_parse',
          0,
          chunkMaxTokens,
          chunkPromptChars,
          chunkAttempt,
          targetDay.day,
          currentChunkIndex,
          undefined,
          chunkPromptVariant,
          plannerStrategy,
        );

        let parsedChunkStops: PlannerDayChunkStop[] | null = null;
        let usedChunkTextRecovery = false;
        try {
          const parsed = parseTextJsonObjectDetailed(plannerDayChunkLlmSchema, chunkText);
          parsedChunkStops = chunkOutputToPlannerChunkStops(parsed.object, targetDay);
          usedChunkTextRecovery = parsed.salvageApplied;
        } catch (error) {
          const salvagedChunk = trySalvageChunkFromError(error, targetDay, chunkSlots);
          if (salvagedChunk) {
            parsedChunkStops = salvagedChunk.stops;
            usedChunkTextRecovery = salvagedChunk.usedTextRecovery;
          } else {
            const classification = classifyDraftGenerateError(error, {
              plannerStrategy: 'micro_day_split',
              substage: 'day_chunk_parse',
              rawText: chunkText,
            });
            if (chunkAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
              return buildTerminalFailureResult(ctx, {
                start,
                substage: 'day_chunk_parse',
                timeoutMs: chunkTimeoutMs,
                maxTokens: chunkMaxTokens,
                promptChars: chunkPromptChars,
                errorCode: classification.errorCode,
                warningCode: classification.warningCode,
                rootCause: classification.rootCause,
                plannerSeed,
                plannerDraft,
                plannerDayOutline,
                plannerDayChunks,
                nextDayIndex: targetDay.day,
                dayChunkIndex: currentChunkIndex,
                chunkAttempt,
                usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
                invalidFieldPath: classification.invalidFieldPath,
                validationIssueCode: classification.validationIssueCode,
                plannerStrategy,
                message: classification.message,
              });
            }

            return buildPauseResult(ctx, {
              start,
              substage: 'day_chunk_parse',
              resumeSubstage: 'day_chunk_request',
              timeoutMs: chunkTimeoutMs,
              maxTokens: chunkMaxTokens,
              promptChars: chunkPromptChars,
              plannerAttempt: chunkAttempt + 1,
              pauseReason: 'recovery_required',
              checkpointCursor: `draft_generate:day_chunk_request:${targetDay.day}:${currentChunkIndex}`,
              plannerSeed,
              plannerDraft,
              plannerDayOutline,
              plannerDayChunks,
              nextDayIndex: targetDay.day,
              dayChunkIndex: currentChunkIndex,
              chunkAttempt: chunkAttempt + 1,
              usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
              dayPromptVariant: chunkPromptVariant,
              plannerStrategy,
              errorCode: classification.errorCode,
              rootCause: classification.rootCause,
              invalidFieldPath: classification.invalidFieldPath,
              validationIssueCode: classification.validationIssueCode,
              message: classification.message,
            });
          }
        }

        const chunkError = parsedChunkStops
          ? validateChunkStops(parsedChunkStops, chunkSlots, plannerDraft)
          : 'missing_chunk_stops';
        if (!parsedChunkStops || chunkError) {
          if (chunkAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
            return buildTerminalFailureResult(ctx, {
              start,
              substage: 'day_chunk_parse',
              timeoutMs: chunkTimeoutMs,
              maxTokens: chunkMaxTokens,
              promptChars: chunkPromptChars,
              errorCode: 'draft_generation_invalid_output',
              warningCode: 'draft_generation_invalid_output',
              rootCause: 'invalid_structured_output',
              plannerSeed,
              plannerDraft,
              plannerDayOutline,
              plannerDayChunks,
              nextDayIndex: targetDay.day,
              dayChunkIndex: currentChunkIndex,
              chunkAttempt,
              usedTextRecovery: usedChunkTextRecovery,
              plannerStrategy,
              message: chunkError ?? 'missing_chunk_stops',
            });
          }

          return buildPauseResult(ctx, {
            start,
            substage: 'day_chunk_parse',
            resumeSubstage: 'day_chunk_request',
            timeoutMs: chunkTimeoutMs,
            maxTokens: chunkMaxTokens,
            promptChars: chunkPromptChars,
            plannerAttempt: chunkAttempt + 1,
            pauseReason: 'recovery_required',
            checkpointCursor: `draft_generate:day_chunk_request:${targetDay.day}:${currentChunkIndex}`,
            plannerSeed,
            plannerDraft,
            plannerDayOutline,
            plannerDayChunks,
            nextDayIndex: targetDay.day,
            dayChunkIndex: currentChunkIndex,
            chunkAttempt: chunkAttempt + 1,
            usedTextRecovery: usedChunkTextRecovery,
            dayPromptVariant: chunkPromptVariant,
            plannerStrategy,
            errorCode: 'draft_generation_invalid_output',
            rootCause: 'invalid_structured_output',
            message: chunkError ?? 'missing_chunk_stops',
          });
        }

        plannerDayChunks = upsertPlannerChunkStops(plannerDayChunks, parsedChunkStops);
        const completedDay = buildPlannerDayFromOutlineAndChunks(targetDay, plannerDayOutline, plannerDayChunks);
        if (completedDay) {
          const completedDayError = validatePlannerDay(completedDay, normalized, plannerDraft);
          if (completedDayError) {
            if (chunkAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
              return buildTerminalFailureResult(ctx, {
                start,
                substage: 'day_chunk_parse',
                timeoutMs: chunkTimeoutMs,
                maxTokens: chunkMaxTokens,
                promptChars: chunkPromptChars,
                errorCode: 'draft_generation_invalid_output',
                warningCode: 'draft_generation_invalid_output',
                rootCause: 'invalid_structured_output',
                plannerSeed,
                plannerDraft,
                plannerDayOutline,
                plannerDayChunks,
                nextDayIndex: targetDay.day,
                dayChunkIndex: currentChunkIndex,
                chunkAttempt,
                usedTextRecovery: usedChunkTextRecovery,
                plannerStrategy,
                message: completedDayError,
              });
            }

            return buildPauseResult(ctx, {
              start,
              substage: 'day_chunk_parse',
              resumeSubstage: 'day_chunk_request',
              timeoutMs: chunkTimeoutMs,
              maxTokens: chunkMaxTokens,
              promptChars: chunkPromptChars,
              plannerAttempt: chunkAttempt + 1,
              pauseReason: 'recovery_required',
              checkpointCursor: `draft_generate:day_chunk_request:${targetDay.day}:${currentChunkIndex}`,
              plannerSeed,
              plannerDraft,
              plannerDayOutline,
              plannerDayChunks: [],
              nextDayIndex: targetDay.day,
              dayChunkIndex: currentChunkIndex,
              chunkAttempt: chunkAttempt + 1,
              usedTextRecovery: usedChunkTextRecovery,
              dayPromptVariant: chunkPromptVariant,
              plannerStrategy,
              errorCode: 'draft_generation_invalid_output',
              rootCause: 'invalid_structured_output',
              message: completedDayError,
            });
          }
          plannerDraft = upsertPlannerDay(plannerDraft, completedDay);
          plannerDayOutline = null;
          plannerDayChunks = [];
          nextDayIndex += 1;

          const completedDayCount = plannerDraft.days.length;
          const completedDraft = mergeSeedAndDraft(plannerSeed, plannerDraft);
          if (completedDraft) {
            const finalHarnessState = resolveNextDraftGenerateHarnessState(ctx, {
              plannerStrategy,
              substage: 'day_chunk_parse',
              nextDayIndex: targetDay.day,
            });
            return {
              outcome: 'completed',
              data: completedDraft,
              warnings: [],
              durationMs: Date.now() - start,
              metadata: {
                substage: 'day_chunk_parse',
                selectedTimeoutMs: chunkTimeoutMs,
                maxTokens: chunkMaxTokens,
                promptChars: chunkPromptChars,
                plannerContractVersion,
                recoveryMode: 'draft_day',
                usedTextRecovery: usedChunkTextRecovery,
                dayCount: completedDraft.days.length,
                totalStops: completedDraft.days.reduce((sum, day) => sum + day.stops.length, 0),
                dayPromptVariant: chunkPromptVariant,
                plannerStrategy,
                completedDayCount,
                currentStrategy: finalHarnessState.currentStrategy,
                strategyEscalationCount: finalHarnessState.strategyEscalationCount,
                recoveryCount: finalHarnessState.recoveryCount,
                pauseCount: finalHarnessState.pauseCount,
                sameErrorRecurrenceCount: finalHarnessState.sameErrorRecurrenceCount,
                pipelineContextPatch: {
                  ...clearDraftGenerateResumePatch(),
                  finalDraftStrategySummary: buildFinalDraftStrategySummary(finalHarnessState),
                },
                sessionPatch: {
                  plannerSeed: null,
                  plannerDayOutline: null,
                  plannerDayChunks: null,
                },
              },
            };
          }

          return buildPauseResult(ctx, {
            start,
            substage: 'day_chunk_parse',
            resumeSubstage: 'day_request',
            timeoutMs: chunkTimeoutMs,
            maxTokens: chunkMaxTokens,
            promptChars: chunkPromptChars,
            plannerAttempt: 1,
            pauseReason: 'runtime_budget_exhausted',
            checkpointCursor: `draft_generate:day_request:${nextDayIndex}`,
            plannerSeed,
            plannerDraft,
            plannerDayOutline: null,
            plannerDayChunks: [],
            nextDayIndex,
            dayAttempt: 1,
            usedTextRecovery: usedChunkTextRecovery,
            dayPromptVariant: chunkPromptVariant,
            completedDayCount,
            continuedToNextDayInSameStream: false,
            pauseAfterDayCompletion: true,
            plannerStrategy,
            resetHarnessState: true,
            finalDraftStrategySummary: buildFinalDraftStrategySummary(resolveNextDraftGenerateHarnessState(ctx, {
              plannerStrategy,
              substage: 'day_chunk_parse',
              nextDayIndex: targetDay.day,
            })),
          });
        }

        const remainingChunkCount = Math.ceil(
          plannerDayOutline.slots.filter((slot) => !plannerDayChunks.some((stop) => stop.slotIndex === slot.slotIndex)).length
          / chunkSize,
        );
        return buildPauseResult(ctx, {
          start,
          substage: 'day_chunk_parse',
          resumeSubstage: 'day_chunk_request',
          timeoutMs: chunkTimeoutMs,
          maxTokens: chunkMaxTokens,
          promptChars: chunkPromptChars,
          plannerAttempt: 1,
          pauseReason: 'runtime_budget_exhausted',
          checkpointCursor: `draft_generate:day_chunk_request:${targetDay.day}:${currentChunkIndex + 1}`,
          plannerSeed,
          plannerDraft,
          plannerDayOutline,
          plannerDayChunks,
          nextDayIndex: targetDay.day,
          dayChunkIndex: currentChunkIndex + 1,
          chunkAttempt: 1,
          usedTextRecovery: usedChunkTextRecovery,
          dayPromptVariant: chunkPromptVariant,
          completedDayCount: plannerDraft.days.length,
          continuedToNextDayInSameStream: remainingChunkCount <= 1,
          plannerStrategy,
        });
      }

      continue;
    }

    const dayAttempt = activeResumeSubstage === 'day_request' || activeResumeSubstage === 'day_parse'
      ? Math.max(1, currentDayExecution?.dayAttempt ?? (currentDayExecution ? 1 : ctx.session.pipelineContext?.dayAttempt ?? 1))
      : 1;
    const dayPromptVariant = resolveDayPromptVariant(dayAttempt);
    const dayTemperature = resolveDayTemperature(temperature, dayAttempt);
    const dayMaxTokens = calculateDayMaxTokens(normalized, runtimeProfile, dayAttempt);
    const remainingDays = plannerSeed.days.length - nextDayIndex + 1;
    const dayTimeoutMs = calculateDayTimeoutMs(
      runtimeProfile,
      calculateCanonicalDraftTimeoutMs(ctx),
      remainingDays,
      dayAttempt,
    );
    const dayPrompt = plannerStrategy === 'constrained_completion'
      ? buildConstrainedCompletionPrompt(normalized, targetDay, plannerDraft)
      : buildDayPrompt(
        normalized,
        plannerSeed,
        targetDay,
        plannerDraft,
        dayPromptVariant,
        runtimeProfile,
        dayAttempt,
      );
    const daySystem = plannerStrategy === 'constrained_completion'
      ? buildConstrainedCompletionSystemInstruction()
      : buildDaySystemInstruction();
    const promptChars = dayPrompt.length + daySystem.length;

    if (dayTimeoutMs < resolveMinimumDayStartBudgetMs(runtimeProfile, dayAttempt)) {
      return buildPauseResult(ctx, {
        start,
        substage: 'day_request',
        resumeSubstage: 'day_request',
        timeoutMs: dayTimeoutMs,
        maxTokens: dayMaxTokens,
        promptChars,
        plannerAttempt: dayAttempt,
        pauseReason: 'runtime_budget_exhausted',
        checkpointCursor: `draft_generate:day_request:${targetDay.day}`,
        plannerSeed,
        plannerDraft,
        nextDayIndex: targetDay.day,
        dayAttempt,
        dayPromptVariant,
        minimumDayStartBudgetMs: resolveMinimumDayStartBudgetMs(runtimeProfile, dayAttempt),
      });
    }

    logPlannerSubstageStart(
      ctx,
      'day_request',
      dayTimeoutMs,
      dayMaxTokens,
      promptChars,
      dayAttempt,
      targetDay.day,
      undefined,
      undefined,
      dayPromptVariant,
      plannerStrategy,
    );

    let dayText = '';
    try {
      dayText = await generateTextJsonText<PlannerDayStopsLlmOutput>({
        resolveModel: () => resolveLanguageModel(plannerProvider, plannerModelName),
        modelName: plannerModelName,
        llmSchema: plannerDayStopsLlmSchema,
        system: daySystem,
        prompt: dayPrompt,
        temperature: dayTemperature,
        maxTokens: dayMaxTokens,
        timeoutMs: dayTimeoutMs,
        fallbackLabel: `draft_generate.day_${targetDay.day}`,
        recoveryMode: 'draft_day',
      });

    } catch (error) {
      const classification = classifyDraftGenerateError(error, {
        substage: 'seed_request',
      });
      const shouldFallbackToMicro = plannerStrategy === 'split_day_v5'
        && shouldFallbackToMicroDaySplit(runtimeProfile, plannerModelName, dayAttempt);

      if (shouldFallbackToMicro) {
        return buildPauseResult(ctx, {
          start,
          substage: 'day_request',
          resumeSubstage: 'day_outline_request',
          timeoutMs: dayTimeoutMs,
          maxTokens: dayMaxTokens,
          promptChars,
          plannerAttempt: 1,
          pauseReason: 'recovery_required',
          checkpointCursor: `draft_generate:day_outline_request:${targetDay.day}:1`,
          plannerSeed,
          plannerDraft,
          nextDayIndex: targetDay.day,
          outlineAttempt: 1,
          dayPromptVariant,
          plannerStrategy: 'micro_day_split',
          plannerContractVersion: resolvePlannerContractVersion('micro_day_split'),
          fallbackTriggered: true,
          fallbackReason: 'full_day_request_retries_exhausted',
        });
      }

      if (dayAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
        console.error(
          `[draft_generate] ${classification.errorCode} at day_request after ${Date.now() - start}ms  ${classification.message}`,
        );

        return buildTerminalFailureResult(ctx, {
          start,
          substage: 'day_request',
          timeoutMs: dayTimeoutMs,
          maxTokens: dayMaxTokens,
          promptChars,
          errorCode: classification.errorCode,
          warningCode: classification.warningCode,
          rootCause: classification.rootCause,
          plannerSeed,
          plannerDraft,
          nextDayIndex: targetDay.day,
          dayAttempt,
          invalidFieldPath: classification.invalidFieldPath,
          validationIssueCode: classification.validationIssueCode,
          dayPromptVariant,
          message: classification.message,
        });
      }

      return buildPauseResult(ctx, {
        start,
        substage: 'day_request',
        resumeSubstage: 'day_request',
        timeoutMs: dayTimeoutMs,
        maxTokens: dayMaxTokens,
        promptChars,
        plannerAttempt: dayAttempt + 1,
        pauseReason: classification.rootCause === 'timeout'
          ? 'runtime_budget_exhausted'
          : 'recovery_required',
        checkpointCursor: `draft_generate:day_request:${targetDay.day}`,
          plannerSeed,
          plannerDraft,
          nextDayIndex: targetDay.day,
          dayAttempt: dayAttempt + 1,
          dayPromptVariant,
          plannerStrategy,
          errorCode: classification.errorCode,
          rootCause: classification.rootCause,
          invalidFieldPath: classification.invalidFieldPath,
          validationIssueCode: classification.validationIssueCode,
          message: classification.message,
        });
    }

    logPlannerSubstageStart(
      ctx,
      'day_parse',
      0,
      dayMaxTokens,
      promptChars,
      dayAttempt,
      targetDay.day,
      undefined,
      undefined,
      dayPromptVariant,
      plannerStrategy,
    );

    let parsedDay: PlannerDayStopsLlmOutput | null = null;
    let usedDayTextRecovery = false;
    let salvagedStopCount: number | undefined;
    let requiredMealRecovered: boolean | undefined;
    let dayErrorClassification: DraftGenerateErrorClassification | null = null;

    try {
      const parsed = parseTextJsonObjectDetailed(plannerDayStopsLlmSchema, dayText);
      parsedDay = parsed.object;
      usedDayTextRecovery = parsed.salvageApplied;
    } catch (error) {
      const salvagedDay = trySalvageDayFromError(error, targetDay);
      if (salvagedDay) {
        parsedDay = salvagedDay.day;
        usedDayTextRecovery = salvagedDay.usedTextRecovery;
        salvagedStopCount = salvagedDay.salvagedStopCount;
        requiredMealRecovered = salvagedDay.requiredMealRecovered;
        dayErrorClassification = classifyDraftGenerateError(error, {
          plannerStrategy,
          substage: 'day_parse',
          rawText: dayText,
        });
      } else {
        const classification = classifyDraftGenerateError(error, {
          plannerStrategy,
          substage: 'day_parse',
          rawText: dayText,
        });
        const shouldFallbackToMicro = plannerStrategy === 'split_day_v5'
          && shouldFallbackToMicroDaySplit(runtimeProfile, plannerModelName, dayAttempt);

        if (shouldFallbackToMicro) {
          return buildPauseResult(ctx, {
            start,
            substage: 'day_parse',
            resumeSubstage: 'day_outline_request',
            timeoutMs: dayTimeoutMs,
            maxTokens: dayMaxTokens,
            promptChars,
            plannerAttempt: 1,
            pauseReason: 'recovery_required',
            checkpointCursor: `draft_generate:day_outline_request:${targetDay.day}:1`,
            plannerSeed,
            plannerDraft,
            nextDayIndex: targetDay.day,
            outlineAttempt: 1,
            usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
            dayPromptVariant,
            plannerStrategy: 'micro_day_split',
            plannerContractVersion: resolvePlannerContractVersion('micro_day_split'),
            fallbackTriggered: true,
            fallbackReason: 'full_day_parse_retries_exhausted',
          });
        }

        if (dayAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
          console.error(
            `[draft_generate] ${classification.errorCode} at day_parse after ${Date.now() - start}ms  ${classification.message}`,
          );

          return buildTerminalFailureResult(ctx, {
            start,
            substage: 'day_parse',
            timeoutMs: dayTimeoutMs,
            maxTokens: dayMaxTokens,
            promptChars,
            errorCode: classification.errorCode,
            warningCode: classification.warningCode,
            rootCause: classification.rootCause,
            plannerSeed,
            plannerDraft,
            nextDayIndex: targetDay.day,
            dayAttempt,
            usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
            invalidFieldPath: classification.invalidFieldPath,
            validationIssueCode: classification.validationIssueCode,
            dayPromptVariant,
            message: classification.message,
          });
        }

        return buildPauseResult(ctx, {
          start,
          substage: 'day_parse',
          resumeSubstage: 'day_request',
          timeoutMs: dayTimeoutMs,
          maxTokens: dayMaxTokens,
          promptChars,
          plannerAttempt: dayAttempt + 1,
          pauseReason: 'recovery_required',
          checkpointCursor: `draft_generate:day_request:${targetDay.day}`,
          plannerSeed,
          plannerDraft,
          nextDayIndex: targetDay.day,
          dayAttempt: dayAttempt + 1,
          usedTextRecovery: error instanceof TextJsonParseError ? error.salvageApplied : false,
          dayPromptVariant,
          plannerStrategy,
          errorCode: classification.errorCode,
          rootCause: classification.rootCause,
          invalidFieldPath: classification.invalidFieldPath,
          validationIssueCode: classification.validationIssueCode,
          message: classification.message,
        });
      }
    }

    if (!parsedDay) {
      return buildTerminalFailureResult(ctx, {
        start,
        substage: 'day_parse',
        timeoutMs: dayTimeoutMs,
        maxTokens: dayMaxTokens,
        promptChars,
        errorCode: 'draft_generation_invalid_output',
        warningCode: 'draft_generation_invalid_output',
        rootCause: 'invalid_structured_output',
        plannerSeed,
        plannerDraft,
        nextDayIndex: targetDay.day,
        dayAttempt,
        usedTextRecovery: usedDayTextRecovery,
        salvagedStopCount,
        requiredMealRecovered,
        dayPromptVariant,
        message: 'missing_day_after_parse',
      });
    }

    const dayError = validateDayStops(parsedDay, targetDay, normalized, plannerDraft);
    if (dayError) {
      if (!dayErrorClassification) {
        dayErrorClassification = classifyDraftGenerateError(new Error(dayError), {
          plannerStrategy,
          substage: 'day_parse',
          rawText: dayText,
        });
      }
      const dayValidationErrorCode = dayErrorClassification?.errorCode ?? 'draft_generation_invalid_output';
      const dayValidationWarningCode = dayErrorClassification?.warningCode ?? dayValidationErrorCode;
      const dayValidationRootCause = dayErrorClassification?.rootCause ?? 'invalid_structured_output';
      const shouldFallbackToMicro = plannerStrategy === 'split_day_v5'
        && shouldFallbackToMicroDaySplit(runtimeProfile, plannerModelName, dayAttempt);

      if (shouldFallbackToMicro) {
        return buildPauseResult(ctx, {
          start,
          substage: 'day_parse',
          resumeSubstage: 'day_outline_request',
          timeoutMs: dayTimeoutMs,
          maxTokens: dayMaxTokens,
          promptChars,
          plannerAttempt: 1,
          pauseReason: 'recovery_required',
          checkpointCursor: `draft_generate:day_outline_request:${targetDay.day}:1`,
          plannerSeed,
          plannerDraft,
          nextDayIndex: targetDay.day,
          outlineAttempt: 1,
          usedTextRecovery: usedDayTextRecovery,
          dayPromptVariant,
          salvagedStopCount: salvagedStopCount ?? parsedDay.stops.length,
          requiredMealRecovered: requiredMealRecovered ?? parsedDay.stops.some((stop) => stop.role === 'meal'),
          plannerStrategy: 'micro_day_split',
          plannerContractVersion: resolvePlannerContractVersion('micro_day_split'),
          fallbackTriggered: true,
          fallbackReason: 'full_day_validation_retries_exhausted',
        });
      }

      if (dayAttempt >= MAX_DAY_REQUEST_ATTEMPTS) {
        const classification = dayErrorClassification;
        const message = classification?.message ?? dayError;
        console.error(
          `[draft_generate] draft_generation_invalid_output at day_parse after ${Date.now() - start}ms  ${message}`,
        );

        return buildTerminalFailureResult(ctx, {
          start,
          substage: 'day_parse',
          timeoutMs: dayTimeoutMs,
          maxTokens: dayMaxTokens,
          promptChars,
          errorCode: dayValidationErrorCode,
          warningCode: dayValidationWarningCode,
          rootCause: dayValidationRootCause,
          plannerSeed,
          plannerDraft,
          nextDayIndex: targetDay.day,
          dayAttempt,
          usedTextRecovery: usedDayTextRecovery,
          invalidFieldPath: classification?.invalidFieldPath,
          validationIssueCode: classification?.validationIssueCode,
          dayPromptVariant,
          salvagedStopCount: salvagedStopCount ?? parsedDay.stops.length,
          requiredMealRecovered: requiredMealRecovered ?? parsedDay.stops.some((stop) => stop.role === 'meal'),
          message,
        });
      }

      return buildPauseResult(ctx, {
        start,
        substage: 'day_parse',
        resumeSubstage: 'day_request',
        timeoutMs: dayTimeoutMs,
        maxTokens: dayMaxTokens,
        promptChars,
        plannerAttempt: dayAttempt + 1,
        pauseReason: 'recovery_required',
        checkpointCursor: `draft_generate:day_request:${targetDay.day}`,
        plannerSeed,
        plannerDraft,
        nextDayIndex: targetDay.day,
        dayAttempt: dayAttempt + 1,
        usedTextRecovery: usedDayTextRecovery,
        dayPromptVariant,
        salvagedStopCount: salvagedStopCount ?? parsedDay.stops.length,
        requiredMealRecovered: requiredMealRecovered ?? parsedDay.stops.some((stop) => stop.role === 'meal'),
        plannerStrategy,
        errorCode: dayValidationErrorCode,
        rootCause: dayValidationRootCause,
        invalidFieldPath: dayErrorClassification?.invalidFieldPath,
        validationIssueCode: dayErrorClassification?.validationIssueCode,
        message: dayErrorClassification?.message ?? dayError,
      });
    }

    plannerDraft = upsertPlannerDay(plannerDraft, dayOutputToPlannerDay(parsedDay, targetDay));
    nextDayIndex += 1;

    const completedDayCount = plannerDraft.days.length;
    const completedDraft = mergeSeedAndDraft(plannerSeed, plannerDraft);
    if (completedDraft) {
      console.log(
        `[draft_generate] Completed in ${Date.now() - start}ms — ${completedDraft.days.length} days, ` +
        `${completedDraft.days.reduce((sum, day) => sum + day.stops.length, 0)} stops`,
      );

      return {
        outcome: 'completed',
        data: completedDraft,
        warnings: [],
        durationMs: Date.now() - start,
        metadata: {
          substage: 'day_parse',
          selectedTimeoutMs: dayTimeoutMs,
          maxTokens: dayMaxTokens,
          promptChars,
          plannerContractVersion,
          recoveryMode: 'draft_day',
          usedTextRecovery: usedDayTextRecovery,
          dayCount: completedDraft.days.length,
          totalStops: completedDraft.days.reduce((sum, day) => sum + day.stops.length, 0),
          dayPromptVariant,
          salvagedStopCount: salvagedStopCount ?? parsedDay.stops.length,
          requiredMealRecovered: requiredMealRecovered ?? parsedDay.stops.some((stop) => stop.role === 'meal'),
          completedDayCount,
          continuedToNextDayInSameStream: false,
          pauseAfterDayCompletion: false,
          plannerStrategy,
          pathType: resolvePlannerPathType(plannerStrategy),
          fallbackTriggered: plannerStrategy === 'micro_day_split',
          fallbackReason: plannerStrategy === 'micro_day_split'
            ? 'resumed_micro_day_split'
            : undefined,
          currentStrategy: resolveNextDraftGenerateHarnessState(ctx, {
            plannerStrategy,
            substage: 'day_parse',
            nextDayIndex: targetDay.day,
          }).currentStrategy,
          strategyEscalationCount: resolveNextDraftGenerateHarnessState(ctx, {
            plannerStrategy,
            substage: 'day_parse',
            nextDayIndex: targetDay.day,
          }).strategyEscalationCount,
          recoveryCount: resolveNextDraftGenerateHarnessState(ctx, {
            plannerStrategy,
            substage: 'day_parse',
            nextDayIndex: targetDay.day,
          }).recoveryCount,
          pauseCount: resolveNextDraftGenerateHarnessState(ctx, {
            plannerStrategy,
            substage: 'day_parse',
            nextDayIndex: targetDay.day,
          }).pauseCount,
          sameErrorRecurrenceCount: resolveNextDraftGenerateHarnessState(ctx, {
            plannerStrategy,
            substage: 'day_parse',
            nextDayIndex: targetDay.day,
          }).sameErrorRecurrenceCount,
          pipelineContextPatch: {
            ...clearDraftGenerateResumePatch(),
            finalDraftStrategySummary: buildFinalDraftStrategySummary(resolveNextDraftGenerateHarnessState(ctx, {
              plannerStrategy,
              substage: 'day_parse',
              nextDayIndex: targetDay.day,
            })),
          },
          sessionPatch: {
            plannerSeed: null,
            plannerDayOutline: null,
            plannerDayChunks: null,
          },
        },
      };
    }

    return buildPauseResult(ctx, {
      start,
      substage: 'day_parse',
      resumeSubstage: 'day_request',
      timeoutMs: dayTimeoutMs,
      maxTokens: dayMaxTokens,
      promptChars,
      plannerAttempt: 1,
      pauseReason: 'runtime_budget_exhausted',
      checkpointCursor: `draft_generate:day_request:${nextDayIndex}`,
      plannerSeed,
      plannerDraft,
      nextDayIndex,
      dayAttempt: 1,
      usedTextRecovery: usedDayTextRecovery,
      dayPromptVariant,
      salvagedStopCount: salvagedStopCount ?? parsedDay.stops.length,
      requiredMealRecovered: requiredMealRecovered ?? parsedDay.stops.some((stop) => stop.role === 'meal'),
      completedDayCount,
      continuedToNextDayInSameStream: false,
      pauseAfterDayCompletion: true,
      plannerStrategy,
      resetHarnessState: true,
      finalDraftStrategySummary: buildFinalDraftStrategySummary(resolveNextDraftGenerateHarnessState(ctx, {
        plannerStrategy,
        substage: 'day_parse',
        nextDayIndex: targetDay.day,
      })),
    });
  }

  const completedDraft = mergeSeedAndDraft(plannerSeed, plannerDraft);
  if (!completedDraft) {
    return buildTerminalFailureResult(ctx, {
      start,
      substage: 'day_parse',
      timeoutMs: 0,
      maxTokens: 0,
      promptChars: 0,
      errorCode: 'draft_generation_invalid_output',
      warningCode: 'draft_generation_invalid_output',
      rootCause: 'incomplete_planner_draft',
      plannerSeed,
      plannerDraft,
      nextDayIndex,
    });
  }

  return {
    outcome: 'completed',
    data: completedDraft,
    warnings: [],
    durationMs: Date.now() - start,
    metadata: {
      substage: 'day_parse',
      selectedTimeoutMs: 0,
      maxTokens: 0,
      promptChars: 0,
      plannerContractVersion,
      recoveryMode: 'draft_day',
      usedTextRecovery: false,
      dayCount: completedDraft.days.length,
      totalStops: completedDraft.days.reduce((sum, day) => sum + day.stops.length, 0),
      plannerStrategy,
      pathType: resolvePlannerPathType(plannerStrategy),
      fallbackTriggered: plannerStrategy === 'micro_day_split',
      fallbackReason: plannerStrategy === 'micro_day_split'
        ? 'resumed_micro_day_split'
        : undefined,
      pipelineContextPatch: {
        ...clearDraftGenerateResumePatch(),
        finalDraftStrategySummary: buildFinalDraftStrategySummary(resolveNextDraftGenerateHarnessState(ctx, {
          plannerStrategy,
          substage: 'day_parse',
          nextDayIndex: plannerSeed.days.length,
        })),
      },
      sessionPatch: {
        plannerSeed: null,
        plannerDayOutline: null,
        plannerDayChunks: null,
      },
    },
  };
}
