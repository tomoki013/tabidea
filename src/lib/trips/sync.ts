import type {
  Activity,
  ActivityType,
  DayPlan,
  Itinerary,
  ItineraryBlock,
  TimelineItem,
} from '@/types/itinerary';
import { enrichItineraryMetadata } from './metadata';

function mapBlockTypeToActivityType(blockType: ItineraryBlock['type']): ActivityType {
  switch (blockType) {
    case 'meal':
      return 'meal';
    case 'hotel':
      return 'accommodation';
    case 'move':
      return 'transit';
    case 'rest':
    case 'buffer':
      return 'other';
    case 'sightseeing':
    default:
      return 'spot';
  }
}

function buildActivityFromBlock(
  block: ItineraryBlock,
  index: number,
  existing?: Activity,
): Activity {
  return {
    ...existing,
    time: block.startAt ?? existing?.time ?? '',
    activity: block.place?.name ?? existing?.activity ?? `${block.type}-${index + 1}`,
    description: block.reason,
    activityType: mapBlockTypeToActivityType(block.type),
    searchQuery: block.place?.name ?? existing?.searchQuery,
    validation: {
      ...existing?.validation,
      isVerified: existing?.validation?.isVerified ?? block.verificationStatus === 'verified',
      confidence:
        existing?.validation?.confidence
        ?? (block.verificationStatus === 'verified'
          ? 'high'
          : block.verificationStatus === 'partial'
            ? 'medium'
            : 'unverified'),
      spotName:
        block.place?.name
        ?? existing?.validation?.spotName
        ?? existing?.activity
        ?? `${block.type}-${index + 1}`,
      placeId: block.place?.placeId ?? existing?.validation?.placeId,
      details: {
        ...existing?.validation?.details,
        latitude: block.place?.latitude ?? existing?.validation?.details?.latitude,
        longitude: block.place?.longitude ?? existing?.validation?.details?.longitude,
        address: block.place?.address ?? existing?.validation?.details?.address,
      },
    },
    metadata: {
      ...(existing?.metadata ?? {}),
      nodeId: block.blockId,
      semanticId: block.blockId,
    },
    sourceOfTruth: block.sourceOfTruth,
    confidence: block.confidence,
    needsConfirmation: block.needsConfirmation,
    verificationStatus: block.verificationStatus,
    fallbackCandidates: block.fallbackCandidates,
    editableFields: block.editableFields,
    riskFlags: block.riskFlags,
    bookingStatus: block.bookingStatus,
  };
}

function rebuildTimelineItems(day: DayPlan): TimelineItem[] {
  const activityItems: TimelineItem[] = day.activities.map((activity) => ({
    itemType: 'activity',
    data: activity,
  }));

  if (day.transit) {
    return [
      {
        itemType: 'transit',
        data: day.transit,
        time: day.transit.departure.time,
      },
      ...activityItems,
    ];
  }

  return activityItems;
}

export function synchronizeItineraryStructures(
  itinerary: Itinerary,
  previous?: Itinerary,
): Itinerary {
  const previousDays = previous?.days ?? [];

  const syncedDays = (itinerary.days ?? []).map((day, dayIndex) => {
    const previousDay = previousDays[dayIndex];
    const existingActivitiesByBlockId = new Map<string, Activity>();

    for (const activity of previousDay?.activities ?? []) {
      const blockId =
        (typeof activity.metadata?.nodeId === 'string' && activity.metadata.nodeId)
        || (typeof activity.metadata?.semanticId === 'string' && activity.metadata.semanticId);
      if (blockId) {
        existingActivitiesByBlockId.set(blockId, activity);
      }
    }

    const blocks = day.blocks ?? [];
    if (blocks.length === 0) {
      return day;
    }

    const activities = blocks.map((block, index) =>
      buildActivityFromBlock(block, index, existingActivitiesByBlockId.get(block.blockId) ?? previousDay?.activities[index]),
    );

    return {
      ...day,
      activities,
      timelineItems: rebuildTimelineItems({
        ...day,
        activities,
      }),
    };
  });

  return enrichItineraryMetadata({
    ...itinerary,
    days: syncedDays,
  });
}
