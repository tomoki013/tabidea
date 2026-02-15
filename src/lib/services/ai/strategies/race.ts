/**
 * Race戦略
 * 両モデルに同時にリクエストし、スコアリングでベストを選択
 */

import { generateObject } from 'ai';
import { resolveModelForProvider, type ProviderName } from '../model-provider';
import { PlanOutlineSchema } from '../schemas/itinerary-schemas';
import type { PlanOutline, PlanOutlineDay } from '@/types';

// ============================================
// Types
// ============================================

export interface RaceResult {
  /** 勝者のOutline */
  winner: PlanOutline;
  /** 勝者のプロバイダ */
  winnerProvider: ProviderName;
  /** 敗者のプロバイダ（Cross-Reviewに使用） */
  loserProvider: ProviderName;
  /** スコア詳細 */
  scores: {
    gemini: number | null;
    openai: number | null;
  };
}

// ============================================
// Scoring Functions
// ============================================

/**
 * Outlineの品質をルールベースでスコアリング (0-100)
 */
export function scoreOutline(outline: PlanOutline): number {
  let score = 0;
  const days = outline.days;

  if (!days || days.length === 0) return 0;

  // 1. エリア多様性: 重複なし → +20
  const allAreas = days.flatMap(d => d.highlight_areas);
  const uniqueAreas = new Set(allAreas);
  const diversityRatio = allAreas.length > 0 ? uniqueAreas.size / allAreas.length : 0;
  score += Math.round(diversityRatio * 20);

  // 2. description品質: 文字数50以上、かつ具体的 → +20
  const descLength = outline.description?.length || 0;
  if (descLength >= 100) {
    score += 20;
  } else if (descLength >= 50) {
    score += 15;
  } else if (descLength >= 20) {
    score += 10;
  }

  // 3. 地理的連続性: overnight_locationの整合性 → +30
  let continuityScore = 30;
  for (let i = 0; i < days.length - 1; i++) {
    const currentOvernight = days[i].overnight_location;
    if (!currentOvernight) {
      continuityScore -= 10;
    }
  }
  score += Math.max(0, continuityScore);

  // 4. overnight_location完備 → +30
  const overnightCount = days.filter(d => d.overnight_location && d.overnight_location.length > 0).length;
  const overnightRatio = overnightCount / days.length;
  score += Math.round(overnightRatio * 30);

  return Math.min(100, score);
}

// ============================================
// Race Execution
// ============================================

/**
 * 両プロバイダでOutlineを並列生成し、ベストを選択
 */
export async function raceOutline(
  prompt: string,
  temperature: number,
): Promise<RaceResult> {
  console.log('[race] Starting parallel outline generation...');
  const startTime = Date.now();

  const providers: ProviderName[] = ['gemini', 'openai'];

  const generateForProvider = async (provider: ProviderName): Promise<PlanOutline> => {
    const { model, modelName } = resolveModelForProvider(provider, 'itinerary', {
      structuredOutputs: true,
    });
    console.log(`[race] ${provider} generating with model: ${modelName}`);

    const { object } = await generateObject({
      model,
      schema: PlanOutlineSchema,
      prompt,
      temperature,
    });

    // Normalize
    const normalizedDays = object.days.map((day, index) => ({
      ...day,
      travel_method_to_next:
        index === object.days.length - 1 ? undefined :
        (day.travel_method_to_next ?? undefined),
    }));

    return {
      destination: object.destination,
      description: object.description,
      days: normalizedDays as PlanOutlineDay[],
    };
  };

  // Run both in parallel
  const results = await Promise.allSettled(
    providers.map(provider => generateForProvider(provider))
  );

  const geminiResult = results[0];
  const openaiResult = results[1];

  const geminiOutline = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
  const openaiOutline = openaiResult.status === 'fulfilled' ? openaiResult.value : null;

  if (geminiResult.status === 'rejected') {
    console.warn('[race] Gemini failed:', geminiResult.reason);
  }
  if (openaiResult.status === 'rejected') {
    console.warn('[race] OpenAI failed:', openaiResult.reason);
  }

  // Score both
  const geminiScore = geminiOutline ? scoreOutline(geminiOutline) : null;
  const openaiScore = openaiOutline ? scoreOutline(openaiOutline) : null;

  console.log(`[race] Scores - Gemini: ${geminiScore}, OpenAI: ${openaiScore}`);

  // Pick winner
  let winner: PlanOutline;
  let winnerProvider: ProviderName;
  let loserProvider: ProviderName;

  if (geminiOutline && openaiOutline) {
    // Both succeeded - pick higher score
    if ((geminiScore || 0) >= (openaiScore || 0)) {
      winner = geminiOutline;
      winnerProvider = 'gemini';
      loserProvider = 'openai';
    } else {
      winner = openaiOutline;
      winnerProvider = 'openai';
      loserProvider = 'gemini';
    }
  } else if (geminiOutline) {
    winner = geminiOutline;
    winnerProvider = 'gemini';
    loserProvider = 'openai';
  } else if (openaiOutline) {
    winner = openaiOutline;
    winnerProvider = 'openai';
    loserProvider = 'gemini';
  } else {
    throw new Error('Both providers failed in race strategy');
  }

  const elapsed = Date.now() - startTime;
  console.log(`[race] Winner: ${winnerProvider} (score: ${winnerProvider === 'gemini' ? geminiScore : openaiScore}) in ${elapsed}ms`);

  return {
    winner,
    winnerProvider,
    loserProvider,
    scores: {
      gemini: geminiScore,
      openai: openaiScore,
    },
  };
}
