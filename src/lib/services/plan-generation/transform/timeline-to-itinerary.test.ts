import { describe, expect, it, vi } from 'vitest';
import type { Itinerary } from '@/types/itinerary';
import { sessionToItinerary } from './timeline-to-itinerary';

vi.mock('@/lib/services/itinerary/inject-flights', () => ({
  injectFlights: (days: unknown) => days,
}));

vi.mock('@/lib/services/itinerary/inject-accommodations', () => ({
  injectAccommodations: (days: unknown) => days,
}));

vi.mock('@/lib/trips/metadata', () => ({
  enrichItineraryMetadata: (base: Itinerary, overrides: Partial<Itinerary>) => ({
    ...base,
    ...overrides,
  }),
}));

describe('sessionToItinerary', () => {
  it('builds an itinerary without narrativeState by using deterministic fallbacks', () => {
    const itinerary = sessionToItinerary({
      id: 'run-1',
      state: 'timeline_ready',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      normalizedInput: {
        destination: 'Madrid',
        durationDays: 1,
        startDate: '2026-04-10',
        fixedSchedule: [],
      },
      draftPlan: {
        destination: 'Madrid',
        description: 'Madridを歩いて楽しむ1日です。',
        tripIntentSummary: '街歩きと名所をバランスよく楽しむ旅です。',
        themes: ['city_walk'],
        orderingPreferences: [],
        days: [
          {
            day: 1,
            title: 'マドリード中心部散策',
            summary: '中心部を歩いて回る日',
            mainArea: 'Centro',
            overnightLocation: 'Madrid',
            stops: [
              {
                draftId: 'stop-1',
                name: 'プエルタ・デル・ソル',
                rationale: 'マドリードの中心地から街歩きを始めます。',
                role: 'recommended',
                timeSlotHint: 'morning',
                aiConfidence: 'high',
                stayDurationMinutes: 60,
                areaHint: 'Centro',
                searchQuery: 'プエルタ・デル・ソル マドリード',
              },
              {
                draftId: 'stop-2',
                name: 'プラド美術館',
                rationale: '午後は代表的な美術館で過ごします。',
                role: 'recommended',
                timeSlotHint: 'afternoon',
                aiConfidence: 'high',
                stayDurationMinutes: 90,
                areaHint: 'Centro',
                searchQuery: 'プラド美術館 マドリード',
              },
            ],
          },
        ],
      },
      timelineState: {
        days: [
          {
            day: 1,
            title: 'マドリード中心部散策',
            overnightLocation: 'Madrid',
            startTime: '09:00',
            nodes: [
              {
                draftId: 'stop-1',
                arrivalTime: '09:00',
                departureTime: '10:00',
                stayMinutes: 60,
                warnings: [],
              },
              {
                draftId: 'stop-2',
                arrivalTime: '14:00',
                departureTime: '15:30',
                stayMinutes: 90,
                warnings: [],
              },
            ],
            legs: [],
          },
        ],
        warnings: [],
        metadata: {
          routeOptimizationApplied: true,
          totalTravelMinutes: 0,
          totalStops: 1,
        },
      },
      verifiedEntities: [],
      repairHistory: [],
      passRuns: [],
      warnings: [],
    } as Parameters<typeof sessionToItinerary>[0]);

    expect(itinerary.description).toBe('Madridを歩いて楽しむ1日です。');
    expect(itinerary.days[0]?.title).toBe('マドリード中心部散策');
    expect(itinerary.days[0]?.activities[0]?.description).toBe('マドリードの中心地から街歩きを始めます。');
    expect(itinerary.narrativePending).toBe(true);
    expect(itinerary.completionLevel).toBe('draft_only');
  });

  it('uses normalizedInput.durationDays as the authoritative trip length', () => {
    const itinerary = sessionToItinerary({
      id: 'run-2',
      state: 'timeline_ready',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      normalizedInput: {
        destination: 'Madrid',
        durationDays: 2,
        startDate: '2026-04-10',
        fixedSchedule: [],
      },
      draftPlan: {
        destination: 'Madrid',
        description: 'Madridを歩いて楽しむ2日旅です。',
        tripIntentSummary: '街歩き中心の旅です。',
        themes: ['city_walk'],
        orderingPreferences: [],
        days: [
          {
            day: 1,
            title: 'Day 1',
            summary: 'summary',
            mainArea: 'Centro',
            overnightLocation: 'Madrid',
            stops: [{ draftId: 'stop-1', name: 'A', rationale: 'A', role: 'recommended', timeSlotHint: 'afternoon', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'A' }],
          },
          {
            day: 2,
            title: 'Day 2',
            summary: 'summary',
            mainArea: 'Centro',
            overnightLocation: 'Madrid',
            stops: [{ draftId: 'stop-2', name: 'B', rationale: 'B', role: 'recommended', timeSlotHint: 'afternoon', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'B' }],
          },
        ],
      },
      timelineState: {
        days: [
          {
            day: 1,
            title: 'Day 1',
            overnightLocation: 'Madrid',
            startTime: '09:00',
            nodes: [
              { draftId: 'stop-1', arrivalTime: '14:00', departureTime: '15:00', stayMinutes: 60, warnings: [] },
            ],
            legs: [],
          },
          { day: 2, title: 'Day 2', overnightLocation: 'Madrid', startTime: '09:00', nodes: [{ draftId: 'stop-2', arrivalTime: '14:00', departureTime: '15:00', stayMinutes: 60, warnings: [] }], legs: [] },
        ],
        warnings: [],
        metadata: { routeOptimizationApplied: true, totalTravelMinutes: 0, totalStops: 2 },
      },
      verifiedEntities: [],
      repairHistory: [],
      passRuns: [],
      warnings: [],
    } as Parameters<typeof sessionToItinerary>[0]);

    expect(itinerary.title).toContain('2日間');
    expect(itinerary.destinationSummary?.durationDays).toBe(2);
  });

  it('throws when draft/timeline days do not cover the normalized duration', () => {
    expect(() => sessionToItinerary({
      id: 'run-3',
      state: 'timeline_ready',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      normalizedInput: {
        destination: 'Madrid',
        durationDays: 2,
        startDate: '2026-04-10',
        fixedSchedule: [],
      },
      draftPlan: {
        destination: 'Madrid',
        description: 'desc',
        tripIntentSummary: 'summary',
        themes: [],
        orderingPreferences: [],
        days: [
          {
            day: 1,
            title: 'Day 1',
            summary: 'summary',
            mainArea: 'Centro',
            overnightLocation: 'Madrid',
            stops: [{ draftId: 'stop-1', name: 'A', rationale: 'A', role: 'recommended', timeSlotHint: 'morning', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'A' }],
          },
        ],
      },
      timelineState: {
        days: [
          { day: 1, title: 'Day 1', overnightLocation: 'Madrid', startTime: '09:00', nodes: [{ draftId: 'stop-1', arrivalTime: '09:00', departureTime: '10:00', stayMinutes: 60, warnings: [] }], legs: [] },
        ],
        warnings: [],
        metadata: { routeOptimizationApplied: true, totalTravelMinutes: 0, totalStops: 1 },
      },
      verifiedEntities: [],
      repairHistory: [],
      passRuns: [],
      warnings: [],
    } as Parameters<typeof sessionToItinerary>[0])).toThrow('finalize_incomplete_itinerary_days');
  });

  it('throws when a non-departure day only has morning and midday activities', () => {
    expect(() => sessionToItinerary({
      id: 'run-4',
      state: 'timeline_ready',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      normalizedInput: {
        destination: 'Madrid',
        destinations: ['Madrid'],
        durationDays: 2,
        startDate: '2026-04-10',
        fixedSchedule: [],
        hardConstraints: {
          destinations: ['Madrid'],
          dateConstraints: ['2026-04-10 to 2026-04-11'],
          mustVisitPlaces: [],
          fixedTransports: [],
          fixedHotels: [],
          freeTextDirectives: [],
          summaryLines: [],
        },
      },
      draftPlan: {
        destination: 'Madrid',
        description: 'desc',
        tripIntentSummary: 'summary',
        themes: [],
        orderingPreferences: [],
        days: [
          {
            day: 1,
            title: 'Day 1',
            summary: 'summary',
            mainArea: 'Centro',
            overnightLocation: 'Madrid',
            stops: [
              { draftId: 'stop-1', name: 'A', rationale: 'A', role: 'recommended', timeSlotHint: 'morning', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'A' },
              { draftId: 'stop-2', name: 'Lunch', rationale: 'Lunch', role: 'meal', timeSlotHint: 'midday', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'Lunch' },
              { draftId: 'stop-3', name: 'Hotel', rationale: 'Hotel', role: 'accommodation', timeSlotHint: 'evening', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'Hotel' },
            ],
          },
          {
            day: 2,
            title: 'Day 2',
            summary: 'summary',
            mainArea: 'Centro',
            overnightLocation: 'Madrid',
            stops: [
              { draftId: 'stop-4', name: 'B', rationale: 'B', role: 'recommended', timeSlotHint: 'afternoon', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'B' },
              { draftId: 'stop-5', name: 'Dinner', rationale: 'Dinner', role: 'meal', timeSlotHint: 'evening', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'Dinner' },
              { draftId: 'stop-6', name: 'C', rationale: 'C', role: 'recommended', timeSlotHint: 'night', aiConfidence: 'high', stayDurationMinutes: 60, areaHint: 'Centro', searchQuery: 'C' },
            ],
          },
        ],
      },
      timelineState: {
        days: [
          {
            day: 1,
            title: 'Day 1',
            overnightLocation: 'Madrid',
            startTime: '09:00',
            nodes: [
              { draftId: 'stop-1', arrivalTime: '09:00', departureTime: '10:00', stayMinutes: 60, warnings: [] },
              { draftId: 'stop-2', arrivalTime: '12:00', departureTime: '13:00', stayMinutes: 60, warnings: [] },
              { draftId: 'stop-3', arrivalTime: '19:00', departureTime: '20:00', stayMinutes: 60, warnings: [] },
            ],
            legs: [],
          },
          {
            day: 2,
            title: 'Day 2',
            overnightLocation: 'Madrid',
            startTime: '09:00',
            nodes: [
              { draftId: 'stop-4', arrivalTime: '14:00', departureTime: '15:00', stayMinutes: 60, warnings: [] },
              { draftId: 'stop-5', arrivalTime: '18:00', departureTime: '19:00', stayMinutes: 60, warnings: [] },
              { draftId: 'stop-6', arrivalTime: '20:00', departureTime: '21:00', stayMinutes: 60, warnings: [] },
            ],
            legs: [],
          },
        ],
        warnings: [],
        metadata: { routeOptimizationApplied: true, totalTravelMinutes: 0, totalStops: 6 },
      },
      verifiedEntities: [],
      repairHistory: [],
      passRuns: [],
      warnings: [],
    } as Parameters<typeof sessionToItinerary>[0])).toThrow('finalize_activity_only_until_midday');
  });
});
