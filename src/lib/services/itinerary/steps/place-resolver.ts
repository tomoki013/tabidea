/**
 * Step 3: Place Resolver
 * Google Places API で SemanticCandidate を実在スポットに照合
 * Feature flag ENABLE_COMPOSE_PLACE_RESOLVE で ON/OFF 可能
 */

import type {
  SemanticCandidate,
  ResolvedPlaceGroup,
  ResolvedPlace,
} from '@/types/itinerary-pipeline';
import { getGooglePlacesService } from '@/lib/services/google/places';
import { DEFAULT_TOP_K, DEFAULT_RESOLVE_DELAY_MS } from '../constants';

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
  options?: { topK?: number; delayMs?: number; maxCandidates?: number }
): Promise<ResolvedPlaceGroup[]> {
  const topK = options?.topK ?? DEFAULT_TOP_K;
  const delayMs = options?.delayMs ?? DEFAULT_RESOLVE_DELAY_MS;
  const maxCandidates = options?.maxCandidates;

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
  const candidatesToResolve =
    typeof maxCandidates === 'number' && maxCandidates > 0 && maxCandidates < candidates.length
      ? prioritizeCandidates(candidates).slice(0, maxCandidates)
      : candidates;

  const queries = candidatesToResolve.map((c) => ({
    searchQuery: c.searchQuery,
    near: destination,
    locationEn: c.locationEn,
  }));

  const searchResults = await placesService.searchPlaceMulti(queries, {
    topK,
    delayMs,
  });

  // 結果を ResolvedPlaceGroup[] に変換
  const resolvedCandidateQueries = new Set(candidatesToResolve.map((candidate) => candidate.searchQuery));

  return candidates.map((candidate) => {
    if (!resolvedCandidateQueries.has(candidate.searchQuery)) {
      return {
        candidate,
        resolved: [],
        success: false,
        error: 'Place resolve skipped due to time limit',
      };
    }

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

function prioritizeCandidates(candidates: SemanticCandidate[]): SemanticCandidate[] {
  return [...candidates].sort((a, b) => {
    const roleRank = getRoleRank(a.role) - getRoleRank(b.role);
    if (roleRank !== 0) return roleRank;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.dayHint - b.dayHint;
  });
}

function getRoleRank(role: SemanticCandidate['role']): number {
  switch (role) {
    case 'must_visit':
      return 0;
    case 'recommended':
      return 1;
    case 'accommodation':
      return 2;
    case 'meal':
      return 3;
    case 'filler':
      return 4;
    default:
      return 5;
  }
}
