/**
 * Pass D: Local Repair
 * 評価で指摘された違反を修復するために、特定の日/ストップを AI で再生成する。
 * 1 回の呼び出しで 1 修復イテレーション。ループは executor + state machine が制御。
 */

import { randomUUID } from 'crypto';
import type {
  PassContext,
  PassResult,
  DraftPlan,
  DraftDay,
  DraftStop,
  RepairTarget,
  RepairUnit,
  RepairRecord,
} from '@/types/plan-generation';
import { buildContextSandwich } from '@/lib/services/ai/prompt-builder';
import { PassExecutionError } from '../errors';
import { draftPlanLlmSchema } from '../schemas/draft-plan-schema';

// ============================================
// Repair Target Selection
// ============================================

/**
 * 修復すべきターゲットを選択 (既に修復済みの日は除外)
 */
function selectRepairTarget(
  targets: RepairTarget[],
  repairHistory: { unit: RepairUnit }[],
): RepairTarget | null {
  // 既に修復した日を集める
  const repairedDays = new Set(
    repairHistory
      .filter((r) => r.unit.type === 'day')
      .map((r) => (r.unit as { type: 'day'; day: number }).day),
  );

  for (const target of targets) {
    if (target.scope.type === 'day' && repairedDays.has(target.scope.day)) {
      continue;
    }
    return target;
  }

  // 全ターゲットが修復済み → 最優先のものを再修復
  return targets[0] ?? null;
}

/**
 * RepairTarget.scope → RepairUnit 変換
 */
function scopeToRepairUnit(target: RepairTarget): RepairUnit {
  switch (target.scope.type) {
    case 'day':
      return { type: 'day', day: target.scope.day };
    case 'stop':
      return { type: 'stop_cluster', day: target.scope.day, draftIds: [target.scope.draftId] };
    case 'cluster':
      return { type: 'stop_cluster', day: target.scope.day, draftIds: target.scope.draftIds };
    case 'plan':
      return { type: 'day', day: 1 }; // plan-level → worst day (最初に修復)
  }
}

// ============================================
// Repair Prompt
// ============================================

function buildRepairPrompt(
  targetDay: DraftDay,
  target: RepairTarget,
  plan: DraftPlan,
): string {
  const parts: string[] = [];

  parts.push(`## 修復指示`);
  parts.push(`以下の旅程の ${targetDay.day} 日目を改善してください。`);
  parts.push(`旅行先: ${plan.destination}`);
  parts.push(`テーマ: ${plan.themes.join(', ')}`);
  parts.push('');

  parts.push(`## 現在の ${targetDay.day} 日目`);
  parts.push(`タイトル: ${targetDay.title}`);
  parts.push(`エリア: ${targetDay.mainArea}`);
  parts.push(`ストップ数: ${targetDay.stops.length}`);
  for (const stop of targetDay.stops) {
    parts.push(`  - ${stop.name} (${stop.role}, ${stop.timeSlotHint}, ${stop.stayDurationMinutes}分)`);
  }
  parts.push('');

  parts.push(`## 指摘された問題`);
  for (const v of target.violations) {
    parts.push(`- [${v.severity}] ${v.message}`);
    if (v.suggestedFix) {
      parts.push(`  → 修正案: ${v.suggestedFix}`);
    }
  }
  parts.push('');

  parts.push(`## 要件`);
  parts.push(`- 上記の問題を解決する改善版の旅程全体を出力してください`);
  parts.push(`- ${targetDay.day} 日目のストップを改善・入れ替えて問題を解消すること`);
  parts.push(`- 他の日は変更せずそのまま返すこと`);
  parts.push(`- must_visit のストップは絶対に削除しないこと`);
  parts.push(`- 各ストップの aiConfidence は正直に評価すること`);

  return parts.join('\n');
}

// ============================================
// Merge Logic
// ============================================

/**
 * 修復された日を元の DraftPlan にマージ
 */
function mergeDraftPlan(
  original: DraftPlan,
  repairedDays: DraftDay[],
  targetDayNum: number,
): DraftPlan {
  // LLM が返した結果から target day を見つける
  const repairedDay = repairedDays.find(d => d.day === targetDayNum);
  if (!repairedDay) {
    return original; // 修復対象が見つからなかった → 変更なし
  }

  // 新しい draftId を付与
  const dayWithIds: DraftDay = {
    ...repairedDay,
    stops: repairedDay.stops.map(stop => ({
      ...stop,
      draftId: randomUUID(),
    } satisfies DraftStop)),
  };

  return {
    ...original,
    days: original.days.map(d =>
      d.day === targetDayNum ? dayWithIds : d,
    ),
  };
}

// ============================================
// Language Model Resolution (shared pattern)
// ============================================

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

// ============================================
// Pass Implementation
// ============================================

export async function localRepairPass(ctx: PassContext): Promise<PassResult<DraftPlan>> {
  const start = Date.now();

  const { draftPlan, evaluationReport, repairHistory } = ctx.session;
  if (!draftPlan || !evaluationReport) {
    return {
      outcome: 'failed_terminal',
      warnings: ['Missing draftPlan or evaluationReport for repair'],
      durationMs: Date.now() - start,
    };
  }

  // 修復ターゲット選択
  const target = selectRepairTarget(evaluationReport.repairTargets, repairHistory);
  if (!target) {
    return {
      outcome: 'completed',
      data: draftPlan,
      warnings: ['No repair targets found — passing through unchanged'],
      durationMs: Date.now() - start,
    };
  }

  const repairUnit = scopeToRepairUnit(target);
  const targetDayNum = repairUnit.type === 'day'
    ? repairUnit.day
    : repairUnit.type === 'stop_cluster'
      ? repairUnit.day
      : 1;

  const targetDay = draftPlan.days.find(d => d.day === targetDayNum);
  if (!targetDay) {
    return {
      outcome: 'failed_terminal',
      warnings: [`Repair target day ${targetDayNum} not found in draft plan`],
      durationMs: Date.now() - start,
    };
  }

  const userPrompt = buildRepairPrompt(targetDay, target, draftPlan);
  const { systemInstruction } = buildContextSandwich({
    context: [],
    userPrompt,
    generationType: 'semanticPlan',
  });

  const provider = ctx.session.generationProfile?.provider ?? 'gemini';
  const modelName = ctx.session.generationProfile?.modelName ?? 'gemini-2.5-flash';
  const temperature = ctx.session.generationProfile?.temperature ?? 0.5;

  try {
    const model = await resolveLanguageModel(provider, modelName);
    const { generateObject } = await import('ai');

    const result = await generateObject({
      model,
      schema: draftPlanLlmSchema,
      system: systemInstruction,
      prompt: userPrompt,
      temperature,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(60_000),
    });

    const repairedDays = result.object.days.map(d => ({
      ...d,
      stops: d.stops.map(s => ({
        ...s,
        draftId: '', // will be overwritten by mergeDraftPlan
      } satisfies DraftStop)),
    } satisfies DraftDay));

    const repairedPlan = mergeDraftPlan(draftPlan, repairedDays, targetDayNum);

    const repairRecord: RepairRecord = {
      iteration: repairHistory.length + 1,
      unit: repairUnit,
      beforeScore: evaluationReport.overallScore,
      afterScore: 0, // will be filled by next rule_score pass
      durationMs: Date.now() - start,
      improved: false, // will be updated after re-scoring
      timestamp: new Date().toISOString(),
    };

    return {
      outcome: 'completed',
      data: repairedPlan,
      warnings: [`Repaired day ${targetDayNum}: ${target.violations.length} violations targeted`],
      durationMs: Date.now() - start,
      metadata: {
        repairRecord,
        targetDayNum,
        violationCount: target.violations.length,
      },
    };
  } catch (err) {
    if (err instanceof Error && /abort|timeout|timed out/i.test(err.message)) {
      return {
        outcome: 'needs_retry',
        warnings: [`Repair generation timed out: ${err.message}`],
        durationMs: Date.now() - start,
      };
    }

    throw new PassExecutionError('local_repair', err instanceof Error ? err.message : String(err), err);
  }
}
