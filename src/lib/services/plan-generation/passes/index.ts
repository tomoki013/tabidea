/**
 * Pass Registry
 * PassId → PassFn のマッピング
 */

import type { PassId, PassFn } from '@/types/plan-generation';
import { normalizePass } from './normalize';
import { draftGeneratePass } from './draft-generate';
import { ruleScorePass } from './rule-score';
import { localRepairPass } from './local-repair';
import { selectiveVerifyPass } from './selective-verify';
import { timelineConstructPass } from './timeline-construct';
import { narrativePolishPass } from './narrative-polish';

/** 登録済みパスのレジストリ */
const PASS_REGISTRY: Record<string, PassFn> = {
  normalize: normalizePass,
  draft_generate: draftGeneratePass,
  rule_score: ruleScorePass,
  local_repair: localRepairPass,
  selective_verify: selectiveVerifyPass,
  timeline_construct: timelineConstructPass,
  narrative_polish: narrativePolishPass,
};

/**
 * PassId からパス関数を取得
 * 未登録のパスは null を返す
 */
export function getPass(passId: PassId): PassFn | null {
  return PASS_REGISTRY[passId] ?? null;
}
