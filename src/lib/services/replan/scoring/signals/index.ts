/**
 * シグナルレジストリ — 全シグナルを登録・エクスポート
 */

import type { ScoringSignal } from "../types";
import { safetyMarginSignal } from "./safety-margin";
import { timeFeasibilitySignal } from "./time-feasibility";
import { physicalLoadFitSignal } from "./physical-load-fit";
import { recoveryMarginSignal } from "./recovery-margin";
import { preferenceFitSignal } from "./preference-fit";
import { optionalitySignal } from "./optionality";
import { narrativePotentialSignal } from "./narrative-potential";
import { explainabilitySignal } from "./explainability";
import { regretRiskSignal } from "./regret-risk";
import { contextMismatchSignal } from "./context-mismatch";
import { uncertaintyPenaltySignal } from "./uncertainty-penalty";

/** デフォルトの全シグナル一覧（登録順 = 実行順） */
export const DEFAULT_SIGNALS: ScoringSignal[] = [
  safetyMarginSignal,
  timeFeasibilitySignal,
  physicalLoadFitSignal,
  recoveryMarginSignal,
  preferenceFitSignal,
  optionalitySignal,
  narrativePotentialSignal,
  explainabilitySignal,
  regretRiskSignal,
  contextMismatchSignal,
  uncertaintyPenaltySignal,
];

export {
  safetyMarginSignal,
  timeFeasibilitySignal,
  physicalLoadFitSignal,
  recoveryMarginSignal,
  preferenceFitSignal,
  optionalitySignal,
  narrativePotentialSignal,
  explainabilitySignal,
  regretRiskSignal,
  contextMismatchSignal,
  uncertaintyPenaltySignal,
};
