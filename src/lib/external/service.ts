import crypto from 'crypto';

import { createClient, getUser } from '@/lib/supabase/server';
import { getExternalProvider } from '@/lib/external/providers';
import type { ExternalProvider, FlightSearchCriteria, HotelSearchCriteria } from '@/lib/external/types';

const DEFAULT_TTL_MINUTES = 30;

function makeRequestHash(provider: ExternalProvider, payload: unknown) {
  return crypto.createHash('sha256').update(`${provider}:${JSON.stringify(payload)}`).digest('hex');
}

export async function searchHotelsWithCache(input: {
  provider: ExternalProvider;
  planId?: string;
  itemId?: string;
  criteria: HotelSearchCriteria;
}) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();

  const hash = makeRequestHash(input.provider, input.criteria);
  const now = new Date();

  const { data: cachedRequest } = await supabase
    .from('external_search_requests')
    .select('id, expires_at')
    .eq('user_id', user.id)
    .eq('provider', input.provider)
    .eq('request_hash', hash)
    .gt('expires_at', now.toISOString())
    .maybeSingle();

  if (cachedRequest) {
    const { data: cachedResults } = await supabase
      .from('external_search_results')
      .select('normalized_fields')
      .eq('request_id', cachedRequest.id)
      .order('fetched_at', { ascending: false })
      .limit(input.criteria.limit);

    if (cachedResults && cachedResults.length > 0) {
      return { cached: true, results: cachedResults.map((x) => x.normalized_fields) };
    }
  }

  const provider = getExternalProvider(input.provider);
  const results = await provider.searchHotels(input.criteria);

  const expiresAt = new Date(now.getTime() + DEFAULT_TTL_MINUTES * 60_000).toISOString();
  const { data: requestRow, error: reqErr } = await supabase
    .from('external_search_requests')
    .upsert({
      user_id: user.id,
      plan_id: input.planId ?? null,
      item_id: input.itemId ?? null,
      provider: input.provider,
      request_hash: hash,
      request_json: input.criteria,
      expires_at: expiresAt,
    }, { onConflict: 'user_id,provider,request_hash' })
    .select('id')
    .single();

  if (reqErr || !requestRow) throw reqErr ?? new Error('Failed to persist request');

  if (results.length > 0) {
    const rows = results.map((result) => ({
      request_id: requestRow.id,
      provider: input.provider,
      result_json: result.raw,
      normalized_fields: result,
    }));
    const { error } = await supabase.from('external_search_results').insert(rows);
    if (error) throw error;
  }

  return { cached: false, results };
}

export async function searchFlightsWithCache(input: {
  provider: ExternalProvider;
  planId?: string;
  itemId?: string;
  criteria: FlightSearchCriteria;
}) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const hash = makeRequestHash(input.provider, input.criteria);
  const now = new Date();

  const { data: cachedRequest } = await supabase
    .from('external_search_requests')
    .select('id, expires_at')
    .eq('user_id', user.id)
    .eq('provider', input.provider)
    .eq('request_hash', hash)
    .gt('expires_at', now.toISOString())
    .maybeSingle();

  if (cachedRequest) {
    const { data: cachedResults } = await supabase
      .from('external_search_results')
      .select('normalized_fields')
      .eq('request_id', cachedRequest.id)
      .order('fetched_at', { ascending: false })
      .limit(input.criteria.limit);

    if (cachedResults && cachedResults.length > 0) {
      return { cached: true, results: cachedResults.map((x) => x.normalized_fields) };
    }
  }

  const provider = getExternalProvider(input.provider);
  const results = await provider.searchFlights(input.criteria);
  const expiresAt = new Date(now.getTime() + DEFAULT_TTL_MINUTES * 60_000).toISOString();

  const { data: requestRow, error: reqErr } = await supabase
    .from('external_search_requests')
    .upsert({
      user_id: user.id,
      plan_id: input.planId ?? null,
      item_id: input.itemId ?? null,
      provider: input.provider,
      request_hash: hash,
      request_json: input.criteria,
      expires_at: expiresAt,
    }, { onConflict: 'user_id,provider,request_hash' })
    .select('id')
    .single();

  if (reqErr || !requestRow) throw reqErr ?? new Error('Failed to persist request');

  if (results.length > 0) {
    const rows = results.map((result) => ({
      request_id: requestRow.id,
      provider: input.provider,
      result_json: result.raw,
      normalized_fields: result,
    }));
    const { error } = await supabase.from('external_search_results').insert(rows);
    if (error) throw error;
  }

  return { cached: false, results };
}
