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

const AlternativeSchema = z.object({
  name: z.string().describe("代替アクティビティの名前（日本語）"),
  description: z.string().describe("アクティビティの詳細説明（日本語、体験志向で）"),
  category: z.enum(["indoor", "outdoor", "rest", "food", "culture"]),
  estimatedDuration: z.string().describe("推定所要時間 (例: 1時間30分)"),
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
      .map((s) => `- ${s.activity.activity}: ${s.activity.description}`)
      .join("\n");

    const prompt = `あなたは旅行プランナーです。以下の状況に対して、代替アクティビティを3つ提案してください。

## 状況
- 場所: ${context.city}
- トリガー: ${triggerDescription}
- 現在時刻: ${context.currentTime}
- 同行者: ${context.companionType}
- 予算: ${context.budget}
${context.weather ? `- 天気: ${context.weather.condition}${context.weather.temperatureCelsius ? ` (${context.weather.temperatureCelsius}°C)` : ""}` : ""}

## 影響を受けるアクティビティ
${affectedActivities || "（指定なし）"}

## ルール
1. ${context.city}で実際に存在する具体的なスポット・施設名を含めてください
2. 体験志向の魅力的な説明を日本語で書いてください
3. 3つの代替案はそれぞれ異なるカテゴリにしてください
4. 各提案は現実的で、現在の状況（${trigger.type}）に適したものにしてください`;

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
      replacementSlots: affectedSlots.map((slot) => ({
        ...slot,
        id: `ai-slot-${i}-${slot.id}`,
        activity: {
          ...slot.activity,
          activity: alt.name,
          description: alt.description,
        },
      })),
      explanation: alt.description,
      estimatedDuration: alt.estimatedDuration,
      category: alt.category as RecoveryCategory,
    }));
  }
}
