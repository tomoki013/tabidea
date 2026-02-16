import { NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { externalHotelsSearchBodySchema } from '@/lib/external/schemas/search';
import { getExternalProvider } from '@/lib/external/providers';
import { buildRequestHash, getCachedExternalResults, storeExternalResults } from '@/lib/external/cache';

const HOTEL_CACHE_TTL_SECONDS = 60 * 20;

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = externalHotelsSearchBodySchema.safeParse(body);
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
      ttlSeconds: HOTEL_CACHE_TTL_SECONDS,
    });

    if (cached) {
      return NextResponse.json({
        provider,
        cached: true,
        requestId: cached.requestId,
        results: cached.results,
      });
    }

    const externalProvider = getExternalProvider(provider);
    const result = await externalProvider.searchHotels(criteria);
    const normalized = result.map((item) => ({
      id: item.id,
      provider: item.provider,
      name: item.name,
      price: item.price,
      currency: item.currency,
      latitude: item.latitude,
      longitude: item.longitude,
      rating: item.rating,
      deeplink: item.deeplink,
      imageUrl: item.imageUrl,
      distanceKm: item.distanceKm,
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

    return NextResponse.json({
      provider,
      cached: false,
      requestId,
      results: normalized,
    });
  } catch (error) {
    console.error('[external/hotels/search] failed', error);
    return NextResponse.json({
      error: '検索に失敗しました。条件を調整して再試行してください。',
    }, { status: 500 });
  }
}
