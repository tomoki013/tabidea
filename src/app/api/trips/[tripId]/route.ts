import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { tripService } from '@/lib/trips/service';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const user = await getUser().catch(() => null);
    const { tripId } = await params;
    const url = new URL(request.url);
    const versionParam = url.searchParams.get('version');
    const version = versionParam ? Number(versionParam) : undefined;

    if (versionParam && (!Number.isInteger(version) || version! <= 0)) {
      return NextResponse.json({ error: 'invalid_version' }, { status: 400 });
    }

    const result = await tripService.getTripVersion(tripId, user?.id ?? null, version);
    if (!result) {
      return NextResponse.json({ error: 'trip_not_found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[trips] GET failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'internal_error' },
      { status: 500 },
    );
  }
}
