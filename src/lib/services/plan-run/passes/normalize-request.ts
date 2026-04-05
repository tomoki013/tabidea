/**
 * Pass 1: normalize_request
 * UserInput → NormalizedPlanRunRequest
 * 純粋 TypeScript — LLM 不使用
 * 設計書 §4.2 pass 1
 */

import type { PlanRunPassContext, PlanRunPassResult, NormalizedPlanRunRequest, FixedTransport, FixedHotel } from '@/types/plan-run';
import type { UserInput } from '@/types/user-input';

function normalizeBudget(raw?: string): NormalizedPlanRunRequest['budgetLevel'] {
  if (!raw) return 'standard';
  const lower = raw.toLowerCase();
  if (['格安', '節約', 'budget', 'cheap'].some((k) => lower.includes(k))) return 'budget';
  if (['贅沢', 'ラグジュアリー', 'luxury', 'high-end'].some((k) => lower.includes(k))) return 'luxury';
  if (['少し贅沢', 'プレミアム', 'premium', 'expensive'].some((k) => lower.includes(k))) return 'premium';
  return 'standard';
}

function normalizePace(raw?: string): NormalizedPlanRunRequest['pace'] {
  if (!raw) return 'balanced';
  const lower = raw.toLowerCase();
  if (['ゆったり', 'のんびり', 'relaxed'].some((k) => lower.includes(k))) return 'relaxed';
  if (['アクティブ', '充実', 'active', 'たっぷり'].some((k) => lower.includes(k))) return 'active';
  return 'balanced';
}

/**
 * `dates` フィールド（例: "3日間", "2泊3日", "5/1〜5/5"）から日数を抽出
 */
function extractDurationDays(input: UserInput): number {
  const raw = input.dates;
  if (!raw) return 3;

  // ISO date range: "2024-05-01〜2024-05-05" — 最優先 (月日パターンの誤検出を防ぐ)
  const rangeMatch = /(\d{4}-\d{2}-\d{2})[^\d](\d{4}-\d{2}-\d{2})/.exec(raw);
  if (rangeMatch) {
    const startDate = new Date(rangeMatch[1]);
    const endDate = new Date(rangeMatch[2]);
    const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) return diff + 1;
  }

  // "2泊3日" — 泊数から逆算
  const nightsMatch = /(\d+)\s*泊/.exec(raw);
  if (nightsMatch) return parseInt(nightsMatch[1], 10) + 1;

  // "3日間" — 「間」が必須 ("5月1日" などの月日表記と区別)
  const daysKanMatch = /(\d+)\s*日間/.exec(raw);
  if (daysKanMatch) return parseInt(daysKanMatch[1], 10);

  // "3 days" / "3days"
  const daysEnMatch = /(\d+)\s*days?/i.exec(raw);
  if (daysEnMatch) return parseInt(daysEnMatch[1], 10);

  // fallback: extract any number
  const numMatch = /(\d+)/.exec(raw);
  if (numMatch) return parseInt(numMatch[1], 10);

  return 3;
}

function extractDestinations(input: UserInput): string[] {
  if (Array.isArray(input.destinations) && input.destinations.length > 0) {
    return input.destinations.filter(Boolean);
  }
  return [];
}

function extractMustVisit(input: UserInput): string[] {
  if (Array.isArray(input.mustVisitPlaces)) {
    return input.mustVisitPlaces.filter(Boolean);
  }
  return [];
}

function buildHardConstraints(req: Omit<NormalizedPlanRunRequest, 'hardConstraints' | 'softPreferences'>): string[] {
  const lines: string[] = [];
  if (req.destinations.length > 0) lines.push(`目的地: ${req.destinations.join(', ')}`);
  if (req.durationDays > 0) lines.push(`日数: ${req.durationDays}日`);
  if (req.mustVisitPlaces.length > 0) lines.push(`必ず訪れる: ${req.mustVisitPlaces.join(', ')}`);
  if (req.fixedTransports.length > 0) {
    for (const t of req.fixedTransports) {
      lines.push(`固定交通: ${t.type} ${t.name}${t.date ? ` (${t.date})` : ''}`);
    }
  }
  if (req.fixedHotels.length > 0) {
    for (const h of req.fixedHotels) {
      lines.push(`固定宿泊: ${h.name}`);
    }
  }
  return lines;
}

function buildSoftPreferences(input: UserInput, req: Pick<NormalizedPlanRunRequest, 'themes' | 'pace' | 'budgetLevel'>): string[] {
  const lines: string[] = [];
  if (req.themes.length > 0) lines.push(`テーマ: ${req.themes.join(', ')}`);
  lines.push(`ペース: ${req.pace}`);
  lines.push(`予算: ${req.budgetLevel}`);
  if (input.freeText) lines.push(`自由記述: ${input.freeText}`);
  return lines;
}

export async function normalizeRequestPass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<NormalizedPlanRunRequest>> {
  const start = Date.now();
  const input: UserInput | undefined = ctx.run.inputSnapshot;

  if (!input) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['inputSnapshot が存在しません'],
      durationMs: Date.now() - start,
    };
  }

  const destinations = extractDestinations(input);
  if (destinations.length === 0) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['destinations が空です'],
      durationMs: Date.now() - start,
    };
  }

  const durationDays = extractDurationDays(input);

  const TRANSPORT_TYPES = new Set<string>(['flight', 'train', 'bus', 'other']);
  const fixedTransports: FixedTransport[] =
    (input.fixedSchedule ?? [])
      .filter((s) => TRANSPORT_TYPES.has(s.type))
      .map((s) => ({
        type: s.type as FixedTransport['type'],
        name: s.name ?? '',
        date: s.date,
        time: s.time,
        from: s.from,
        to: s.to,
        notes: s.notes,
      }));

  const fixedHotels: FixedHotel[] =
    (input.fixedSchedule ?? [])
      .filter((s) => s.type === 'hotel')
      .map((s) => ({
        name: s.name ?? '',
        checkInDate: s.date,
        checkOutDate: s.checkoutDate,
        notes: s.notes,
      }));

  const base = {
    destinations,
    durationDays,
    startDate: undefined as string | undefined,
    companions: input.companions ?? 'solo',
    themes: Array.isArray(input.theme) ? input.theme : [],
    budgetLevel: normalizeBudget(input.budget),
    pace: normalizePace(input.pace),
    mustVisitPlaces: extractMustVisit(input),
    fixedTransports,
    fixedHotels,
    freeText: input.freeText ?? '',
    preferredTransport: Array.isArray(input.preferredTransport) ? input.preferredTransport : [],
    homeBaseCity: undefined as string | undefined,
    outputLanguage: 'ja',
  };

  const normalized: NormalizedPlanRunRequest = {
    ...base,
    hardConstraints: buildHardConstraints(base),
    softPreferences: buildSoftPreferences(input, base),
  };

  return {
    outcome: 'completed',
    data: normalized,
    newState: 'request_normalized',
    warnings: [],
    durationMs: Date.now() - start,
  };
}
