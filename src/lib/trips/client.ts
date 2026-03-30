import type { Itinerary } from '@/types';
import type { TripPatchOperation } from '@/lib/trips/patch';
import type { TripReplanScope } from '@/lib/trips/replan';

interface TripFetchResponse {
  trip: {
    tripId: string;
    currentVersion: number;
  };
  itinerary: Itinerary;
}

interface TripPatchResponse {
  tripId: string;
  newVersion: number;
  appliedPatchCount: number;
  itinerary: Itinerary;
}

interface TripReplanResponse {
  tripId: string;
  newVersion: number;
  scope: TripReplanScope;
  itinerary: Itinerary;
}

type ApiErrorPayload =
  | { error?: string }
  | {
    error?: {
      code?: string;
      message?: string;
    };
  };

function resolveApiErrorMessage(payload: ApiErrorPayload | null, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (
    payload.error
    && typeof payload.error === 'object'
    && typeof payload.error.code === 'string'
    && payload.error.code.trim()
  ) {
    return payload.error.code;
  }

  if (
    payload.error
    && typeof payload.error === 'object'
    && typeof payload.error.message === 'string'
    && payload.error.message.trim()
  ) {
    return payload.error.message;
  }

  return fallback;
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTripItinerary(
  tripId: string,
  version?: number,
): Promise<Itinerary> {
  const url = new URL(`/api/trips/${tripId}`, window.location.origin);
  if (typeof version === 'number' && Number.isFinite(version)) {
    url.searchParams.set('version', String(version));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await parseJsonSafely<TripFetchResponse | ApiErrorPayload>(response);

  if (!response.ok || !payload || !('itinerary' in payload)) {
    throw new Error(resolveApiErrorMessage(payload as ApiErrorPayload | null, 'trip_fetch_failed'));
  }

  return payload.itinerary;
}

export async function patchTripItinerary(params: {
  tripId: string;
  baseVersion: number;
  patches: TripPatchOperation[];
  editor?: 'user' | 'system';
  idempotencyKey?: string;
}): Promise<TripPatchResponse> {
  const response = await fetch(`/api/trips/${params.tripId}/patch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      baseVersion: params.baseVersion,
      patches: params.patches,
      editor: params.editor ?? 'user',
      idempotencyKey: params.idempotencyKey,
    }),
  });

  const payload = await parseJsonSafely<TripPatchResponse | ApiErrorPayload>(response);
  if (!response.ok || !payload || !('itinerary' in payload)) {
    throw new Error(resolveApiErrorMessage(payload as ApiErrorPayload | null, 'trip_patch_failed'));
  }

  return payload;
}

export async function replanTripItinerary(params: {
  tripId: string;
  baseVersion: number;
  scope: TripReplanScope;
  instruction: string;
  reason?: string;
  idempotencyKey?: string;
}): Promise<TripReplanResponse> {
  const response = await fetch(`/api/trips/${params.tripId}/replan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      baseVersion: params.baseVersion,
      scope: params.scope,
      instruction: params.instruction,
      reason: params.reason ?? 'user_edit',
      idempotencyKey: params.idempotencyKey,
    }),
  });

  const payload = await parseJsonSafely<TripReplanResponse | ApiErrorPayload>(response);
  if (!response.ok || !payload || !('itinerary' in payload)) {
    throw new Error(resolveApiErrorMessage(payload as ApiErrorPayload | null, 'trip_replan_failed'));
  }

  return payload;
}
