/**
 * スコアリング重みの定義
 *
 * - DEFAULT_WEIGHTS: 全モード共通のベース重み
 * - WEIGHT_OVERRIDES: モード別のオーバーライド
 *
 * 合計は正規化されるため厳密に 1.0 である必要はないが、
 * 相対的な大小関係が重要。
 */

import type { ReplanTriggerType } from "@/types/replan";

import type { ScoringWeightSet } from "./types";

// ============================================================================
// Default Weights
// ============================================================================

export const DEFAULT_WEIGHTS: ScoringWeightSet = {
  safetyMargin: 0.15,
  timeFeasibility: 0.15,
  physicalLoadFit: 0.12,
  recoveryMargin: 0.10,
  preferenceFit: 0.10,
  optionality: 0.08,
  narrativePotential: 0.08,
  explainability: 0.07,
  regretRisk: -0.08,
  contextMismatch: -0.05,
  uncertaintyPenalty: -0.02,
};

// ============================================================================
// Mode-specific Overrides
// ============================================================================

export const WEIGHT_OVERRIDES: Record<
  ReplanTriggerType,
  Partial<ScoringWeightSet>
> = {
  rain: {
    physicalLoadFit: 0.20,
    contextMismatch: -0.10,
  },
  fatigue: {
    physicalLoadFit: 0.25,
    recoveryMargin: 0.18,
  },
  delay: {
    timeFeasibility: 0.25,
    safetyMargin: 0.20,
  },
};

// ============================================================================
// Helper
// ============================================================================

/**
 * モードに応じた重みセットを構築する。
 * DEFAULT_WEIGHTS にモード別オーバーライドをマージ。
 */
export function resolveWeights(
  mode: ReplanTriggerType,
  overrides?: Partial<ScoringWeightSet>
): ScoringWeightSet {
  const merged: ScoringWeightSet = { ...DEFAULT_WEIGHTS };

  // モード別オーバーライド
  const modeOverrides = WEIGHT_OVERRIDES[mode];
  if (modeOverrides) {
    for (const [key, val] of Object.entries(modeOverrides)) {
      if (val !== undefined) merged[key] = val;
    }
  }

  // 追加オーバーライド
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== undefined) merged[key] = val;
    }
  }

  return merged;
}
