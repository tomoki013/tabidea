/**
 * Regret Risk シグナル — 後悔リスク（減点項目）
 *
 * must-visit スポットをスキップするリスクを評価。
 * replacementSlots が must priority のスロットを含む場合、高リスク。
 *
 * ⚠ このシグナルは減点用（weights が負）のため、
 * スコアが高い = 後悔リスクが高い = 望ましくない
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

export const regretRiskSignal: ScoringSignal = {
  name: "regretRisk",
  calculate(input: HumanResolutionInput): number {
    const slots = input.option.replacementSlots;
    if (slots.length === 0) return 0;

    // must priority のスロットがスキップされるリスク
    const mustCount = slots.filter((s) => s.priority === "must").length;
    const shouldCount = slots.filter((s) => s.priority === "should").length;

    if (mustCount > 0) return 1.0; // 最大リスク
    if (shouldCount > 0) return 0.5;

    return 0.1; // nice のみ → 低リスク
  },
};
