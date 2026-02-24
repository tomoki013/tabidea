/**
 * Uncertainty Penalty シグナル — 不確実性ペナルティ（減点項目）
 *
 * データ不足（天気情報なし、位置不明など）を検出し、
 * 不確実性が高い提案にペナルティを与える。
 *
 * ⚠ このシグナルは減点用（weights が負）のため、
 * スコアが高い = 不確実性が大きい = 望ましくない
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

export const uncertaintyPenaltySignal: ScoringSignal = {
  name: "uncertaintyPenalty",
  calculate(input: HumanResolutionInput): number {
    let uncertainty = 0;

    // 天気情報がない
    if (!input.context.weather) {
      uncertainty += 0.3;
    }

    // 現在位置不明
    if (!input.state.currentLocation) {
      uncertainty += 0.3;
    }

    // 推定所要時間が不明
    if (!input.option.estimatedDuration || input.option.estimatedDuration === "") {
      uncertainty += 0.4;
    }

    return Math.min(1, uncertainty);
  },
};
