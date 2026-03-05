/**
 * Preference Fit シグナル — 好み適合度
 *
 * ユーザーの予算・同行者タイプと提案カテゴリの相性を評価。
 * 将来的にはユーザーの旅行テーマ設定との照合も追加可能。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";
import { createReplanTranslator } from "../../i18n";

export const preferenceFitSignal: ScoringSignal = {
  name: "preferenceFit",
  calculate(input: HumanResolutionInput): number {
    const t = createReplanTranslator(input.context.language);
    const companionKeywords = t.raw("keywords.companion") as Record<string, string[]>;
    const budgetKeywords = t.raw("keywords.budget") as Record<string, string[]>;

    let score = 0.5; // ベーススコア

    // 同行者タイプとの相性
    const companion = input.context.companionType.toLowerCase();
    const category = input.option.category;

    if (companionKeywords.family.some((kw) => companion.includes(kw))) {
      if (category === "rest" || category === "food") score += 0.2;
      if (category === "culture") score += 0.1;
    } else if (companionKeywords.couple.some((kw) => companion.includes(kw))) {
      if (category === "food" || category === "culture") score += 0.2;
    } else if (companionKeywords.friends.some((kw) => companion.includes(kw))) {
      if (category === "outdoor" || category === "food") score += 0.2;
    }

    // 予算との相性（簡易）
    const budget = input.context.budget.toLowerCase();
    if (budgetKeywords.low.some((kw) => budget.includes(kw))) {
      if (category === "outdoor" || category === "rest") score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  },
};
