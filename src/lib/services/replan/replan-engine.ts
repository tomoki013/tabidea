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
  TravelerState,
  TripContext,
  TripPlan,
} from "@/types/replan";

import { classifyActivity } from "@/lib/utils/activity-classifier";
import { generateExplanation } from "./explanation-generator";
import { scoreHumanResolution } from "./scoring/score-human-resolution";
import type { HumanResolutionInput } from "./scoring/types";
import { createReplanTranslator } from "./i18n";

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
const AI_GENERATION_TIMEOUT_MS = 5000;

/** 全体処理のタイムアウト (ms) */
export const REPLAN_TOTAL_TIMEOUT_MS = 8000;

/** 返却する alternatives の最大数 */
const MAX_ALTERNATIVES = 3;

// ============================================================================
// Fallback Provider
// ============================================================================

/**
 * AI がタイムアウトした場合のフォールバック代替案。
 * カテゴリを変えて3つの汎用オプションを返す。
 * 各スロットに個別のアクティビティ名を割り当てる。
 */
function buildFallbackOptions(
  trigger: ReplanTrigger,
  affectedSlots: PlanSlot[],
  locale?: string
): RecoveryOption[] {
  const t = createReplanTranslator(locale);
  const fallbackActivities: Record<RecoveryCategory, string[]> = {
    indoor: t.raw("fallbackActivities.indoor") as string[],
    food: t.raw("fallbackActivities.food") as string[],
    rest: t.raw("fallbackActivities.rest") as string[],
    outdoor: t.raw("fallbackActivities.outdoor") as string[],
    culture: t.raw("fallbackActivities.culture") as string[],
  };

  const categories: RecoveryCategory[] = ["indoor", "food", "rest"];
  return categories.map((category, i) => {
    const activityNames = fallbackActivities[category];
    return {
      id: `fallback-${i}`,
      replacementSlots: affectedSlots.map((slot, j) => ({
        ...slot,
        id: `fallback-slot-${i}-${slot.id}`,
        activity: {
          ...slot.activity,
          activity: activityNames[j % activityNames.length],
          description: generateExplanation(trigger.type, category, undefined, locale),
        },
      })),
      explanation: generateExplanation(trigger.type, category, undefined, locale),
      estimatedDuration: t("estimatedDurationHours", {
        count: affectedSlots.length,
      }),
      category,
    };
  });
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
    const locale = context.language;
    const startTime = performance.now();

    // 1. 影響スロットを特定
    const affectedSlots = this.findAffectedSlots(trigger, tripPlan, locale);

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
      options = buildFallbackOptions(trigger, affectedSlots, locale);
    }

    // フォールバック保証
    if (options.length === 0) {
      options = buildFallbackOptions(trigger, affectedSlots, locale);
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
    tripPlan: TripPlan,
    locale?: string
  ): PlanSlot[] {
    // Handle "day-N-current" format from UI (e.g., "day-1-current")
    const currentMatch = trigger.slotId.match(/^day-(\d+)-current$/);
    if (currentMatch) {
      const dayNumber = parseInt(currentMatch[1], 10);
      const daySlots = tripPlan.slots.filter(
        (s) => s.dayNumber === dayNumber && s.isSkippable
      );
      const candidates = daySlots.length > 0 ? daySlots : tripPlan.slots.filter(
        (s) => s.dayNumber === dayNumber
      );
      // トリガー種別に基づいて影響範囲を絞り込む
      return this.filterByTriggerType(trigger.type, candidates, locale);
    }

    const triggerSlot = tripPlan.slots.find((s) => s.id === trigger.slotId);
    if (!triggerSlot) return [];

    // トリガースロット以降の同日スロットを対象とする
    const candidates = tripPlan.slots.filter(
      (s) =>
        s.dayNumber === triggerSlot.dayNumber &&
        s.slotIndex >= triggerSlot.slotIndex &&
        s.isSkippable
    );

    return this.filterByTriggerType(trigger.type, candidates, locale);
  }

  /**
   * トリガー種別に基づいてスロットをフィルタリング。
   * 全てフィルタされた場合はフォールバックとして全候補を返す。
   */
  private filterByTriggerType(
    triggerType: string,
    candidates: PlanSlot[],
    locale?: string
  ): PlanSlot[] {
    const t = createReplanTranslator(locale);

    const filtered = candidates.filter((slot) => {
      const classification = classifyActivity(
        slot.activity.activity,
        slot.activity.description,
        slot.activity.activityType
      );

      switch (triggerType) {
        case "rain":
          // 雨: 屋外系のスポットのみ影響。レストラン・屋内施設はそのまま
          return this.isOutdoorActivity(slot.activity, classification.category, t);
        case "fatigue":
          // 疲労: 体力を使うアクティビティのみ影響。食事・休憩はそのまま
          return this.isPhysicalActivity(slot.activity, classification.category, t);
        case "delay":
          // 遅延: 必須でないアクティビティのみ影響。予約済みはそのまま
          return slot.priority !== "must" && !slot.activity.isLocked;
        default:
          return true;
      }
    });

    // フィルタ結果が空の場合、全候補を返す（フォールバック）
    return filtered.length > 0 ? filtered : candidates;
  }

  /** 屋外アクティビティかどうかを判定 */
  private isOutdoorActivity(
    activity: PlanSlot["activity"],
    category: string,
    t: ReturnType<typeof createReplanTranslator>
  ): boolean {
    const name = activity.activity.toLowerCase();
    const desc = (activity.description || "").toLowerCase();
    const combined = `${name} ${desc}`;

    // 明確に屋内のキーワード → 影響なし
    const indoorKeywords = t.raw("keywords.indoor") as string[];
    if (indoorKeywords.some((kw) => combined.includes(kw))) {
      return false;
    }

    // 食事カテゴリ → 影響なし
    if (category === "restaurant") return false;

    // 明確に屋外のキーワード → 影響あり
    const outdoorKeywords = t.raw("keywords.outdoor") as string[];
    if (outdoorKeywords.some((kw) => combined.includes(kw))) {
      return true;
    }

    // 観光スポットはデフォルトで屋外とみなす
    if (category === "sightseeing") return true;

    return true;
  }

  /** 体力を使うアクティビティかどうかを判定 */
  private isPhysicalActivity(
    activity: PlanSlot["activity"],
    category: string,
    t: ReturnType<typeof createReplanTranslator>
  ): boolean {
    const name = activity.activity.toLowerCase();
    const desc = (activity.description || "").toLowerCase();
    const combined = `${name} ${desc}`;

    // 食事・休憩系 → 影響なし
    const restKeywords = t.raw("keywords.rest") as string[];
    if (restKeywords.some((kw) => combined.includes(kw))) {
      return false;
    }
    if (category === "restaurant") return false;

    // 体力を使うキーワード → 影響あり
    const physicalKeywords = t.raw("keywords.physical") as string[];
    if (physicalKeywords.some((kw) => combined.includes(kw))) {
      return true;
    }

    // 観光スポットは中程度の体力を使う
    if (category === "sightseeing") return true;

    return false;
  }

  private async generateWithTimeout(
    trigger: ReplanTrigger,
    affectedSlots: PlanSlot[],
    context: TripContext
  ): Promise<RecoveryOption[]> {
    if (!this.aiProvider) {
      return buildFallbackOptions(trigger, affectedSlots, context.language);
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
