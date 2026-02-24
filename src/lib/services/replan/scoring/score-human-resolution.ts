/**
 * scoreHumanResolution — メインスコアリング関数
 *
 * 1. Hard Constraints を先にチェック（違反 → total = -Infinity）
 * 2. 各シグナルを実行し raw スコアを取得
 * 3. 重みを適用して加重合計を算出
 * 4. 0-1 にクランプして返す
 */

import type { ScoreBreakdown } from "@/types/replan";

import { passesHardConstraints } from "./hard-constraints";
import { DEFAULT_SIGNALS } from "./signals";
import type { HumanResolutionInput, ScoringSignal, ScoringWeightSet } from "./types";
import { resolveWeights } from "./weights";

// ============================================================================
// Public API
// ============================================================================

/**
 * Human Resolution Score を算出する。
 *
 * @param input - スコアリング入力
 * @param signals - カスタムシグナル配列（省略時はデフォルト全シグナル）
 * @param weightOverrides - 重みオーバーライド（省略時はモード別デフォルト）
 * @returns ScoreBreakdown
 */
export function scoreHumanResolution(
  input: HumanResolutionInput,
  signals?: ScoringSignal[],
  weightOverrides?: Partial<ScoringWeightSet>
): ScoreBreakdown {
  // 1. Hard Constraints
  const hardResult = passesHardConstraints(input);
  if (!hardResult.pass) {
    return buildRejectedBreakdown();
  }

  // 2. シグナル実行
  const activeSignals = signals ?? DEFAULT_SIGNALS;
  const weights = resolveWeights(input.mode, weightOverrides);
  const rawScores: Record<string, number> = {};

  for (const signal of activeSignals) {
    rawScores[signal.name] = signal.calculate(input);
  }

  // 3. 加重合計
  let total = 0;
  for (const [name, weight] of Object.entries(weights)) {
    const raw = rawScores[name] ?? 0;
    total += raw * weight;
  }

  // 4. 0-1 クランプ
  total = Math.max(0, Math.min(1, total));

  return {
    hardPass: true,
    safetyMargin: rawScores["safetyMargin"] ?? 0,
    timeFeasibility: rawScores["timeFeasibility"] ?? 0,
    physicalLoadFit: rawScores["physicalLoadFit"] ?? 0,
    recoveryMargin: rawScores["recoveryMargin"] ?? 0,
    preferenceFit: rawScores["preferenceFit"] ?? 0,
    optionality: rawScores["optionality"] ?? 0,
    narrativePotential: rawScores["narrativePotential"] ?? 0,
    explainability: rawScores["explainability"] ?? 0,
    regretRisk: rawScores["regretRisk"] ?? 0,
    contextMismatch: rawScores["contextMismatch"] ?? 0,
    uncertaintyPenalty: rawScores["uncertaintyPenalty"] ?? 0,
    total,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildRejectedBreakdown(): ScoreBreakdown {
  return {
    hardPass: false,
    safetyMargin: 0,
    timeFeasibility: 0,
    physicalLoadFit: 0,
    recoveryMargin: 0,
    preferenceFit: 0,
    optionality: 0,
    narrativePotential: 0,
    explainability: 0,
    regretRisk: 0,
    contextMismatch: 0,
    uncertaintyPenalty: 0,
    total: -Infinity,
  };
}
