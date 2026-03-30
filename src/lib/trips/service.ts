import { createServiceRoleClient } from '@/lib/supabase/admin';
import { enrichItineraryMetadata } from '@/lib/trips/metadata';
import type { Itinerary } from '@/types/itinerary';

type TripStatus = 'draft' | 'active' | 'archived';
type TripVersionChangeType = 'create' | 'patch' | 'replan' | 'fallback';
type TripVersionAuthor = 'agent' | 'user' | 'system';

export interface PersistTripVersionParams {
  itinerary: Itinerary;
  userId?: string | null;
  threadId?: string | null;
  createdBy: TripVersionAuthor;
  createdFromRunId?: string;
  baseVersion?: number;
  changeType?: TripVersionChangeType;
  generatedConstraints?: Itinerary['generatedConstraints'];
}

export interface PersistTripVersionResult {
  tripId: string;
  version: number;
  itinerary: Itinerary;
}

export interface TripFetchResult {
  trip: {
    tripId: string;
    userId: string | null;
    currentVersion: number;
    title: string | null;
    destinationSummary: unknown;
    tripStatus: TripStatus;
    createdAt: string;
    updatedAt: string;
  };
  itinerary: Itinerary;
}

function getClient() {
  return createServiceRoleClient();
}

function normalizeTripStatus(status: unknown): TripStatus {
  return status === 'active' || status === 'archived' ? status : 'draft';
}

export class TripService {
  async persistTripVersion(params: PersistTripVersionParams): Promise<PersistTripVersionResult> {
    const client = getClient();
    let itinerary = enrichItineraryMetadata(params.itinerary, {
      generatedConstraints: params.generatedConstraints,
    });

    let tripId = itinerary.tripId;

    if (!tripId) {
      const { data: insertedTrip, error: tripInsertError } = await client
        .from('trips')
        .insert({
          user_id: params.userId ?? null,
          thread_id: params.threadId ?? null,
          current_version: 0,
          title: itinerary.title ?? null,
          destination_summary: itinerary.destinationSummary ?? {},
          trip_status: 'draft' satisfies TripStatus,
        })
        .select('trip_id')
        .single();

      if (tripInsertError || !insertedTrip) {
        throw new Error(`Failed to create trip: ${tripInsertError?.message ?? 'no data'}`);
      }

      tripId = insertedTrip.trip_id as string;
      itinerary = enrichItineraryMetadata(itinerary, { tripId });
    }

    const { data: existingTrip, error: tripLoadError } = await client
      .from('trips')
      .select('trip_id, user_id, current_version')
      .eq('trip_id', tripId)
      .single();

    if (tripLoadError || !existingTrip) {
      throw new Error(`Failed to load trip ${tripId}: ${tripLoadError?.message ?? 'not found'}`);
    }

    if (params.userId && existingTrip.user_id == null) {
      await client
        .from('trips')
        .update({ user_id: params.userId, updated_at: new Date().toISOString() })
        .eq('trip_id', tripId);
    }

    if (itinerary.version != null) {
      const { data: existingVersion } = await client
        .from('trip_versions')
        .select('version')
        .eq('trip_id', tripId)
        .eq('version', itinerary.version)
        .maybeSingle();

      if (existingVersion) {
        return {
          tripId,
          version: itinerary.version,
          itinerary,
        };
      }
    }

    const version = (existingTrip.current_version as number) + 1;
    const nextItinerary = enrichItineraryMetadata(itinerary, {
      tripId,
      version,
    });

    const { error: versionInsertError } = await client
      .from('trip_versions')
      .insert({
        trip_id: tripId,
        version,
        created_by: params.createdBy,
        created_from_run_id: params.createdFromRunId ?? null,
        base_version: params.baseVersion ?? null,
        change_type: params.changeType ?? 'create',
        itinerary_json: nextItinerary,
        summary_json: {
          title: nextItinerary.title ?? null,
          destinationSummary: nextItinerary.destinationSummary ?? null,
        },
        diff_from_base: null,
        completion_level: nextItinerary.completionLevel ?? null,
        verification_summary: nextItinerary.verificationSummary ?? null,
        generated_under_constraints: nextItinerary.generatedConstraints ?? null,
      });

    if (versionInsertError) {
      throw new Error(`Failed to persist trip version: ${versionInsertError.message}`);
    }

    const { error: tripUpdateError } = await client
      .from('trips')
      .update({
        user_id: params.userId ?? existingTrip.user_id,
        current_version: version,
        title: nextItinerary.title ?? null,
        destination_summary: nextItinerary.destinationSummary ?? {},
        trip_status: 'active' satisfies TripStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('trip_id', tripId);

    if (tripUpdateError) {
      throw new Error(`Failed to update trip head: ${tripUpdateError.message}`);
    }

    return {
      tripId,
      version,
      itinerary: nextItinerary,
    };
  }

  async ensureTripOwnership(tripId: string, userId: string): Promise<void> {
    const client = getClient();
    const { data: trip, error } = await client
      .from('trips')
      .select('user_id')
      .eq('trip_id', tripId)
      .single();

    if (error || !trip) {
      throw new Error(`Trip not found: ${tripId}`);
    }

    if (trip.user_id == null) {
      const { error: updateError } = await client
        .from('trips')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('trip_id', tripId);

      if (updateError) {
        throw new Error(`Failed to claim trip ownership: ${updateError.message}`);
      }
    }
  }

  async getTripVersion(
    tripId: string,
    userId?: string | null,
    version?: number,
  ): Promise<TripFetchResult | null> {
    const client = getClient();
    let tripQuery = client
      .from('trips')
      .select('trip_id, user_id, current_version, title, destination_summary, trip_status, created_at, updated_at')
      .eq('trip_id', tripId);

    if (userId) {
      tripQuery = tripQuery.eq('user_id', userId);
    } else {
      tripQuery = tripQuery.is('user_id', null);
    }

    const { data: trip, error: tripError } = await tripQuery.maybeSingle();

    if (tripError) {
      throw new Error(`Failed to load trip: ${tripError.message}`);
    }

    if (!trip) {
      return null;
    }

    const targetVersion = version ?? (trip.current_version as number);
    const { data: tripVersion, error: versionError } = await client
      .from('trip_versions')
      .select('itinerary_json, version')
      .eq('trip_id', tripId)
      .eq('version', targetVersion)
      .maybeSingle();

    if (versionError) {
      throw new Error(`Failed to load trip version: ${versionError.message}`);
    }

    if (!tripVersion) {
      return null;
    }

    return {
      trip: {
        tripId: trip.trip_id as string,
        userId: (trip.user_id as string | null) ?? null,
        currentVersion: trip.current_version as number,
        title: (trip.title as string | null) ?? null,
        destinationSummary: trip.destination_summary,
        tripStatus: normalizeTripStatus(trip.trip_status),
        createdAt: trip.created_at as string,
        updatedAt: trip.updated_at as string,
      },
      itinerary: tripVersion.itinerary_json as Itinerary,
    };
  }
}

export const tripService = new TripService();
