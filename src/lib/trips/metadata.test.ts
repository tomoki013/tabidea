import { describe, expect, it } from 'vitest';
import type { Itinerary } from '@/types/itinerary';
import {
  enrichActivityMetadata,
  enrichItineraryMetadata,
  inferCompletionLevel,
  summarizeItineraryVerification,
} from './metadata';

function createItinerary(overrides: Partial<Itinerary> = {}): Itinerary {
  return {
    id: 'itinerary-1',
    destination: '金沢',
    description: '金沢の旅',
    days: [
      {
        day: 1,
        title: 'Day 1',
        activities: [
          {
            time: '10:00',
            activity: '兼六園を散策',
            description: '朝の庭園を歩く',
            activityType: 'spot',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('trip metadata helpers', () => {
  it('enrichActivityMetadata fills verification defaults', () => {
    const activity = enrichActivityMetadata({
      time: '10:00',
      activity: '兼六園を散策',
      description: '朝の庭園を歩く',
      activityType: 'spot',
    });

    expect(activity.verificationStatus).toBe('unknown');
    expect(activity.needsConfirmation).toBe(true);
    expect(activity.sourceOfTruth).toEqual([{ kind: 'llm', provider: 'tabidea_ai' }]);
    expect(activity.riskFlags).toContain('verification_pending');
    expect(activity.riskFlags).toContain('place_unverified');
    expect(activity.bookingStatus).toEqual({ type: 'not_required' });
  });

  it('summarizeItineraryVerification counts verification states', () => {
    const itinerary = createItinerary({
      days: [
        {
          day: 1,
          title: 'Day 1',
          activities: [
            {
              time: '10:00',
              activity: '兼六園',
              description: 'verified',
              verificationStatus: 'verified',
            },
            {
              time: '13:00',
              activity: 'ひがし茶屋街',
              description: 'partial',
              verificationStatus: 'partial',
            },
            {
              time: '16:00',
              activity: '金沢城',
              description: 'unknown',
              verificationStatus: 'unknown',
            },
          ],
        },
      ],
    });

    expect(summarizeItineraryVerification(itinerary)).toEqual({
      verifiedActivities: 1,
      partialActivities: 1,
      unknownActivities: 1,
      needsConfirmationCount: 2,
    });
  });

  it('inferCompletionLevel returns partial_verified when some verification exists', () => {
    expect(inferCompletionLevel({
      verifiedActivities: 1,
      partialActivities: 0,
      unknownActivities: 1,
      needsConfirmationCount: 1,
    })).toBe('partial_verified');
  });

  it('enrichItineraryMetadata adds root defaults', () => {
    const itinerary = enrichItineraryMetadata(createItinerary(), {
      generatedConstraints: {
        runtimeLimitMs: 30000,
        toolBudgetMode: 'safe',
      },
    });

    expect(itinerary.title).toBe('金沢 1日間の旅程');
    expect(itinerary.destinationSummary).toEqual({
      primaryDestination: '金沢',
      durationDays: 1,
    });
    expect(itinerary.completionLevel).toBe('draft_only');
    expect(itinerary.generationStatus).toBe('completed');
    expect(itinerary.memoryApplied).toBe(false);
    expect(itinerary.generatedConstraints).toEqual({
      runtimeLimitMs: 30000,
      toolBudgetMode: 'safe',
    });
    expect(itinerary.verificationSummary).toEqual({
      verifiedActivities: 0,
      partialActivities: 0,
      unknownActivities: 1,
      needsConfirmationCount: 1,
    });
    expect(itinerary.days[0].blocks).toHaveLength(1);
    expect(itinerary.days[0].blocks?.[0]).toMatchObject({
      type: 'sightseeing',
      startAt: '10:00',
      verificationStatus: 'unknown',
      needsConfirmation: true,
    });
  });
});
