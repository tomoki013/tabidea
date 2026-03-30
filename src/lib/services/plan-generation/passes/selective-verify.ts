/**
 * Pass E: Selective Verify
 * DraftPlan のストップを Google Places API で検証する。
 * resolvePlaces() を直接呼び出し、結果を VerifiedEntity[] に変換。
 */

import type {
  PassContext,
  PassResult,
  VerifiedEntity,
  VerificationLevel,
  VerificationStatus,
  DraftStop,
  DraftDay,
} from '@/types/plan-generation';
import type { ResolvedPlaceGroup } from '@/types/itinerary-pipeline';
import { PlacesApiError } from '@/types/places';
import { GooglePlacesService } from '@/lib/services/google/places';
import { resolvePlaces } from '@/lib/services/itinerary/steps/place-resolver';
import { draftStopToSemanticCandidate } from '../transform/draft-to-timeline';

// ============================================
// Verification Thresholds
// ============================================

const HIGH_MATCH_SCORE = 0.7;
const WEAK_MATCH_SCORE = 0.4;
const ESTIMATED_MS_PER_STOP = 800;

// ============================================
// Priority Sorting
// ============================================

interface StopWithDay {
  stop: DraftStop;
  day: number;
}

function prioritizeStoops(plan: { days: DraftDay[] }): StopWithDay[] {
  const all: StopWithDay[] = plan.days.flatMap(d =>
    d.stops.map(s => ({ stop: s, day: d.day })),
  );

  return all.sort((a, b) => {
    // must_visit first
    if (a.stop.role === 'must_visit' && b.stop.role !== 'must_visit') return -1;
    if (a.stop.role !== 'must_visit' && b.stop.role === 'must_visit') return 1;
    // low confidence next
    const confOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const confDiff = (confOrder[a.stop.aiConfidence] ?? 1) - (confOrder[b.stop.aiConfidence] ?? 1);
    if (confDiff !== 0) return confDiff;
    // meal next
    if (a.stop.role === 'meal' && b.stop.role !== 'meal') return -1;
    if (a.stop.role !== 'meal' && b.stop.role === 'meal') return 1;
    return 0;
  });
}

// ============================================
// Result Conversion
// ============================================

function resolvedGroupToEntity(
  group: ResolvedPlaceGroup,
  stopInfo: StopWithDay,
): VerifiedEntity {
  const now = new Date().toISOString();

  if (!group.success || group.resolved.length === 0) {
    return {
      draftId: stopInfo.stop.draftId,
      stopName: stopInfo.stop.name,
      day: stopInfo.day,
      status: 'unverifiable',
      level: 'L0_unverified',
      verifiedAt: now,
    };
  }

  const best = group.resolved[0];
  const matchScore = best.matchScore ?? 0;
  const place = best.placeDetails;

  // Check business status
  if (place?.businessStatus === 'CLOSED_PERMANENTLY') {
    return {
      draftId: stopInfo.stop.draftId,
      stopName: stopInfo.stop.name,
      day: stopInfo.day,
      status: 'invalid',
      level: 'L1_entity_found',
      details: {
        placeId: place.placeId,
        latitude: place.latitude,
        longitude: place.longitude,
        formattedAddress: place.formattedAddress,
        rating: place.rating,
        businessStatus: place.businessStatus,
        existenceConfirmed: true,
      },
      verifiedAt: now,
    };
  }

  let status: VerificationStatus;
  let level: VerificationLevel;
  if (matchScore >= HIGH_MATCH_SCORE) {
    status = 'confirmed';
    level = 'L1_entity_found';
  } else if (matchScore >= WEAK_MATCH_SCORE) {
    status = 'weakly_confirmed';
    level = 'L1_entity_found';
  } else {
    status = 'weakly_confirmed';
    level = 'L0_unverified';
  }

  // Check opening hours
  const hasHours = place?.openingHours != null;
  if (status === 'confirmed' && hasHours) {
    level = 'L2_hours_checked';
  }

  return {
    draftId: stopInfo.stop.draftId,
    stopName: stopInfo.stop.name,
    day: stopInfo.day,
    status,
    level,
    details: place ? {
      placeId: place.placeId,
      latitude: place.latitude,
      longitude: place.longitude,
      formattedAddress: place.formattedAddress,
      rating: place.rating,
      businessStatus: place.businessStatus,
      existenceConfirmed: true,
      openingHoursChecked: hasHours,
    } : undefined,
    verifiedAt: now,
  };
}

// ============================================
// Pass Implementation
// ============================================

export async function selectiveVerifyPass(
  ctx: PassContext,
): Promise<PassResult<VerifiedEntity[]>> {
  const start = Date.now();

  const { draftPlan } = ctx.session;
  if (!draftPlan) {
    return {
      outcome: 'failed_terminal',
      warnings: ['Missing draftPlan for verification'],
      durationMs: Date.now() - start,
    };
  }

  // ストップを優先度順にソート
  const prioritized = prioritizeStoops(draftPlan);

  // 残り時間からバジェット算出
  const remainingMs = ctx.budget.remainingMs();
  const maxCandidates = Math.max(
    1,
    Math.floor(remainingMs / ESTIMATED_MS_PER_STOP),
  );
  const stopsToVerify = prioritized.slice(0, maxCandidates);

  // SemanticCandidate[] に変換
  const candidates = stopsToVerify.map(({ stop, day }) =>
    draftStopToSemanticCandidate(stop, day),
  );

  const warnings: string[] = [];

  if (stopsToVerify.length < prioritized.length) {
    warnings.push(
      `Budget limited: verified ${stopsToVerify.length}/${prioritized.length} stops`,
    );
  }

  let groups: ResolvedPlaceGroup[];
  try {
    groups = await resolvePlaces(candidates, draftPlan.destination, {
      topK: 1,
      maxCandidates: candidates.length,
    });
  } catch (err) {
    // Places API が完全に使えない場合は全て unverifiable
    const quotaExceeded =
      err instanceof PlacesApiError
        ? GooglePlacesService.isQuotaExceededCode(err.code)
        : String(err).includes('OVER_QUERY_LIMIT');

    warnings.push(
      quotaExceeded
        ? `warning_code:${GooglePlacesService.getQuotaExceededWarningCode()}`
        : `Places API error: ${err instanceof Error ? err.message : String(err)}`,
    );
    const entities: VerifiedEntity[] = prioritized.map(({ stop, day }) => ({
      draftId: stop.draftId,
      stopName: stop.name,
      day,
      status: 'unverifiable' as const,
      level: 'L0_unverified' as const,
      verifiedAt: new Date().toISOString(),
    }));
    return {
      outcome: 'completed',
      data: entities,
      warnings,
      durationMs: Date.now() - start,
    };
  }

  // 検証済みエンティティに変換
  const verifiedEntities: VerifiedEntity[] = [];

  for (let i = 0; i < groups.length; i++) {
    verifiedEntities.push(resolvedGroupToEntity(groups[i], stopsToVerify[i]));
  }

  // 検証できなかったストップも unverifiable として追加
  const verifiedIds = new Set(verifiedEntities.map(v => v.draftId));
  for (const { stop, day } of prioritized) {
    if (!verifiedIds.has(stop.draftId)) {
      verifiedEntities.push({
        draftId: stop.draftId,
        stopName: stop.name,
        day,
        status: 'unverifiable',
        level: 'L0_unverified',
        verifiedAt: new Date().toISOString(),
      });
    }
  }

  const confirmed = verifiedEntities.filter(v => v.status === 'confirmed').length;
  const invalid = verifiedEntities.filter(v => v.status === 'invalid').length;
  if (invalid > 0) {
    warnings.push(`${invalid} stop(s) marked as invalid (permanently closed)`);
  }

  return {
    outcome: 'completed',
    data: verifiedEntities,
    warnings,
    durationMs: Date.now() - start,
    metadata: {
      totalStops: prioritized.length,
      verified: stopsToVerify.length,
      confirmed,
      invalid,
    },
  };
}
