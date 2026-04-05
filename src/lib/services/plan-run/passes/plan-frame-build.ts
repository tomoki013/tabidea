/**
 * Pass 2: plan_frame_build
 * trip/city/day の骨格生成 (Gemini AI)
 * 設計書 §4.2 pass 2
 *
 * 深夜出発・早朝帰着を operational travel window として扱う。
 * 都市順を確定し、immutable zone として固定する。
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import type { PlanRunPassContext, PlanRunPassResult, PlanFrame, PlanFrameCity, PlanFrameDay } from '@/types/plan-run';
import { resolveModel } from '@/lib/services/ai/model-provider';
import { FRAME_BUILD_TIMEOUT_MS } from '../constants';

// ============================================
// LLM Output Schema
// ============================================

const frameDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  mainArea: z.string().min(1),
  overnightLocation: z.string().min(1),
  dayKind: z.enum(['arrival', 'full', 'departure', 'transit']),
});

const frameCitySchema = z.object({
  cityId: z.string().min(1),
  cityName: z.string().min(1),
  cityOrder: z.number().int().min(1),
  days: z.array(frameDaySchema).min(1),
});

const planFrameSchema = z.object({
  primaryDestination: z.string().min(1),
  title: z.string().min(1),
  destinations: z.array(z.string().min(1)).min(1),
  durationDays: z.number().int().min(1),
  cities: z.array(frameCitySchema).min(1),
});

// ============================================
// Prompt Builder
// ============================================

function buildFramePrompt(
  destinations: string[],
  durationDays: number,
  companions: string,
  themes: string[],
  mustVisitPlaces: string[],
  fixedTransports: { date?: string; from?: string; to?: string; notes?: string }[],
  hardConstraints: string[],
  language: string,
): { system: string; prompt: string } {
  const system = `あなたは旅行計画の骨格設計を行う専門家です。
ユーザーの入力に基づき、旅行の構造的な骨格（目的地・都市順・日割り）を生成してください。

重要なルール:
- 都市順は一度確定したら後から変えない
- 各 day には必ず mainArea (その日の主要エリア) と overnightLocation (宿泊地) を設定する
- dayKind: arrival = 移動・到着メイン, full = 観光メイン, departure = 帰国・出発メイン, transit = 都市間移動メイン
- 複数都市の場合、都市ごとに分けて days を配置する
- 出力は JSON のみ。説明文不要。`;

  const destStr = destinations.join('、');
  const themeStr = themes.length > 0 ? `テーマ: ${themes.join('、')}` : '';
  const mustStr = mustVisitPlaces.length > 0 ? `必ず訪れる場所: ${mustVisitPlaces.join('、')}` : '';
  const constraintStr = hardConstraints.length > 0
    ? `制約:\n${hardConstraints.map((c) => `- ${c}`).join('\n')}`
    : '';

  const prompt = `旅行先: ${destStr}
日数: ${durationDays}日
同行者: ${companions}
${themeStr}
${mustStr}
${constraintStr}
出力言語: ${language}

この旅行の骨格 (trip/city/day 構造) を生成してください。`;

  return { system, prompt };
}

// ============================================
// Pass Implementation
// ============================================

export async function planFrameBuildPass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<PlanFrame>> {
  const start = Date.now();
  const req = ctx.run.normalizedInput;

  if (!req) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['normalizedInput が存在しません'],
      durationMs: Date.now() - start,
    };
  }

  const { system, prompt } = buildFramePrompt(
    req.destinations,
    req.durationDays,
    req.companions,
    req.themes,
    req.mustVisitPlaces,
    req.fixedTransports,
    req.hardConstraints,
    req.outputLanguage,
  );

  const resolved = resolveModel('itinerary', {
    modelName: ctx.run.modelName,
  });

  const remainingMs = ctx.budget.remainingMs();
  const timeoutMs = Math.min(FRAME_BUILD_TIMEOUT_MS, remainingMs - 1_000);

  if (timeoutMs < 2_000) {
    return {
      outcome: 'partial',
      newState: 'paused',
      warnings: ['runtime_budget_exhausted'],
      durationMs: Date.now() - start,
      pauseContext: {
        pauseReason: 'runtime_budget_exhausted',
        resumePassId: 'plan_frame_build',
        pausedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const result = await generateObject({
      model: resolved.model,
      schema: planFrameSchema,
      system,
      prompt,
      temperature: 0.7,
      maxTokens: 4_096,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    const raw = result.object;

    // validate day count matches (strict — completion_gate も strict のため)
    const totalDays = raw.cities.reduce((acc: number, c) => acc + c.days.length, 0);
    if (totalDays !== req.durationDays) {
      console.error(`[plan_frame_build] day count mismatch: frame=${totalDays}, required=${req.durationDays}`);
      return {
        outcome: 'failed_terminal',
        newState: 'failed',
        warnings: [`frame の日数 (${totalDays}) が要求日数 (${req.durationDays}) と一致しません`],
        durationMs: Date.now() - start,
      };
    }

    const frame: PlanFrame = {
      primaryDestination: raw.primaryDestination,
      title: raw.title,
      destinations: raw.destinations,
      durationDays: req.durationDays,
      cities: raw.cities.map((c) => ({
        cityId: c.cityId,
        cityName: c.cityName,
        cityOrder: c.cityOrder,
        days: c.days.map((d) => ({
          dayNumber: d.dayNumber,
          mainArea: d.mainArea,
          overnightLocation: d.overnightLocation,
          dayKind: d.dayKind as PlanFrameDay['dayKind'],
        })),
      })) as PlanFrameCity[],
    };

    return {
      outcome: 'completed',
      data: frame,
      newState: 'frame_built',
      warnings: [],
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes('timeout') || message.includes('abort');

    // timeout は次の call でリトライすることで回復できるため、budget 残量に関わらず pause する。
    if (isTimeout) {
      return {
        outcome: 'partial',
        newState: 'paused',
        warnings: ['runtime_budget_exhausted'],
        durationMs: Date.now() - start,
        pauseContext: {
          pauseReason: 'runtime_budget_exhausted',
          resumePassId: 'plan_frame_build',
          pausedAt: new Date().toISOString(),
        },
      };
    }

    console.error('[plan_frame_build] failed:', message);
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: [`plan_frame_build failed: ${message}`],
      durationMs: Date.now() - start,
    };
  }
}
