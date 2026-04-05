/**
 * Pass Registry (v4 legacy)
 * PassId → PassFn のマッピング
 *
 * NOTE: selective_verify と timeline_construct は plan-run rebuild により削除されました。
 * 新パイプラインは src/lib/services/plan-run/ を参照してください。
 */

import type { PassId, PassFn } from '@/types/plan-generation';
import { normalizePass } from './normalize';
import { draftGeneratePass } from './draft-generate';
import { draftFormatPass } from './draft-format';
import { localRepairPass } from './local-repair';

/** 登録済みパスのレジストリ */
const PASS_REGISTRY: Partial<Record<string, PassFn>> = {
  normalize: normalizePass,
  draft_generate: draftGeneratePass,
  draft_format: draftFormatPass,
  local_repair: localRepairPass,
};

/**
 * PassId からパス関数を取得
 * 未登録のパスは null を返す
 */
export function getPass(passId: PassId): PassFn | null {
  return PASS_REGISTRY[passId] ?? null;
}
