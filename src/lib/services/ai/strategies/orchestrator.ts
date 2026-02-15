/**
 * AI Strategy Orchestrator
 * 環境変数に基づいて適切な協調戦略を選択・実行
 *
 * Strategies:
 * - "full": Race + Pipeline + Cross-Review（デフォルト、OPENAI_API_KEY設定時）
 * - "single": 従来動作（1モデルのみ使用）
 */

import { isBothProvidersAvailable, getAlternateProvider, type ProviderName } from '../model-provider';
import { raceOutline, type RaceResult } from './race';
import { crossReviewOutline, crossReviewDayDetails } from './cross-review';
import { getPipelineProvider } from './pipeline';
import type { PlanOutline, DayPlan, Article } from '@/types';
import type { GeminiServiceOptions } from '../gemini';
import type { RequestComplexity, GenerationPhase } from '../model-selector';

// ============================================
// Types
// ============================================

export type AIStrategy = 'full' | 'single';

export interface OutlineStrategyResult {
  outline: PlanOutline;
  provider: ProviderName;
  reviewScore?: number;
}

export interface DetailsStrategyResult {
  days: DayPlan[];
  provider: ProviderName;
  reviewScore?: number;
}

// internal callback types for GeminiService delegation
export interface GenerateOutlineCallback {
  (prompt: string, context: Article[], complexity?: RequestComplexity, providerOverride?: ProviderName): Promise<PlanOutline>;
}

export interface GenerateDayDetailsCallback {
  (prompt: string, context: Article[], startDay: number, endDay: number, outlineDays: import('@/types').PlanOutlineDay[], startingLocation?: string, complexity?: RequestComplexity, providerOverride?: ProviderName): Promise<DayPlan[]>;
}

export interface ModifyItineraryCallback {
  (currentPlan: import('@/types').Itinerary, chatHistory: { role: string; text: string }[], providerOverride?: ProviderName): Promise<import('@/types').Itinerary>;
}

// ============================================
// Strategy Resolution
// ============================================

/**
 * 現在の戦略を取得
 * - AI_STRATEGY_ITINERARY=single → single
 * - OPENAI_API_KEY設定あり → full（デフォルト）
 * - OPENAI_API_KEY未設定 → single（フォールバック）
 */
export function getStrategy(): AIStrategy {
  const explicit = process.env.AI_STRATEGY_ITINERARY;
  if (explicit === 'single') return 'single';
  if (explicit === 'full') return 'full';
  // デフォルト: 両方のキーがあればfull
  if (isBothProvidersAvailable()) return 'full';
  return 'single';
}

// ============================================
// Outline Strategy
// ============================================

/**
 * Outline生成の戦略実行
 * - full: Race（並列生成）→ Cross-Review → 修正
 * - single: 従来のgenerateOutline
 */
export async function executeOutlineStrategy(
  prompt: string,
  context: Article[],
  complexity: RequestComplexity | undefined,
  generateOutlineFn: GenerateOutlineCallback,
  modifyFn: ModifyItineraryCallback | null,
): Promise<OutlineStrategyResult> {
  const strategy = getStrategy();
  console.log(`[orchestrator] Outline strategy: ${strategy}`);

  if (strategy === 'single') {
    const outline = await generateOutlineFn(prompt, context, complexity);
    return { outline, provider: 'gemini' };
  }

  // === Full Strategy: Race + Cross-Review ===

  // 1. Race: 両モデルで並列生成
  let raceResult: RaceResult;
  try {
    // Build the full prompt (same as GeminiService.generateOutline does)
    raceResult = await raceOutline(prompt, 0.3);
  } catch (error) {
    console.warn('[orchestrator] Race failed, falling back to single generation:', error);
    const outline = await generateOutlineFn(prompt, context, complexity);
    return { outline, provider: 'gemini' };
  }

  let finalOutline = raceResult.winner;
  let reviewScore: number | undefined;

  // 2. Cross-Review: 敗者モデルがレビュー
  try {
    const reviewResult = await crossReviewOutline(
      raceResult.winner,
      raceResult.loserProvider,
    );
    reviewScore = reviewResult.review.overallScore;

    // 3. criticalな指摘があれば修正
    if (reviewResult.hasCriticalIssues && reviewResult.correctionInstructions && modifyFn) {
      console.log('[orchestrator] Critical issues found, applying corrections...');
      const correctionHistory = [{
        role: 'user',
        text: `以下のレビュー結果に基づいて旅程を修正してください。criticalな問題のみ修正し、それ以外は変更しないでください。\n\n${reviewResult.correctionInstructions}`,
      }];

      try {
        // modifyFn expects an Itinerary, but we only have an outline.
        // We create a minimal itinerary wrapper for the correction.
        const minimalItinerary = {
          id: 'temp-correction',
          destination: finalOutline.destination,
          description: finalOutline.description,
          days: finalOutline.days.map(d => ({
            day: d.day,
            title: d.title,
            activities: [],
            highlight_areas: d.highlight_areas,
            overnight_location: d.overnight_location,
            travel_method_to_next: d.travel_method_to_next,
          })),
        } as any;

        const corrected = await modifyFn(minimalItinerary, correctionHistory, raceResult.winnerProvider);
        // Extract the corrected outline from the result
        if (corrected.destination && corrected.days) {
          finalOutline = {
            destination: corrected.destination,
            description: corrected.description || finalOutline.description,
            days: corrected.days.map((d: any, index: number) => ({
              day: d.day || index + 1,
              title: d.title || finalOutline.days[index]?.title || '',
              highlight_areas: d.highlight_areas || d.activities?.map((a: any) => a.activity) || finalOutline.days[index]?.highlight_areas || [],
              overnight_location: d.overnight_location || finalOutline.days[index]?.overnight_location || '',
              travel_method_to_next: d.travel_method_to_next,
            })),
          };
        }
        console.log('[orchestrator] Corrections applied successfully');
      } catch (correctionError) {
        console.warn('[orchestrator] Correction failed (non-blocking):', correctionError);
      }
    }
  } catch (reviewError) {
    console.warn('[orchestrator] Cross-review failed (non-blocking):', reviewError);
  }

  return {
    outline: finalOutline,
    provider: raceResult.winnerProvider,
    reviewScore,
  };
}

// ============================================
// Day Details Strategy
// ============================================

/**
 * DayDetails生成の戦略実行
 * - full: Pipeline（最適モデル選択）→ Cross-Review → 修正
 * - single: 従来のgenerateDayDetails
 */
export async function executeDetailsStrategy(
  prompt: string,
  context: Article[],
  startDay: number,
  endDay: number,
  outlineDays: import('@/types').PlanOutlineDay[],
  startingLocation: string | undefined,
  destination: string,
  complexity: RequestComplexity | undefined,
  generateDetailsFn: GenerateDayDetailsCallback,
  modifyFn: ModifyItineraryCallback | null,
): Promise<DetailsStrategyResult> {
  const strategy = getStrategy();
  console.log(`[orchestrator] Details strategy: ${strategy} (days ${startDay}-${endDay})`);

  if (strategy === 'single') {
    const days = await generateDetailsFn(prompt, context, startDay, endDay, outlineDays, startingLocation, complexity);
    return { days, provider: 'gemini' };
  }

  // === Full Strategy: Pipeline + Cross-Review ===

  // 1. Pipeline: 最適プロバイダでdetails生成
  const detailsProvider = getPipelineProvider('details');
  console.log(`[orchestrator] Pipeline: using ${detailsProvider} for details`);

  const days = await generateDetailsFn(prompt, context, startDay, endDay, outlineDays, startingLocation, complexity, detailsProvider);
  let finalDays = days;
  let reviewScore: number | undefined;

  // 2. Cross-Review: 別モデルがレビュー
  try {
    const reviewerProvider = getAlternateProvider(detailsProvider);
    const reviewResult = await crossReviewDayDetails(
      days,
      destination,
      reviewerProvider,
    );
    reviewScore = reviewResult.review.overallScore;

    // 3. criticalな指摘があれば修正
    if (reviewResult.hasCriticalIssues && reviewResult.correctionInstructions && modifyFn) {
      console.log('[orchestrator] Critical issues in details, applying corrections...');
      const correctionHistory = [{
        role: 'user',
        text: `以下の日程詳細のレビュー結果に基づいて修正してください。criticalな問題のみ修正してください。\n\n${reviewResult.correctionInstructions}`,
      }];

      try {
        const minimalItinerary = {
          id: 'temp-correction',
          destination,
          description: '',
          days: finalDays,
        } as any;

        const corrected = await modifyFn(minimalItinerary, correctionHistory, detailsProvider);
        if (corrected.days && corrected.days.length > 0) {
          finalDays = corrected.days;
          console.log('[orchestrator] Detail corrections applied successfully');
        }
      } catch (correctionError) {
        console.warn('[orchestrator] Detail correction failed (non-blocking):', correctionError);
      }
    }
  } catch (reviewError) {
    console.warn('[orchestrator] Details cross-review failed (non-blocking):', reviewError);
  }

  return {
    days: finalDays,
    provider: detailsProvider,
    reviewScore,
  };
}

// ============================================
// Modify Strategy
// ============================================

/**
 * 修正の戦略実行
 * - full: Pipeline（最適モデル選択）のみ（レビュー不要）
 * - single: 従来動作
 */
export function getModifyProvider(): ProviderName | undefined {
  const strategy = getStrategy();
  if (strategy === 'single') return undefined;
  return getPipelineProvider('modify');
}
