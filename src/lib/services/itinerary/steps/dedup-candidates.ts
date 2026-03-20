/**
 * Post-hoc deduplication for spot candidates generated in parallel.
 * Uses normalizePlaceKey for fuzzy name matching.
 */

import type { SemanticCandidate } from '@/types/itinerary-pipeline';
import { normalizePlaceKey } from '../destination-highlights';

/**
 * Deduplicate candidates by normalized name/searchQuery.
 * Keeps the first occurrence (highest priority by order).
 */
export function deduplicateCandidates(
  candidates: SemanticCandidate[],
): SemanticCandidate[] {
  const seen = new Set<string>();
  const result: SemanticCandidate[] = [];

  for (const candidate of candidates) {
    const key = normalizePlaceKey(candidate.searchQuery || candidate.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }

  return result;
}
