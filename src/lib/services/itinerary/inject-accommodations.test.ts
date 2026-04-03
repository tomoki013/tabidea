import { describe, it, expect } from 'vitest';
import { injectAccommodations, type AccommodationInjectionContext } from './inject-accommodations';
import type { DayPlan } from '@/types/itinerary';

function makeDayPlan(day: number, lastActivityTime?: string): DayPlan {
  return {
    day,
    title: `Day ${day}`,
    activities: [
      { time: lastActivityTime || '10:00', activity: 'Visit temple', description: 'A beautiful temple' },
    ],
    timelineItems: [
      { itemType: 'activity', data: { time: lastActivityTime || '10:00', activity: 'Visit temple', description: 'A beautiful temple' } },
    ],
  };
}

describe('injectAccommodations', () => {
  it('should inject accommodation at end of each day except last', () => {
    const days = [makeDayPlan(1), makeDayPlan(2), makeDayPlan(3)];
    const context: AccommodationInjectionContext = {
      overnightLocations: ['ホテル東京', 'ホテル京都'],
      destination: '京都',
    };

    const result = injectAccommodations(days, context);

    // Day 1 should have accommodation appended
    expect(result[0].timelineItems!.length).toBe(2);
    const day1Last = result[0].timelineItems![1];
    expect(day1Last.itemType).toBe('activity');
    expect(day1Last.itemType === 'activity' && day1Last.data.activityType).toBe('accommodation');
    expect(day1Last.itemType === 'activity' && day1Last.data.activity).toBe('ホテル東京');

    // Day 2 should have accommodation appended
    expect(result[1].timelineItems!.length).toBe(2);
    const day2Last = result[1].timelineItems![1];
    expect(day2Last.itemType === 'activity' && day2Last.data.activity).toBe('ホテル京都');

    // Last day should NOT have accommodation
    expect(result[2].timelineItems!.length).toBe(1);
  });

  it('should fall back to destination when overnightLocation is missing', () => {
    const days = [makeDayPlan(1), makeDayPlan(2)];
    const context: AccommodationInjectionContext = {
      overnightLocations: [],
      destination: '沖縄',
    };

    const result = injectAccommodations(days, context);

    // Day 1 should use destination as fallback
    const day1Last = result[0].timelineItems![1];
    expect(day1Last.itemType === 'activity' && day1Last.data.activity).toBe('沖縄');
  });

  it('should not inject if accommodation already exists on that day', () => {
    const dayWithAccommodation: DayPlan = {
      day: 1,
      title: 'Day 1',
      activities: [
        { time: '10:00', activity: 'Visit temple', description: 'desc' },
        { time: '20:00', activity: 'Hotel ABC', description: '', activityType: 'accommodation' },
      ],
      timelineItems: [
        { itemType: 'activity', data: { time: '10:00', activity: 'Visit temple', description: 'desc' } },
        { itemType: 'activity', data: { time: '20:00', activity: 'Hotel ABC', description: '', activityType: 'accommodation' } },
      ],
    };
    const days = [dayWithAccommodation, makeDayPlan(2)];
    const context: AccommodationInjectionContext = {
      overnightLocations: ['ホテル東京'],
      destination: '東京',
    };

    const result = injectAccommodations(days, context);

    // Day 1 should NOT get another accommodation
    expect(result[0].timelineItems!.length).toBe(2);
  });

  it('should handle empty days array', () => {
    const context: AccommodationInjectionContext = {
      overnightLocations: [],
      destination: '沖縄',
    };

    const result = injectAccommodations([], context);
    expect(result).toEqual([]);
  });

  it('should handle single day trip (no accommodation needed)', () => {
    const days = [makeDayPlan(1)];
    const context: AccommodationInjectionContext = {
      overnightLocations: ['ホテル'],
      destination: '沖縄',
    };

    const result = injectAccommodations(days, context);
    // Single day is also the last day, so no accommodation
    expect(result[0].timelineItems!.length).toBe(1);
  });

  it('should estimate check-in time from last activity time + 2 hours', () => {
    const days = [makeDayPlan(1, '18:00'), makeDayPlan(2)];
    const context: AccommodationInjectionContext = {
      overnightLocations: ['ホテル東京'],
      destination: '東京',
    };

    const result = injectAccommodations(days, context);

    const accommodation = result[0].timelineItems![1];
    expect(accommodation.itemType === 'activity' && accommodation.data.time).toBe('20:00');
  });

  it('should not inject accommodation before 19:00 even when the day ends early', () => {
    const days = [makeDayPlan(1, '12:30'), makeDayPlan(2)];
    const context: AccommodationInjectionContext = {
      overnightLocations: ['ホテル東京'],
      destination: '東京',
    };

    const result = injectAccommodations(days, context);

    const accommodation = result[0].timelineItems![1];
    expect(accommodation.itemType === 'activity' && accommodation.data.time).toBe('19:00');
  });

  it('should cap check-in time at 23:00', () => {
    const days = [makeDayPlan(1, '22:00'), makeDayPlan(2)];
    const context: AccommodationInjectionContext = {
      overnightLocations: ['ホテル東京'],
      destination: '東京',
    };

    const result = injectAccommodations(days, context);

    const accommodation = result[0].timelineItems![1];
    // 22:00 + 2h = 24:00 → capped to 23:00
    expect(accommodation.itemType === 'activity' && accommodation.data.time).toBe('23:00');
  });

  it('should default to 21:00 when no activity time is available', () => {
    const dayNoTime: DayPlan = {
      day: 1,
      title: 'Day 1',
      activities: [{ time: '', activity: 'Free time', description: 'No fixed time' }],
      timelineItems: [
        { itemType: 'activity', data: { time: '', activity: 'Free time', description: 'No fixed time' } },
      ],
    };
    const days = [dayNoTime, makeDayPlan(2)];
    const context: AccommodationInjectionContext = {
      overnightLocations: ['ホテル東京'],
      destination: '東京',
    };

    const result = injectAccommodations(days, context);

    const accommodation = result[0].timelineItems![1];
    expect(accommodation.itemType === 'activity' && accommodation.data.time).toBe('21:00');
  });
});
