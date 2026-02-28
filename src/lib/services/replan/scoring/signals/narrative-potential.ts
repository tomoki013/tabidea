/**
 * Narrative Potential シグナル — 体験としての価値
 *
 * 「雨宿りしたカフェ」のような体験ストーリーの可能性を評価。
 * トリガーとカテゴリの組み合わせで体験価値を推定。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";
import type { RecoveryCategory, ReplanTriggerType } from "@/types/replan";

/**
 * トリガー × カテゴリ の体験ポテンシャルマップ
 * 高い値 = より良い体験ストーリーが生まれやすい
 */
const NARRATIVE_MAP: Record<
  ReplanTriggerType,
  Record<RecoveryCategory, number>
> = {
  rain: {
    indoor: 0.9,  // 「雨の日にゆっくり美術館」
    food: 0.8,    // 「雨宿りがてらカフェ」
    culture: 0.7,
    rest: 0.5,
    outdoor: 0.1,
  },
  fatigue: {
    rest: 0.9,    // 「疲れた体を温泉で癒す」
    food: 0.8,    // 「名物を食べて充電」
    indoor: 0.6,
    culture: 0.4,
    outdoor: 0.2,
  },
  delay: {
    food: 0.7,    // 「待ち時間に地元グルメ」
    indoor: 0.6,
    culture: 0.5,
    rest: 0.5,
    outdoor: 0.3,
  },
};

export const narrativePotentialSignal: ScoringSignal = {
  name: "narrativePotential",
  calculate(input: HumanResolutionInput): number {
    const map = NARRATIVE_MAP[input.mode];
    if (!map) return 0.5;
    return map[input.option.category] ?? 0.5;
  },
};
