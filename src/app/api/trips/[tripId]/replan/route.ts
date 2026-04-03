import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { tripService } from '@/lib/trips/service';
import { replanTripItinerary } from '@/lib/trips/replan';
import { evalService } from '@/lib/evals/service';
import {
  isWeatherFallbackReplanScope,
  normalizeTripReplanScope,
  type TripReplanScope,
} from '@/types/agent-runtime';

interface ReplanTripRequestBody {
  baseVersion: number;
  scope: TripReplanScope;
  instruction: string;
  reason?: string;
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
    const body = await request.json() as ReplanTripRequestBody;
    if (!body.scope || !body.instruction) {
      return NextResponse.json({ error: 'unsupported_scope' }, { status: 422 });
    }
    const normalizedScope = normalizeTripReplanScope(body.scope);

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

    const replannedItinerary = await replanTripItinerary({
      itinerary: latest.itinerary,
      scope: normalizedScope,
      instruction: body.instruction,
    });

    const persistedTrip = await tripService.persistTripVersion({
      itinerary: replannedItinerary,
      userId: user.id,
      createdBy: 'agent',
      baseVersion: body.baseVersion,
      changeType: isWeatherFallbackReplanScope(normalizedScope) ? 'fallback' : 'replan',
    });

    await evalService.evaluateAndSaveItinerary(persistedTrip.itinerary, {
      tripId: persistedTrip.tripId,
      tripVersion: persistedTrip.version,
      context: {
        mutationType: 'replan',
        replanSucceeded: true,
      },
    });

    return NextResponse.json({
      tripId: persistedTrip.tripId,
      newVersion: persistedTrip.version,
      scope: normalizedScope,
      itinerary: persistedTrip.itinerary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'replan_failed',
      },
      { status: 500 },
    );
  }
}
