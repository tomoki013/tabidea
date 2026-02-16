import { NextResponse } from 'next/server';

import { hotelSearchSchema } from '@/lib/external/schemas';
import { searchHotelsWithCache } from '@/lib/external/service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = hotelSearchSchema.safeParse(body.criteria);
    if (!parsed.success) {
      return NextResponse.json({ message: '検索条件が不正です', issues: parsed.error.issues }, { status: 400 });
    }

    const provider = body.provider === 'amadeus' ? 'amadeus' : 'amadeus';
    const result = await searchHotelsWithCache({
      provider,
      planId: body.planId,
      itemId: body.itemId,
      criteria: parsed.data,
    });

    return NextResponse.json({ ...result, criteria: parsed.data });
  } catch (error) {
    console.error('[external/hotels/search] failed', error);
    return NextResponse.json({
      message: '検索に失敗しました。条件を調整して再試行してください。',
    }, { status: 500 });
  }
}
