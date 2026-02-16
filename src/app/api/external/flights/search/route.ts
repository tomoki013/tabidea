import { NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { FlightSearchConditionSchema } from '@/lib/external/schemas';
import { resolveExternalProvider } from '@/lib/external/providers';
import { searchWithCache } from '@/lib/external/search-service';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await request.json();
  const parsed = FlightSearchConditionSchema.safeParse(json.conditions);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid conditions', detail: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const providerName = typeof json.provider === 'string' ? json.provider : 'amadeus';
    const provider = resolveExternalProvider(providerName);
    const result = await searchWithCache({
      userId: user.id,
      planId: json.planId,
      itemId: json.itemId,
      provider,
      providerName,
      cacheKeyPayload: { type: 'flight', providerName, conditions: parsed.data },
      executeSearch: (p) => p.searchFlights(parsed.data),
      ttlMinutes: Number(json.ttlMinutes) || 30,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[external/flights/search] failed', error);
    return NextResponse.json(
      { error: '検索に失敗しました。条件を調整して再実行してください。' },
      { status: 502 },
    );
  }
}
