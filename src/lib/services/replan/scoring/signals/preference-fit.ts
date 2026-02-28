/**
 * Preference Fit シグナル — 好み適合度
 *
 * ユーザーの予算・同行者タイプと提案カテゴリの相性を評価。
 * 将来的にはユーザーの旅行テーマ設定との照合も追加可能。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

export const preferenceFitSignal: ScoringSignal = {
  name: "preferenceFit",
  calculate(input: HumanResolutionInput): number {
    let score = 0.5; // ベーススコア

    // 同行者タイプとの相性
    const companion = input.context.companionType.toLowerCase();
    const category = input.option.category;

    if (companion.includes("子供") || companion.includes("家族")) {
      if (category === "rest" || category === "food") score += 0.2;
      if (category === "culture") score += 0.1;
    } else if (companion.includes("カップル") || companion.includes("恋人")) {
      if (category === "food" || category === "culture") score += 0.2;
    } else if (companion.includes("友人") || companion.includes("友達")) {
      if (category === "outdoor" || category === "food") score += 0.2;
    }

    // 予算との相性（簡易）
    const budget = input.context.budget.toLowerCase();
    if (budget.includes("節約") || budget.includes("安")) {
      if (category === "outdoor" || category === "rest") score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  },
};
