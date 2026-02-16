import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { flightSearchSchema } from '@/lib/external-providers/schema';
import {
  buildRequestHash,
  getProvider,
  lookupCachedExternalResults,
  persistExternalSearch,
} from '@/lib/external-providers';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = flightSearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid search condition JSON', detail: parsed.error.flatten() }, { status: 400 });
    }

    const criteria = parsed.data;
    const providerName = criteria.provider ?? 'amadeus';
    const requestHash = buildRequestHash(criteria);

    const cached = await lookupCachedExternalResults({
      userId: user.id,
      planId: criteria.planId,
      itemId: criteria.itemId,
      provider: providerName,
      requestHash,
    });

    if (cached) {
      return NextResponse.json({ success: true, fromCache: true, candidates: cached.slice(0, criteria.limit) });
    }

    const provider = getProvider(providerName);
    const candidates = await provider.searchFlights(criteria);

    await persistExternalSearch({
      userId: user.id,
      planId: criteria.planId,
      itemId: criteria.itemId,
      provider: providerName,
      requestHash,
      requestJson: criteria,
      results: candidates,
    });

    return NextResponse.json({ success: true, fromCache: false, candidates: candidates.slice(0, criteria.limit) });
  } catch (error) {
    console.error('[external/flights/search] failed', error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        success: false,
        error: '外部航空券検索に失敗しました。条件を調整して再試行してください。',
      },
      { status: 500 },
    );
  }
}
