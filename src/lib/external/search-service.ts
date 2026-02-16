import { createHash } from 'crypto';

import { createClient } from '@/lib/supabase/server';
import type { ExternalSearchProvider, NormalizedExternalResult } from '@/lib/external/types';

const DEFAULT_TTL_MINUTES = 30;

export function hashRequest(payload: unknown): string {
  const raw = JSON.stringify(payload);
  return createHash('sha256').update(raw).digest('hex');
}

function isWithinTtl(fetchedAt: string, ttlMinutes: number): boolean {
  return Date.now() - new Date(fetchedAt).getTime() <= ttlMinutes * 60_000;
}

export async function searchWithCache(input: {
  userId: string;
  planId?: string | null;
  itemId?: string | null;
  providerName: string;
  cacheKeyPayload: unknown;
  executeSearch: (provider: ExternalSearchProvider) => Promise<NormalizedExternalResult[]>;
  provider: ExternalSearchProvider;
  ttlMinutes?: number;
}): Promise<{ requestId: string; cached: boolean; results: NormalizedExternalResult[] }> {
  const supabase = await createClient();
  const requestHash = hashRequest(input.cacheKeyPayload);
  const ttlMinutes = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;

  const { data: cachedRequest } = await supabase
    .from('external_search_requests')
    .select('id,created_at,external_search_results(fetched_at,normalized_fields)')
    .eq('user_id', input.userId)
    .eq('provider', input.providerName)
    .eq('request_hash', requestHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const resultsRows = (cachedRequest?.external_search_results as Array<{ fetched_at: string; normalized_fields: unknown }> | null) ?? [];
  if (resultsRows.length > 0 && isWithinTtl(resultsRows[0].fetched_at, ttlMinutes)) {
    return {
      requestId: cachedRequest!.id,
      cached: true,
      results: resultsRows.map((row) => row.normalized_fields as NormalizedExternalResult),
    };
  }

  const { data: requestRow, error: reqError } = await supabase
    .from('external_search_requests')
    .insert({
      user_id: input.userId,
      plan_id: input.planId ?? null,
      item_id: input.itemId ?? null,
      provider: input.providerName,
      request_hash: requestHash,
      request_json: input.cacheKeyPayload,
    })
    .select('id')
    .single();

  if (reqError || !requestRow) {
    throw new Error(reqError?.message ?? 'Failed to store external search request');
  }

  const results = await input.executeSearch(input.provider);

  if (results.length > 0) {
    const payload = results.map((result) => ({
      request_id: requestRow.id,
      provider: input.providerName,
      result_json: result.metadata,
      normalized_fields: result,
    }));
    const { error: insertError } = await supabase.from('external_search_results').insert(payload);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return { requestId: requestRow.id, cached: false, results };
}
