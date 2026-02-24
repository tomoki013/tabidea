/**
 * ReplanEngine — リプラン処理のメインエンジン
 *
 * 1. 影響スロットを特定
 * 2. Hard Constraints を収集
 * 3. AI 代替案を生成（Flash モデル, 2秒タイムアウト）
 * 4. scoreHumanResolution() で各オプションをスコアリング
 * 5. スコア順にソートし primary + alternatives を返却
 * 6. 体験志向の説明文を生成
 */

import type {
  PlanSlot,
  RecoveryCategory,
  RecoveryOption,
  ReplanResult,
  ReplanTrigger,
  ScoreBreakdown,
  TravelerState,
  TripContext,
  TripPlan,
} from "@/types/replan";

import { generateExplanation } from "./explanation-generator";
import { scoreHumanResolution } from "./scoring/score-human-resolution";
import type { HumanResolutionInput } from "./scoring/types";

// ============================================================================
// Types
// ============================================================================

/** AI プロバイダーの抽象化（テスト時にモック可能） */
export interface ReplanAIProvider {
  generateAlternatives(
    trigger: ReplanTrigger,
    affectedSlots: PlanSlot[],
    context: TripContext,
    signal?: AbortSignal
  ): Promise<RecoveryOption[]>;
}

// ============================================================================
// Constants
// ============================================================================

/** AI 生成のタイムアウト (ms) */
const AI_GENERATION_TIMEOUT_MS = 2000;

/** 全体処理のタイムアウト (ms) */
export const REPLAN_TOTAL_TIMEOUT_MS = 3000;

/** 返却する alternatives の最大数 */
const MAX_ALTERNATIVES = 3;

// ============================================================================
// Fallback Provider
// ============================================================================

/**
 * AI がタイムアウトした場合のフォールバック代替案。
 * カテゴリを変えて3つの汎用オプションを返す。
 */
function buildFallbackOptions(
  trigger: ReplanTrigger,
  affectedSlots: PlanSlot[]
): RecoveryOption[] {
  const categories: RecoveryCategory[] = ["indoor", "food", "rest"];
  return categories.map((category, i) => ({
    id: `fallback-${i}`,
    replacementSlots: affectedSlots.map((slot) => ({
      ...slot,
      id: `fallback-slot-${i}-${slot.id}`,
    })),
    explanation: generateExplanation(trigger.type, category),
    estimatedDuration: "1時間",
    category,
  }));
}

// ============================================================================
// ReplanEngine
// ============================================================================

export class ReplanEngine {
  private aiProvider?: ReplanAIProvider;

  constructor(aiProvider?: ReplanAIProvider) {
    this.aiProvider = aiProvider;
  }

  /**
   * リプランを実行する。
   *
   * @param trigger - リプラントリガー
   * @param tripPlan - 現在の旅行プラン
   * @param state - 旅行者の現在状態
   * @param context - 旅行コンテキスト
   * @returns ReplanResult
   */
  async replan(
    trigger: ReplanTrigger,
    tripPlan: TripPlan,
    state: TravelerState,
    context: TripContext
  ): Promise<ReplanResult> {
    const startTime = performance.now();

    // 1. 影響スロットを特定
    const affectedSlots = this.findAffectedSlots(trigger, tripPlan);

    // 2. AI 代替案を生成 (2秒タイムアウト)
    let options: RecoveryOption[];
    try {
      options = await this.generateWithTimeout(
        trigger,
        affectedSlots,
        context
      );
    } catch {
      // タイムアウトまたはエラー → フォールバック
      options = buildFallbackOptions(trigger, affectedSlots);
    }

    // フォールバック保証
    if (options.length === 0) {
      options = buildFallbackOptions(trigger, affectedSlots);
    }

    // 3. 各オプションをスコアリング
    const scored = options.map((option) => {
      const input: HumanResolutionInput = {
        context,
        state,
        option,
        mode: trigger.type,
      };
      const scoreBreakdown = scoreHumanResolution(input);
      return { option, scoreBreakdown };
    });

    // 4. スコア順にソート（hardPass=false は最後尾）
    scored.sort((a, b) => {
      if (a.scoreBreakdown.hardPass !== b.scoreBreakdown.hardPass) {
        return a.scoreBreakdown.hardPass ? -1 : 1;
      }
      return b.scoreBreakdown.total - a.scoreBreakdown.total;
    });

    // hardPass=true のもののみ採用
    const validOptions = scored.filter((s) => s.scoreBreakdown.hardPass);

    // 全滅した場合はフォールバックの先頭を使用
    const primary = validOptions[0] ?? scored[0];
    const alternatives = validOptions
      .slice(1, MAX_ALTERNATIVES + 1)
      .map((s) => s.option);

    const processingTimeMs = Math.round(performance.now() - startTime);

    return {
      primaryOption: primary.option,
      alternatives,
      scoreBreakdown: primary.scoreBreakdown,
      explanation: primary.option.explanation,
      processingTimeMs,
    };
  }

  // ============================================================================
  // Private
  // ============================================================================

  private findAffectedSlots(
    trigger: ReplanTrigger,
    tripPlan: TripPlan
  ): PlanSlot[] {
    const triggerSlot = tripPlan.slots.find((s) => s.id === trigger.slotId);
    if (!triggerSlot) return [];

    // トリガースロット以降の同日スロットを影響範囲とする
    return tripPlan.slots.filter(
      (s) =>
        s.dayNumber === triggerSlot.dayNumber &&
        s.slotIndex >= triggerSlot.slotIndex &&
        s.isSkippable
    );
  }

  private async generateWithTimeout(
    trigger: ReplanTrigger,
    affectedSlots: PlanSlot[],
    context: TripContext
  ): Promise<RecoveryOption[]> {
    if (!this.aiProvider) {
      return buildFallbackOptions(trigger, affectedSlots);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      AI_GENERATION_TIMEOUT_MS
    );

    try {
      return await this.aiProvider.generateAlternatives(
        trigger,
        affectedSlots,
        context,
        controller.signal
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
