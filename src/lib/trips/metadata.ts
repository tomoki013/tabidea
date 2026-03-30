import type {
  Activity,
  ActivityType,
  ItineraryBlock,
  ItineraryBlockType,
  ActivityVerificationStatus,
  Itinerary,
  ItineraryBookingStatus,
  ItineraryCompletionLevel,
  ItineraryFallbackCandidate,
  ItinerarySourceOfTruth,
  ItineraryVerificationSummary,
} from '@/types/itinerary';

const DEFAULT_EDITABLE_FIELDS = ['time', 'activity', 'description'];

function inferVerificationStatus(activity: Activity): ActivityVerificationStatus {
  if (activity.verificationStatus) {
    return activity.verificationStatus;
  }

  if (activity.validation?.isVerified) {
    return 'verified';
  }

  return 'unknown';
}

function inferSourceOfTruth(activity: Activity): ItinerarySourceOfTruth[] {
  if (activity.sourceOfTruth && activity.sourceOfTruth.length > 0) {
    return activity.sourceOfTruth;
  }

  if (activity.validation?.source === 'google_places') {
    return [
      {
        kind: 'tool',
        tool: 'get_place_details',
        provider: 'google_places',
      },
    ];
  }

  if (activity.source?.type === 'blog') {
    return [{ kind: 'knowledge', provider: 'blog' }];
  }

  if (activity.source?.type === 'golden_plan') {
    return [{ kind: 'system', provider: 'golden_plan' }];
  }

  return [{ kind: 'llm', provider: 'tabidea_ai' }];
}

function inferConfidence(activity: Activity, verificationStatus: ActivityVerificationStatus): number {
  if (typeof activity.confidence === 'number') {
    return activity.confidence;
  }

  switch (verificationStatus) {
    case 'verified':
      return 0.9;
    case 'partial':
      return 0.7;
    case 'unknown':
    default:
      return 0.45;
  }
}

function inferNeedsConfirmation(activity: Activity, verificationStatus: ActivityVerificationStatus): boolean {
  if (typeof activity.needsConfirmation === 'boolean') {
    return activity.needsConfirmation;
  }

  return verificationStatus !== 'verified';
}

function inferFallbackCandidates(activity: Activity): ItineraryFallbackCandidate[] {
  return activity.fallbackCandidates ?? [];
}

function inferEditableFields(activity: Activity): string[] {
  return activity.editableFields ?? [...DEFAULT_EDITABLE_FIELDS];
}

function inferRiskFlags(activity: Activity, verificationStatus: ActivityVerificationStatus): string[] {
  const riskFlags = new Set(activity.riskFlags ?? []);

  if (verificationStatus === 'unknown') {
    riskFlags.add('verification_pending');
  }

  if (activity.activityType === 'spot' && !activity.validation?.isVerified) {
    riskFlags.add('place_unverified');
  }

  return [...riskFlags];
}

function inferBookingStatus(activityType?: ActivityType, existing?: ItineraryBookingStatus): ItineraryBookingStatus {
  if (existing) {
    return existing;
  }

  if (activityType === 'accommodation') {
    return { type: 'optional' };
  }

  return { type: 'not_required' };
}

function mapActivityTypeToBlockType(activityType?: ActivityType): ItineraryBlockType {
  switch (activityType) {
    case 'meal':
      return 'meal';
    case 'accommodation':
      return 'hotel';
    case 'other':
      return 'rest';
    case 'spot':
    case 'transit':
    default:
      return 'sightseeing';
  }
}

function buildBlocks(activities: Activity[]): ItineraryBlock[] {
  return activities.map((activity, index) => ({
    blockId:
      (typeof activity.metadata?.nodeId === 'string' && activity.metadata.nodeId)
      || (typeof activity.metadata?.semanticId === 'string' && activity.metadata.semanticId)
      || `block-${index + 1}`,
    startAt: activity.time,
    endAt: undefined,
    type: mapActivityTypeToBlockType(activity.activityType),
    place: {
      name: activity.searchQuery ?? activity.activity,
      placeId: activity.validation?.placeId,
      latitude: activity.validation?.details?.latitude,
      longitude: activity.validation?.details?.longitude,
      address: activity.validation?.details?.address,
    },
    reason: activity.description,
    sourceOfTruth: activity.sourceOfTruth ?? [],
    confidence: activity.confidence ?? 0.45,
    needsConfirmation: activity.needsConfirmation ?? true,
    verificationStatus: activity.verificationStatus ?? 'unknown',
    fallbackCandidates: activity.fallbackCandidates ?? [],
    editableFields: activity.editableFields ?? [...DEFAULT_EDITABLE_FIELDS],
    riskFlags: activity.riskFlags ?? [],
    bookingStatus: activity.bookingStatus ?? { type: 'not_required' },
  }));
}

export function enrichActivityMetadata(activity: Activity): Activity {
  const verificationStatus = inferVerificationStatus(activity);

  return {
    ...activity,
    sourceOfTruth: inferSourceOfTruth(activity),
    confidence: inferConfidence(activity, verificationStatus),
    needsConfirmation: inferNeedsConfirmation(activity, verificationStatus),
    verificationStatus,
    fallbackCandidates: inferFallbackCandidates(activity),
    editableFields: inferEditableFields(activity),
    riskFlags: inferRiskFlags(activity, verificationStatus),
    bookingStatus: inferBookingStatus(activity.activityType, activity.bookingStatus),
  };
}

export function summarizeItineraryVerification(itinerary: Itinerary): ItineraryVerificationSummary {
  const days = itinerary.days ?? [];
  const summary: ItineraryVerificationSummary = {
    verifiedActivities: 0,
    partialActivities: 0,
    unknownActivities: 0,
    needsConfirmationCount: 0,
  };

  for (const day of days) {
    for (const activity of day.activities) {
      const verificationStatus = inferVerificationStatus(activity);
      if (verificationStatus === 'verified') {
        summary.verifiedActivities += 1;
      } else if (verificationStatus === 'partial') {
        summary.partialActivities += 1;
      } else {
        summary.unknownActivities += 1;
      }

      if (inferNeedsConfirmation(activity, verificationStatus)) {
        summary.needsConfirmationCount += 1;
      }
    }
  }

  return summary;
}

export function inferCompletionLevel(summary: ItineraryVerificationSummary): ItineraryCompletionLevel {
  const totalActivities =
    summary.verifiedActivities + summary.partialActivities + summary.unknownActivities;

  if (totalActivities === 0) {
    return 'draft_only';
  }

  if (summary.unknownActivities === 0 && summary.partialActivities === 0) {
    return 'fully_verified';
  }

  if (summary.verifiedActivities > 0 || summary.partialActivities > 0) {
    return 'partial_verified';
  }

  return 'draft_only';
}

export function enrichItineraryMetadata(
  itinerary: Itinerary,
  overrides: Partial<
    Pick<
      Itinerary,
      | 'tripId'
      | 'version'
      | 'title'
      | 'completionLevel'
      | 'generationStatus'
      | 'memoryApplied'
      | 'generatedConstraints'
      | 'destinationSummary'
      | 'scores'
    >
  > = {},
): Itinerary {
  const rawDays = itinerary.days ?? [];
  const days = rawDays.map((day) => {
    const activities = day.activities.map(enrichActivityMetadata);
    return {
      ...day,
      activities,
      blocks: day.blocks ?? buildBlocks(activities),
    };
  });

  const withActivities: Itinerary = {
    ...itinerary,
    days,
  };

  const verificationSummary = summarizeItineraryVerification(withActivities);
  const completionLevel = overrides.completionLevel
    ?? itinerary.completionLevel
    ?? inferCompletionLevel(verificationSummary);

  return {
    ...withActivities,
    tripId: overrides.tripId ?? itinerary.tripId,
    version: overrides.version ?? itinerary.version,
    title: overrides.title ?? itinerary.title ?? `${itinerary.destination} ${rawDays.length}日間の旅程`,
    completionLevel,
    generationStatus: overrides.generationStatus ?? itinerary.generationStatus ?? 'completed',
    memoryApplied: overrides.memoryApplied ?? itinerary.memoryApplied ?? false,
    generatedConstraints: {
      ...(itinerary.generatedConstraints ?? {}),
      ...(overrides.generatedConstraints ?? {}),
    },
    destinationSummary: overrides.destinationSummary ?? itinerary.destinationSummary ?? {
      primaryDestination: itinerary.destination,
      durationDays: rawDays.length,
    },
    verificationSummary,
    scores: overrides.scores ?? itinerary.scores,
  };
}
