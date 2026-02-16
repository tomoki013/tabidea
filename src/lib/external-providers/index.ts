import crypto from 'node:crypto';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { ExternalCandidate, ExternalProvider } from '@/lib/external-providers/types';
import { AmadeusProvider } from '@/lib/external-providers/providers/amadeus';

const providerMap = {
  amadeus: new AmadeusProvider(),
};

export function getProvider(provider: ExternalProvider = 'amadeus') {
  return providerMap[provider];
}

export function buildRequestHash(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

const TTL_MS = 30 * 60 * 1000;

interface CacheLookupInput {
  userId: string;
  planId: string;
  itemId?: string;
  provider: ExternalProvider;
  requestHash: string;
}

export async function lookupCachedExternalResults(input: CacheLookupInput): Promise<ExternalCandidate[] | null> {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - TTL_MS).toISOString();

  const { data: request } = await supabase
    .from('external_search_requests')
    .select('id, created_at')
    .eq('user_id', input.userId)
    .eq('plan_id', input.planId)
    .eq('provider', input.provider)
    .eq('request_hash', input.requestHash)
    .gt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) return null;

  if (input.itemId) {
    const { data: reqItem } = await supabase
      .from('external_search_requests')
      .select('id')
      .eq('id', request.id)
      .eq('item_id', input.itemId)
      .maybeSingle();

    if (!reqItem) return null;
  }

  const { data: results } = await supabase
    .from('external_search_results')
    .select('result_json')
    .eq('request_id', request.id)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!results?.result_json || !Array.isArray(results.result_json)) return null;
  return results.result_json as ExternalCandidate[];
}

interface PersistInput {
  userId: string;
  planId: string;
  itemId?: string;
  provider: ExternalProvider;
  requestHash: string;
  requestJson: unknown;
  results: ExternalCandidate[];
}

export async function persistExternalSearch(input: PersistInput): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: request, error: requestError } = await supabase
    .from('external_search_requests')
    .insert({
      user_id: input.userId,
      plan_id: input.planId,
      item_id: input.itemId ?? null,
      provider: input.provider,
      request_hash: input.requestHash,
      request_json: input.requestJson,
    })
    .select('id')
    .single();

  if (requestError || !request) {
    console.warn('[external] failed to persist request', requestError?.message);
    return;
  }

  const normalized = input.results.map((result) => ({
    name: result.name,
    price: result.price,
    currency: result.currency,
    latitude: result.latitude ?? null,
    longitude: result.longitude ?? null,
    rating: result.rating ?? null,
    deeplink: result.deeplink ?? null,
  }));

  const { error } = await supabase
    .from('external_search_results')
    .insert({
      request_id: request.id,
      provider: input.provider,
      result_json: input.results,
      normalized_fields: normalized,
    });

  if (error) {
    console.warn('[external] failed to persist result', error.message);
  }
}
