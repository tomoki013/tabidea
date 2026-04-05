/**
 * GET /api/v1/trips/[tripId]  — 正本取得
 * DELETE /api/v1/trips/[tripId] — 完全削除
 * 設計書 §7.3, §10.3
 */

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { tripService } from '@/lib/trips/service';
import { createServiceRoleClient } from '@/lib/supabase/admin';

interface Params {
  params: Promise<{ tripId: string }>;
}

// ============================================
// GET — 正本取得
// ============================================

export async function GET(request: Request, { params }: Params) {
  try {
    const { tripId } = await params;
    const user = await getUser().catch(() => null);

    const { trip, itinerary } = await tripService.fetchTrip(tripId);

    // 認可チェック (設計書 §8.5)
    if (trip.userId && trip.userId !== user?.id) {
      // share token がなければ 403
      const shareToken = new URL(request.url).searchParams.get('share_token');
      if (!shareToken) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      // TODO: share token validation (設計書 §7.5)
    }

    return NextResponse.json({ trip, itinerary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found') || message.includes('Not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// ============================================
// DELETE — 完全削除 (設計書 §10.3)
// ============================================

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tripId } = await params;
    const user = await getUser().catch(() => null);

    if (!user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { trip } = await tripService.fetchTrip(tripId);

    // owner チェック (設計書 §8.3)
    if (trip.userId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const client = createServiceRoleClient();

    // trip 本体・trip_versions・share を完全削除
    const { error } = await client
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found') || message.includes('Not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
