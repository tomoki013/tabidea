import { createHash } from 'crypto';

import { createClient } from '@/lib/supabase/server';

export function buildRequestHash(payload: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function getCachedExternalResults(params: {
  userId: string;
  provider: string;
  requestHash: string;
  ttlSeconds: number;
}) {
  const supabase = await createClient();
  const threshold = new Date(Date.now() - (params.ttlSeconds * 1000)).toISOString();

  const { data: request } = await supabase
    .from('external_search_requests')
    .select('id, created_at')
    .eq('user_id', params.userId)
    .eq('provider', params.provider)
    .eq('request_hash', params.requestHash)
    .gte('created_at', threshold)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) return null;

  const { data: results } = await supabase
    .from('external_search_results')
    .select('normalized_fields, fetched_at')
    .eq('request_id', request.id)
    .order('fetched_at', { ascending: false });

  if (!results || results.length === 0) return null;

  return {
    cached: true,
    requestId: request.id,
    results: results.map((item) => item.normalized_fields),
  };
}

export async function storeExternalResults(params: {
  userId: string;
  planId: string;
  itemId?: string;
  provider: string;
  requestHash: string;
  requestJson: Record<string, unknown>;
  normalizedResults: Record<string, unknown>[];
  rawResults: Record<string, unknown>[];
}) {
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from('external_search_requests')
    .insert({
      user_id: params.userId,
      plan_id: params.planId,
      item_id: params.itemId ?? null,
      provider: params.provider,
      request_hash: params.requestHash,
      request_json: params.requestJson,
    })
    .select('id')
    .single();

  if (requestError || !request) {
    throw requestError ?? new Error('Failed to store external request');
  }

  const resultRows = params.normalizedResults.map((normalized, index) => ({
    request_id: request.id,
    provider: params.provider,
    result_json: params.rawResults[index] ?? normalized,
    normalized_fields: normalized,
  }));

  const { error: resultError } = await supabase
    .from('external_search_results')
    .insert(resultRows);

  if (resultError) throw resultError;

  return request.id;
}
