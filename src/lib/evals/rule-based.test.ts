import { describe, expect, it } from 'vitest';
import type { Itinerary } from '@/types/itinerary';
import { evaluateItineraryRuleBased } from './rule-based';

function createItinerary(): Itinerary {
  return {
    id: 'itin-1',
    destination: '金沢',
    description: '金沢の旅',
    days: [
      {
        day: 1,
        title: 'Day 1',
        activities: [
          {
            time: '10:00',
            activity: '兼六園',
            description: '庭園を散策',
          },
        ],
        blocks: [
          {
            blockId: 'blk_001',
            startAt: '10:00',
            type: 'sightseeing',
            place: {
              name: '兼六園',
            },
            reason: '庭園を散策',
            sourceOfTruth: [],
            confidence: 0.8,
            needsConfirmation: false,
            verificationStatus: 'verified',
            fallbackCandidates: [],
            editableFields: ['startAt', 'place', 'reason'],
            riskFlags: [],
            bookingStatus: {
              type: 'not_required',
            },
          },
        ],
      },
    ],
    verificationSummary: {
      verifiedActivities: 1,
      partialActivities: 0,
      unknownActivities: 0,
      needsConfirmationCount: 0,
    },
  };
}

describe('evaluateItineraryRuleBased', () => {
  it('calculates completion and verification metrics', () => {
    const metrics = evaluateItineraryRuleBased(createItinerary());
    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricName: 'itinerary_completion_rate', metricValue: 1 }),
        expect.objectContaining({ metricName: 'verification_coverage', metricValue: 1 }),
        expect.objectContaining({ metricName: 'feasibility_rate', metricValue: 1 }),
      ]),
    );
  });

  it('adds user_edit_rate for patch context', () => {
    const metrics = evaluateItineraryRuleBased(createItinerary(), {
      mutationType: 'patch',
    });

    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricName: 'user_edit_rate', metricValue: 1 }),
      ]),
    );
  });

  it('adds replan_success_rate for replan context', () => {
    const metrics = evaluateItineraryRuleBased(createItinerary(), {
      mutationType: 'replan',
      replanSucceeded: true,
    });

    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricName: 'replan_success_rate', metricValue: 1 }),
      ]),
    );
  });
});
