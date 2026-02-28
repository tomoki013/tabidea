/**
 * Recovery Margin シグナル — 回復マージン
 *
 * 休息スポット（rest/food/indoor）を含む提案を高く評価。
 * 疲労度と連動してスコアが変動。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

const RECOVERY_CATEGORIES = new Set(["rest", "food", "indoor"]);

export const recoveryMarginSignal: ScoringSignal = {
  name: "recoveryMargin",
  calculate(input: HumanResolutionInput): number {
    const isRecovery = RECOVERY_CATEGORIES.has(input.option.category);
    const fatigue = input.state.estimatedFatigue;

    if (isRecovery) {
      // 疲労が高いほど回復提案を高評価
      return 0.5 + fatigue * 0.5;
    }

    // 非回復系は疲労に反比例
    return Math.max(0.1, 0.7 - fatigue * 0.5);
  },
};
