/**
 * Pass A: Normalize
 * UserInput → NormalizedRequest への正規化
 * 既存の normalizeRequest() をラップするだけ — コード重複ゼロ
 */

import type { PassContext, PassResult } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { normalizeRequest } from '@/lib/services/itinerary/steps/normalize-request';

export async function normalizePass(ctx: PassContext): Promise<PassResult<NormalizedRequest>> {
  const start = Date.now();

  const input = ctx.session.inputSnapshot;
  if (!input) {
    return {
      outcome: 'failed_terminal',
      warnings: ['No inputSnapshot in session'],
      durationMs: Date.now() - start,
    };
  }

  const normalized = normalizeRequest(input, 'ja');

  return {
    outcome: 'completed',
    data: normalized,
    warnings: [],
    durationMs: Date.now() - start,
  };
}
