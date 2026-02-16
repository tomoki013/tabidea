import { NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { externalFlightsSearchBodySchema } from '@/lib/external/schemas/search';
import { getExternalProvider } from '@/lib/external/providers';
import { buildRequestHash, getCachedExternalResults, storeExternalResults } from '@/lib/external/cache';

const FLIGHT_CACHE_TTL_SECONDS = 60 * 10;

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = externalFlightsSearchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
    }

    const { provider, criteria, planId, itemId } = parsed.data;
    const requestPayload = { provider, criteria, planId, itemId };
    const requestHash = buildRequestHash(requestPayload);

    const cached = await getCachedExternalResults({
      userId: user.id,
      provider,
      requestHash,
      ttlSeconds: FLIGHT_CACHE_TTL_SECONDS,
    });

    if (cached) {
      return NextResponse.json({ provider, cached: true, requestId: cached.requestId, results: cached.results });
    }

    const externalProvider = getExternalProvider(provider);
    const result = await externalProvider.searchFlights(criteria);
    const normalized = result.map((item) => ({
      id: item.id,
      provider: item.provider,
      summary: item.summary,
      price: item.price,
      currency: item.currency,
      deeplink: item.deeplink,
      departureAt: item.departureAt,
      arrivalAt: item.arrivalAt,
    }));

    const requestId = await storeExternalResults({
      userId: user.id,
      planId,
      itemId,
      provider,
      requestHash,
      requestJson: requestPayload,
      normalizedResults: normalized,
      rawResults: result.map((item) => item.raw),
    });

    return NextResponse.json({ provider, cached: false, requestId, results: normalized });
  } catch (error) {
    console.error('[external/flights/search] failed', error);
    return NextResponse.json({ error: '検索に失敗しました。検索条件を調整して再試行してください。' }, { status: 500 });
  }
}
