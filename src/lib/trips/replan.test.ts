import { describe, expect, it, vi } from 'vitest';
import type { Itinerary } from '@/types/itinerary';
import { enrichItineraryMetadata } from './metadata';
import { replanTripItinerary } from './replan';

vi.mock('@/lib/services/plan-mutation', () => ({
  regenerateItinerary: vi.fn(),
}));

import { regenerateItinerary } from '@/lib/services/plan-mutation';

const mockRegenerateItinerary = vi.mocked(regenerateItinerary);

function createItinerary(): Itinerary {
  return enrichItineraryMetadata({
    id: 'trip-itinerary-1',
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
            activityType: 'spot',
            metadata: {
              nodeId: 'blk_001',
            },
            fallbackCandidates: [
              {
                place: '石川県立美術館',
                reason: '屋内代替',
              },
            ],
          },
        ],
      },
    ],
  });
}

describe('replanTripItinerary', () => {
  it('replaces only the targeted block when AI regeneration succeeds', async () => {
    const itinerary = createItinerary();
    const candidate = enrichItineraryMetadata({
      ...itinerary,
      days: [
        {
          ...itinerary.days[0],
          blocks: [
            {
              blockId: 'blk_001',
              type: 'sightseeing',
              place: {
                name: '石川県立美術館',
              },
              reason: '屋内代替',
              sourceOfTruth: [],
              confidence: 0.7,
              needsConfirmation: true,
              verificationStatus: 'partial',
              fallbackCandidates: [],
              editableFields: ['place', 'reason'],
              riskFlags: [],
              bookingStatus: { type: 'not_required' },
            },
          ],
        },
      ],
    });

    mockRegenerateItinerary.mockResolvedValueOnce({
      ok: true,
      data: {
        itinerary: candidate,
        changedDestination: false,
        retryUsed: false,
      },
      meta: {
        mutationType: 'regeneration',
        durationMs: 10,
        warnings: [],
      },
    });

    const replanned = await replanTripItinerary({
      itinerary,
      scope: {
        type: 'block_replan',
        dayIndex: 0,
        blockId: 'blk_001',
      },
      instruction: '雨なので屋内に変えたい',
    });

    expect(replanned.days[0].blocks?.[0].place?.name).toBe('石川県立美術館');
    expect(replanned.days[0].blocks?.[0].reason).toBe('屋内代替');
    expect(replanned.days[0].activities[0].activity).toBe('石川県立美術館');
  });

  it('accepts legacy weather_fallback scopes and normalizes them internally', async () => {
    vi.clearAllMocks();
    const itinerary = createItinerary();
    mockRegenerateItinerary.mockResolvedValueOnce({
      ok: true,
      data: {
        itinerary,
        changedDestination: false,
        retryUsed: false,
      },
      meta: {
        mutationType: 'regeneration',
        durationMs: 10,
        warnings: [],
      },
    });

    const replanned = await replanTripItinerary({
      itinerary,
      scope: {
        type: 'weather_fallback',
        dayIndex: 0,
      },
      instruction: '雨天対応にして',
    });

    expect(replanned.days[0].title).toBe(itinerary.days[0].title);
    expect(mockRegenerateItinerary).toHaveBeenCalledOnce();
  });
});
