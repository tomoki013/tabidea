import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { tripService } from '@/lib/trips/service';
import { applyTripPatch, type TripPatchOperation } from '@/lib/trips/patch';
import { evalService } from '@/lib/evals/service';

interface PatchTripRequestBody {
  baseVersion: number;
  patches: TripPatchOperation[];
  editor?: 'user' | 'system';
  idempotencyKey?: string;
}

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
    }

    const { tripId } = await params;
    const body = await request.json() as PatchTripRequestBody;

    if (!Array.isArray(body.patches) || body.patches.length === 0) {
      return NextResponse.json({ error: 'invalid_patch' }, { status: 422 });
    }

    const latest = await tripService.getTripVersion(tripId, user.id);
    if (!latest) {
      return NextResponse.json({ error: 'trip_not_found' }, { status: 404 });
    }

    if (body.baseVersion !== latest.trip.currentVersion) {
      return NextResponse.json(
        {
          error: {
            code: 'base_version_conflict',
            message: 'Trip has a newer version',
            retryable: true,
            details: {
              latestVersion: latest.trip.currentVersion,
            },
          },
        },
        { status: 409 },
      );
    }

    const patchedItinerary = applyTripPatch(latest.itinerary, body.patches);
    const persistedTrip = await tripService.persistTripVersion({
      itinerary: patchedItinerary,
      userId: user.id,
      createdBy: body.editor ?? 'user',
      baseVersion: body.baseVersion,
      changeType: 'patch',
    });

    await evalService.evaluateAndSaveItinerary(persistedTrip.itinerary, {
      tripId: persistedTrip.tripId,
      tripVersion: persistedTrip.version,
      context: {
        mutationType: 'patch',
      },
    });

    return NextResponse.json({
      tripId: persistedTrip.tripId,
      newVersion: persistedTrip.version,
      appliedPatchCount: body.patches.length,
      itinerary: persistedTrip.itinerary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message.startsWith('invalid_patch_path:') ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
