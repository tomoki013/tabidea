/**
 * Context Mismatch シグナル — コンテキスト不一致（減点項目）
 *
 * 雨なのに outdoor を提案するなど、状況と合わない提案を検出。
 *
 * ⚠ このシグナルは減点用（weights が負）のため、
 * スコアが高い = 不一致が大きい = 望ましくない
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

export const contextMismatchSignal: ScoringSignal = {
  name: "contextMismatch",
  calculate(input: HumanResolutionInput): number {
    let mismatch = 0;

    // 雨なのに outdoor
    if (input.mode === "rain" && input.option.category === "outdoor") {
      mismatch += 0.8;
    }

    // 天気情報がある場合の追加チェック
    if (input.context.weather) {
      const { condition } = input.context.weather;
      if (
        (condition === "rainy" || condition === "stormy") &&
        input.option.category === "outdoor"
      ) {
        mismatch += 0.2;
      }
    }

    // 疲労モードなのに outdoor
    if (input.mode === "fatigue" && input.option.category === "outdoor") {
      mismatch += 0.5;
    }

    return Math.min(1, mismatch);
  },
};
