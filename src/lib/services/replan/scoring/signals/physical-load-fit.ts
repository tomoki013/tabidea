/**
 * Physical Load Fit シグナル — 身体負荷の適合度
 *
 * 疲労度が高いとき、indoor/rest/food カテゴリを高く評価。
 * 疲労度が低いとき、outdoor/culture も均等に評価。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

/** 疲労時に好ましいカテゴリ */
const LOW_EFFORT_CATEGORIES = new Set(["indoor", "rest", "food"]);

export const physicalLoadFitSignal: ScoringSignal = {
  name: "physicalLoadFit",
  calculate(input: HumanResolutionInput): number {
    const fatigue = input.state.estimatedFatigue; // 0-1
    const isLowEffort = LOW_EFFORT_CATEGORIES.has(input.option.category);

    if (fatigue >= 0.7) {
      // 高疲労: 低負荷カテゴリを強く推奨
      return isLowEffort ? 1.0 : 0.2;
    }

    if (fatigue >= 0.4) {
      // 中疲労: 低負荷やや有利
      return isLowEffort ? 0.8 : 0.5;
    }

    // 低疲労: カテゴリによらずほぼ均等
    return isLowEffort ? 0.6 : 0.7;
  },
};
