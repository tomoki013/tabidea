/**
 * Optionality シグナル — 後続スロットの選択肢残存度
 *
 * 代替スロットが少ないほど、後続の柔軟性が高いと推定。
 * replacementSlots の数が少ない提案を高く評価（影響範囲が小さい）。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

/** これ以上スロットを変更すると柔軟性が低下する閾値 */
const MAX_REPLACEMENT_SLOTS = 5;

export const optionalitySignal: ScoringSignal = {
  name: "optionality",
  calculate(input: HumanResolutionInput): number {
    const count = input.option.replacementSlots.length;
    if (count <= 1) return 1.0; // 最小限の変更
    if (count >= MAX_REPLACEMENT_SLOTS) return 0.2;
    return 1.0 - (count - 1) / (MAX_REPLACEMENT_SLOTS - 1) * 0.8;
  },
};
