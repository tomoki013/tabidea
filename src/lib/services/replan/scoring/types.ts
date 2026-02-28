/**
 * Human Resolution Scoring 型定義
 *
 * プラグイン式シグナル設計の基盤型。
 * 各シグナルは ScoringSignal インターフェースを実装し、
 * 独立したファイルとして追加可能。
 */

import type {
  RecoveryOption,
  ReplanTriggerType,
  TravelerState,
  TripContext,
} from "@/types/replan";

// ============================================================================
// Scoring Signal (Plugin Interface)
// ============================================================================

/** スコアリングシグナルの入力 */
export interface HumanResolutionInput {
  /** 旅行コンテキスト */
  context: TripContext;
  /** 旅行者の現在状態 */
  state: TravelerState;
  /** 評価対象のリカバリーオプション */
  option: RecoveryOption;
  /** リプランのトリガー種別 */
  mode: ReplanTriggerType;
}

/** スコアリングシグナル — 1つの評価軸を表すプラグイン */
export interface ScoringSignal {
  /** シグナル名（weights のキーと一致させる） */
  name: string;
  /** スコアを計算する (0-1, 高い = 良い) */
  calculate(input: HumanResolutionInput): number;
}

// ============================================================================
// Weight Set
// ============================================================================

/** 重みセット — シグナル名 → 重み値のマップ */
export interface ScoringWeightSet {
  [signalName: string]: number;
}
