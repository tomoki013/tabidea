import { describe, expect, it } from 'vitest';
import type { Itinerary } from '@/types/itinerary';
import { enrichItineraryMetadata } from './metadata';
import { applyTripPatch } from './patch';

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
          },
        ],
      },
    ],
  });
}

describe('applyTripPatch', () => {
  it('updates block fields and synchronizes activities', () => {
    const itinerary = createItinerary();

    const patched = applyTripPatch(itinerary, [
      {
        op: 'replace',
        path: '/days/0/blocks/0/reason',
        value: '雨の日向けに美術館へ変更',
      },
      {
        op: 'replace',
        path: '/days/0/blocks/0/place/name',
        value: '金沢21世紀美術館',
      },
    ]);

    expect(patched.days[0].blocks?.[0].reason).toBe('雨の日向けに美術館へ変更');
    expect(patched.days[0].blocks?.[0].place?.name).toBe('金沢21世紀美術館');
    expect(patched.days[0].activities[0].activity).toBe('金沢21世紀美術館');
    expect(patched.days[0].activities[0].description).toBe('雨の日向けに美術館へ変更');
  });

  it('rejects invalid patch paths', () => {
    const itinerary = createItinerary();

    expect(() =>
      applyTripPatch(itinerary, [
        {
          op: 'replace',
          path: '/unknown/path',
          value: 'x',
        },
      ]),
    ).toThrow('invalid_patch_path:/unknown/path');
  });
});
