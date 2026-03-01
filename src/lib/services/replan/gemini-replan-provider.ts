/**
 * GeminiReplanProvider — Gemini Flash を使ったリプラン代替案生成
 *
 * ReplanAIProvider インターフェースを実装し、
 * Gemini Flash モデルで状況に応じた具体的な代替アクティビティを生成する。
 */

import { generateObject } from "ai";
import { z } from "zod";
import { resolveModelForProvider } from "@/lib/services/ai/model-provider";
import type { ReplanAIProvider } from "./replan-engine";
import type {
  ReplanTrigger,
  PlanSlot,
  TripContext,
  RecoveryOption,
  RecoveryCategory,
} from "@/types/replan";

// ============================================================================
// Schema for AI response
// ============================================================================

const ReplacementActivitySchema = z.object({
  time: z.string().describe("開始時刻 (HH:mm形式, 例: 14:00)"),
  name: z.string().describe("アクティビティ名（日本語、具体的なスポット名を含む）"),
  description: z.string().describe("アクティビティの詳細説明（日本語、体験志向で1-2文）"),
});

const AlternativeSchema = z.object({
  activities: z.array(ReplacementActivitySchema).min(1).max(6)
    .describe("代替スケジュール（元の予定に対応する形で、時系列順に）"),
  category: z.enum(["indoor", "outdoor", "rest", "food", "culture"]),
  summary: z.string().describe("この代替プランの概要説明（体験志向で1文）"),
  estimatedDuration: z.string().describe("全体の推定所要時間 (例: 3時間)"),
});

const ReplanResponseSchema = z.object({
  alternatives: z.array(AlternativeSchema).min(1).max(3),
});

// ============================================================================
// Trigger descriptions
// ============================================================================

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  rain: "雨が降っている（屋内アクティビティや雨でも楽しめる場所を提案）",
  fatigue: "旅行者が疲れている（休憩できる場所やリラックスできるアクティビティを提案）",
  delay: "スケジュールが遅延している（短時間で楽しめるアクティビティや近くのスポットを提案）",
};

// ============================================================================
// Provider
// ============================================================================

export class GeminiReplanProvider implements ReplanAIProvider {
  async generateAlternatives(
    trigger: ReplanTrigger,
    affectedSlots: PlanSlot[],
    context: TripContext,
    signal?: AbortSignal
  ): Promise<RecoveryOption[]> {
    const triggerDescription = TRIGGER_DESCRIPTIONS[trigger.type] || trigger.type;

    const affectedActivities = affectedSlots
      .map((s) => `- ${s.activity.time} ${s.activity.activity}: ${s.activity.description}`)
      .join("\n");

    const slotCount = affectedSlots.length;

    const prompt = `あなたは旅行プランナーです。以下の状況に対して、代替スケジュールを3パターン提案してください。

## 状況
- 場所: ${context.city}
- トリガー: ${triggerDescription}
- 現在時刻: ${context.currentTime}
- 同行者: ${context.companionType}
- 予算: ${context.budget}
${context.weather ? `- 天気: ${context.weather.condition}${context.weather.temperatureCelsius ? ` (${context.weather.temperatureCelsius}°C)` : ""}` : ""}

## 変更対象のアクティビティ（${slotCount}件）
${affectedActivities || "（指定なし）"}

## ルール
1. 各代替案には上記の時間帯をカバーする具体的なスケジュールを含めてください
2. アクティビティ数は元と同じでなくて構いません（状況に応じて増減OK）
3. ${context.city}で実際に存在する具体的なスポット・施設名を含めてください
4. 時刻は元の予定の時間帯に合わせてください（最初のアクティビティは${affectedSlots[0]?.activity.time ?? context.currentTime}頃から）
5. 体験志向の魅力的な説明を日本語で書いてください
6. 3つの代替案はそれぞれ異なるカテゴリ・方向性にしてください
7. 各提案は現実的で、現在の状況（${trigger.type}）に適したものにしてください`;

    const { model } = resolveModelForProvider("gemini", "itinerary", {
      modelName: "gemini-2.0-flash",
      structuredOutputs: true,
    });

    const { object } = await generateObject({
      model,
      schema: ReplanResponseSchema,
      prompt,
      temperature: 0.7,
      maxTokens: 1024,
      ...(signal ? { abortSignal: signal } : {}),
    });

    return object.alternatives.map((alt, i) => ({
      id: `ai-alt-${i}`,
      replacementSlots: alt.activities.map((act, j) => {
        // Use original slot as base if available, otherwise create new
        const baseSlot = affectedSlots[j] ?? affectedSlots[affectedSlots.length - 1];
        return {
          ...baseSlot,
          id: `ai-slot-${i}-${j}`,
          slotIndex: j,
          startTime: act.time,
          activity: {
            time: act.time,
            activity: act.name,
            description: act.description,
          },
        };
      }),
      explanation: alt.summary,
      estimatedDuration: alt.estimatedDuration,
      category: alt.category as RecoveryCategory,
    }));
  }
}
