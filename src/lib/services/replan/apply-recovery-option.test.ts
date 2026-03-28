import { describe, expect, it } from 'vitest';

import type { Itinerary, RecoveryOption } from '@/types';
import { applyRecoveryOption } from './apply-recovery-option';

function createItinerary(): Itinerary {
  return {
    id: 'itin-1',
    destination: 'Kyoto',
    description: 'Trip',
    days: [
      {
        day: 1,
        title: 'Day 1',
        activities: [
          { time: '10:00', activity: 'Temple', description: 'Old temple' },
          { time: '12:00', activity: 'Lunch', description: 'Lunch stop' },
          { time: '14:00', activity: 'Shrine', description: 'Walk around' },
        ],
      },
    ],
  };
}

function createRecoveryOption(overrides: Partial<RecoveryOption> = {}): RecoveryOption {
  return {
    id: 'opt-1',
    explanation: 'Move indoors',
    estimatedDuration: '2 hours',
    category: 'indoor',
    replacementSlots: [
      {
        id: 'slot-1',
        dayNumber: 1,
        slotIndex: 1,
        startTime: '12:00',
        bufferMinutes: 15,
        isSkippable: true,
        priority: 'should',
        constraints: [],
        activity: {
          time: '12:00',
          activity: 'Museum',
          description: 'Indoor stop',
        },
      },
    ],
    ...overrides,
  };
}

describe('applyRecoveryOption', () => {
  it('replaces affected activities by matching start time first', () => {
    const itinerary = createItinerary();
    const option = createRecoveryOption();

    const result = applyRecoveryOption(itinerary, option);

    expect(result.days[0].activities.map((activity) => activity.activity)).toEqual([
      'Temple',
      'Museum',
      'Shrine',
    ]);
  });

  it('falls back to slotIndex replacement when startTime is missing', () => {
    const itinerary = createItinerary();
    const option = createRecoveryOption({
      replacementSlots: [
        {
          id: 'slot-2',
          dayNumber: 1,
          slotIndex: 2,
          bufferMinutes: 15,
          isSkippable: true,
          priority: 'should',
          constraints: [],
          activity: {
            time: '15:00',
            activity: 'Cafe',
            description: 'Rest stop',
          },
        },
      ],
    });

    const result = applyRecoveryOption(itinerary, option);

    expect(result.days[0].activities.map((activity) => activity.activity)).toEqual([
      'Temple',
      'Lunch',
      'Cafe',
    ]);
  });
});
