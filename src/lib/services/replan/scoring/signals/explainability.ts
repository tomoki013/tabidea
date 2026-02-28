/**
 * Explainability シグナル — 説明可能性
 *
 * 提案を体験テキストとして説明できるかを評価。
 * explanation の長さと replacementSlots の数から推定。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

/** 適切な説明文の最小長（文字数） */
const MIN_EXPLANATION_LENGTH = 10;
/** 適切な説明文の理想長（文字数） */
const IDEAL_EXPLANATION_LENGTH = 50;

export const explainabilitySignal: ScoringSignal = {
  name: "explainability",
  calculate(input: HumanResolutionInput): number {
    const len = input.option.explanation.length;

    if (len < MIN_EXPLANATION_LENGTH) return 0.2;
    if (len >= IDEAL_EXPLANATION_LENGTH) return 1.0;

    // 線形補間
    return (
      0.2 +
      0.8 *
        ((len - MIN_EXPLANATION_LENGTH) /
          (IDEAL_EXPLANATION_LENGTH - MIN_EXPLANATION_LENGTH))
    );
  },
};
