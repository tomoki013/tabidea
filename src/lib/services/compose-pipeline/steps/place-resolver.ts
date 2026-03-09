/**
 * Step 3: Place Resolver
 * Google Places API で SemanticCandidate を実在スポットに照合
 * Feature flag ENABLE_COMPOSE_PLACE_RESOLVE で ON/OFF 可能
 */

import type {
  SemanticCandidate,
  ResolvedPlaceGroup,
  ResolvedPlace,
} from '@/types/compose-pipeline';
import { getGooglePlacesService } from '@/lib/services/google/places';

// ============================================
// Public API
// ============================================

/**
 * Place Resolver の実行判定
 */
export function isPlaceResolveEnabled(): boolean {
  return process.env.ENABLE_COMPOSE_PLACE_RESOLVE === 'true';
}

/**
 * SemanticCandidate[] を Places API で照合
 */
export async function resolvePlaces(
  candidates: SemanticCandidate[],
  destination: string,
  options?: { topK?: number; delayMs?: number }
): Promise<ResolvedPlaceGroup[]> {
  const topK = options?.topK ?? 1;
  const delayMs = options?.delayMs ?? 100;

  let placesService;
  try {
    placesService = getGooglePlacesService();
  } catch {
    // API key not configured — return all as failed
    console.warn('[place-resolver] GooglePlacesService not available');
    return candidates.map((candidate) => ({
      candidate,
      resolved: [],
      success: false,
      error: 'Google Places API not configured',
    }));
  }

  // 一括検索
  const queries = candidates.map((c) => ({
    searchQuery: c.searchQuery,
    near: destination,
    locationEn: c.locationEn,
  }));

  const searchResults = await placesService.searchPlaceMulti(queries, {
    topK,
    delayMs,
  });

  // 結果を ResolvedPlaceGroup[] に変換
  return candidates.map((candidate) => {
    const results = searchResults.get(candidate.searchQuery) || [];
    const resolved: ResolvedPlace[] = results
      .filter((r) => r.found && r.place)
      .map((r) => ({
        placeDetails: r.place!,
        matchScore: r.matchScore || 0,
      }));

    return {
      candidate,
      resolved,
      success: resolved.length > 0,
      error: resolved.length === 0
        ? results[0]?.error || 'No matching place found'
        : undefined,
    };
  });
}
