import { describe, it, expect } from 'vitest';
import { injectFlights, type FlightInjectionContext } from './inject-flights';
import type { DayPlan } from '@/types/itinerary';

function makeDayPlan(day: number): DayPlan {
  return {
    day,
    title: `Day ${day}`,
    activities: [
      { time: '10:00', activity: 'Visit temple', description: 'A beautiful temple' },
    ],
    timelineItems: [
      { itemType: 'activity', data: { time: '10:00', activity: 'Visit temple', description: 'A beautiful temple' } },
    ],
  };
}

describe('injectFlights', () => {
  it('should inject outbound and return flights when homeBaseCity is set', () => {
    const days = [makeDayPlan(1), makeDayPlan(2), makeDayPlan(3)];
    const context: FlightInjectionContext = {
      homeBaseCity: '東京',
      destination: '沖縄',
      durationDays: 3,
      fixedSchedule: [],
    };

    const result = injectFlights(days, context);

    // Day 1 should have outbound flight prepended
    expect(result[0].timelineItems![0].itemType).toBe('transit');
    expect(result[0].timelineItems![0].itemType === 'transit' && result[0].timelineItems![0].data.type).toBe('flight');
    expect(result[0].timelineItems![0].itemType === 'transit' && result[0].timelineItems![0].data.departure.place).toBe('東京');
    expect(result[0].timelineItems![0].itemType === 'transit' && result[0].timelineItems![0].data.arrival.place).toBe('沖縄');

    // Last day should have return flight appended
    const lastDay = result[2];
    const lastItem = lastDay.timelineItems![lastDay.timelineItems!.length - 1];
    expect(lastItem.itemType).toBe('transit');
    expect(lastItem.itemType === 'transit' && lastItem.data.type).toBe('flight');
    expect(lastItem.itemType === 'transit' && lastItem.data.departure.place).toBe('沖縄');
    expect(lastItem.itemType === 'transit' && lastItem.data.arrival.place).toBe('東京');

    // Middle day should not be affected
    expect(result[1].timelineItems!.length).toBe(1);
  });

  it('should not inject flights when homeBaseCity is not set', () => {
    const days = [makeDayPlan(1), makeDayPlan(2)];
    const context: FlightInjectionContext = {
      destination: '沖縄',
      durationDays: 2,
      fixedSchedule: [],
    };

    const result = injectFlights(days, context);
    expect(result[0].timelineItems!.length).toBe(1);
    expect(result[1].timelineItems!.length).toBe(1);
  });

  it('should not inject flights when destination matches homeBaseCity', () => {
    const days = [makeDayPlan(1), makeDayPlan(2)];
    const context: FlightInjectionContext = {
      homeBaseCity: '東京',
      destination: '東京',
      durationDays: 2,
      fixedSchedule: [],
    };

    const result = injectFlights(days, context);
    expect(result[0].timelineItems!.length).toBe(1);
  });

  it('should support open-jaw with different departure and arrival cities', () => {
    const days = [makeDayPlan(1), makeDayPlan(2)];
    const context: FlightInjectionContext = {
      homeBaseCity: '東京',
      departureCity: '大阪',
      arrivalCity: '福岡',
      destination: '沖縄',
      durationDays: 2,
      fixedSchedule: [],
    };

    const result = injectFlights(days, context);

    // Outbound: 大阪 → 沖縄
    const outbound = result[0].timelineItems![0];
    expect(outbound.itemType === 'transit' && outbound.data.departure.place).toBe('大阪');

    // Return: 沖縄 → 福岡
    const lastItem = result[1].timelineItems![result[1].timelineItems!.length - 1];
    expect(lastItem.itemType === 'transit' && lastItem.data.arrival.place).toBe('福岡');
  });

  it('should skip injection when user has booked flights in fixedSchedule', () => {
    const days = [makeDayPlan(1), makeDayPlan(2)];
    const context: FlightInjectionContext = {
      homeBaseCity: '東京',
      destination: '沖縄',
      durationDays: 2,
      startDate: '2026-04-01',
      fixedSchedule: [
        { type: 'flight', name: 'JAL 123', date: '2026-04-01' },
      ],
    };

    const result = injectFlights(days, context);
    // Day 1 should NOT have injected flight (user has booked)
    expect(result[0].timelineItems!.length).toBe(1);
    // Day 2 should still have return flight
    expect(result[1].timelineItems!.length).toBe(2);
  });

  it('should handle empty days array', () => {
    const context: FlightInjectionContext = {
      homeBaseCity: '東京',
      destination: '沖縄',
      durationDays: 0,
      fixedSchedule: [],
    };

    const result = injectFlights([], context);
    expect(result).toEqual([]);
  });

  it('should handle single day trip', () => {
    const days = [makeDayPlan(1)];
    const context: FlightInjectionContext = {
      homeBaseCity: '東京',
      destination: '沖縄',
      durationDays: 1,
      fixedSchedule: [],
    };

    const result = injectFlights(days, context);
    // Should have both outbound and return on same day
    expect(result[0].timelineItems!.length).toBe(3); // outbound + activity + return
  });
});
