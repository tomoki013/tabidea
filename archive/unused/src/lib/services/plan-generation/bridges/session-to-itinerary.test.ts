import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlanGenerationSession } from '@/types/plan-generation';

// Mock v3 adapter and bridge
vi.mock('@/lib/services/itinerary/adapter', () => ({
  composedToItinerary: vi.fn(),
}));
vi.mock('./draft-to-v3', () => ({
  reconstructTimelineDays: vi.fn(),
}));

import { sessionToItinerary } from './session-to-itinerary';
import { composedToItinerary } from '@/lib/services/itinerary/adapter';
import { reconstructTimelineDays } from './draft-to-v3';

const mockComposedToItinerary = vi.mocked(composedToItinerary);
const mockReconstructTimelineDays = vi.mocked(reconstructTimelineDays);

function createMockSession(overrides: Partial<PlanGenerationSession> = {}): PlanGenerationSession {
  return {
    id: 'test-session',
    state: 'completed',
    createdAt: '',
    updatedAt: '',
    repairHistory: [],
    verifiedEntities: [
      {
        draftId: 'stop-001',
        status: 'confirmed',
        verificationLevel: 'L1_entity_found',
        details: { placeId: 'ChIJ-test' },
      },
    ],
    passRuns: [],
    warnings: ['test warning'],
    draftPlan: {
      destination: '京都',
      description: 'AI generated description',
      tripIntentSummary: '',
      themes: [],
      orderingPreferences: [],
      days: [
        {
          day: 1,
          title: 'Day 1',
          mainArea: '北山',
          overnightLocation: '京都駅',
          summary: '',
          stops: [
            {
              draftId: 'stop-001',
              name: '金閣寺',
              searchQuery: '金閣寺',
              role: 'must_visit',
              timeSlotHint: 'morning',
              stayDurationMinutes: 60,
              areaHint: '北山',
              rationale: '',
              aiConfidence: 'high',
            },
          ],
        },
      ],
    },
    normalizedInput: {
      destinations: ['京都'],
      durationDays: 1,
      budgetLevel: 'balanced',
      pace: 'balanced',
      themes: [],
      mustVisitPlaces: ['金閣寺'],
      companions: 'solo',
      preferredTransport: [],
      fixedSchedule: [],
      hardConstraints: { mustVisitPlaces: ['金閣寺'], fixedTransports: [], fixedHotels: [], fixedSchedule: [] },
      softPreferences: { themes: [], vibeWords: [], softRequests: [] },
    },
    timelineState: {
      days: [
        {
          day: 1,
          title: 'Day 1',
          overnightLocation: '京都駅',
          startTime: '09:00',
          nodes: [
            {
              draftId: 'stop-001',
              arrivalTime: '09:00',
              departureTime: '10:00',
              stayMinutes: 60,
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
    narrativeState: {
      description: '京都寺社巡りの旅',
      completedDays: [1],
      dayNarratives: [
        {
          day: 1,
          title: '金閣寺と北山',
          activities: [
            {
              draftId: 'stop-001',
              activityName: '金閣寺参拝',
              description: '朝日に輝く金閣を鑑賞',
            },
          ],
        },
      ],
      warnings: [],
    },
    generationProfile: {
      modelName: 'gemini-2.5-flash',
      narrativeModelName: 'gemini-2.5-flash',
      modelTier: 'flash',
      provider: 'gemini',
      temperature: 0.7,
      pipelineVersion: 'v4',
    },
    ...overrides,
  } as unknown as PlanGenerationSession;
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: reconstructTimelineDays returns minimal v3 TimelineDay[]
  mockReconstructTimelineDays.mockReturnValue([
    {
      day: 1,
      title: 'Day 1',
      nodes: [
        {
          stop: {
            candidate: { name: '金閣寺', role: 'must_visit', priority: 8, dayHint: 1, timeSlotHint: 'morning', stayDurationMinutes: 60, searchQuery: '金閣寺' },
            feasibilityScore: 80,
            warnings: [],
            semanticId: 'stop-001',
          },
          arrivalTime: '09:00',
          departureTime: '10:00',
          stayMinutes: 60,
          warnings: [],
          semanticId: 'stop-001',
        },
      ],
      legs: [],
      overnightLocation: '京都駅',
      startTime: '09:00',
    },
  ]);

  // Default: composedToItinerary returns Itinerary
  mockComposedToItinerary.mockReturnValue({
    id: 'mock-id',
    destination: '京都',
    description: '京都寺社巡りの旅',
    days: [],
  });
});

describe('sessionToItinerary', () => {
  it('throws when draftPlan is missing', () => {
    const session = createMockSession({ draftPlan: undefined });
    expect(() => sessionToItinerary(session)).toThrow('missing draftPlan');
  });

  it('throws when narrativeState is missing', () => {
    const session = createMockSession({ narrativeState: undefined });
    expect(() => sessionToItinerary(session)).toThrow('missing narrativeState');
  });

  it('throws when normalizedInput is missing', () => {
    const session = createMockSession({ normalizedInput: undefined });
    expect(() => sessionToItinerary(session)).toThrow('missing normalizedInput');
  });

  it('throws when timelineState is missing', () => {
    const session = createMockSession({ timelineState: undefined });
    expect(() => sessionToItinerary(session)).toThrow('missing timelineState');
  });

  it('lists all missing fields in error message', () => {
    const session = createMockSession({
      draftPlan: undefined,
      narrativeState: undefined,
    });
    expect(() => sessionToItinerary(session)).toThrow('draftPlan, narrativeState');
  });

  it('calls reconstructTimelineDays with session', () => {
    const session = createMockSession();
    sessionToItinerary(session);
    expect(mockReconstructTimelineDays).toHaveBeenCalledWith(session);
  });

  it('builds NarrativeDay[] merging timeline + narrative state', () => {
    const session = createMockSession();
    sessionToItinerary(session);

    expect(mockComposedToItinerary).toHaveBeenCalledTimes(1);
    const [composed] = mockComposedToItinerary.mock.calls[0];

    // NarrativeDay from merged data
    expect(composed.days).toHaveLength(1);
    expect(composed.days[0].day).toBe(1);
    expect(composed.days[0].title).toBe('金閣寺と北山'); // from narrativeState
    expect(composed.days[0].activities[0].description).toBe('朝日に輝く金閣を鑑賞');
    expect(composed.days[0].activities[0].activityName).toBe('金閣寺参拝');
  });

  it('uses narrative description over draftPlan description', () => {
    const session = createMockSession();
    sessionToItinerary(session);

    const [composed] = mockComposedToItinerary.mock.calls[0];
    expect(composed.description).toBe('京都寺社巡りの旅');
  });

  it('sets pipelineVersion to v4 in metadata', () => {
    const session = createMockSession();
    sessionToItinerary(session);

    const [composed] = mockComposedToItinerary.mock.calls[0];
    expect(composed.metadata.pipelineVersion).toBe('v4');
    expect(composed.metadata.modelName).toBe('gemini-2.5-flash');
    expect(composed.metadata.modelTier).toBe('flash');
  });

  it('counts verified entities correctly', () => {
    const session = createMockSession({
      verifiedEntities: [
        { draftId: 'stop-001', status: 'confirmed', verificationLevel: 'L1_entity_found' },
        { draftId: 'stop-002', status: 'unverifiable', verificationLevel: 'L0_unverified' },
      ],
    });
    sessionToItinerary(session);

    const [composed] = mockComposedToItinerary.mock.calls[0];
    expect(composed.metadata.resolvedCount).toBe(1); // only confirmed
    expect(composed.metadata.placeResolveEnabled).toBe(true);
  });

  it('passes AdapterContext with correct fields', () => {
    const session = createMockSession();
    sessionToItinerary(session);

    const [, modelInfo, context] = mockComposedToItinerary.mock.calls[0];
    expect(context.destination).toBe('京都');
    expect(context.durationDays).toBe(1);
    expect(context.overnightLocations).toEqual(['京都駅']);
    expect(context.fixedSchedule).toEqual([]);
    expect(modelInfo).toEqual({ modelName: 'gemini-2.5-flash', tier: 'flash' });
  });

  it('falls back to candidate name when no narrative match', () => {
    // narrativeState has no matching activity for stop-001
    const session = createMockSession({
      narrativeState: {
        description: '旅の説明',
        completedDays: [1],
        dayNarratives: [
          { day: 1, title: 'Day 1 Title', activities: [] },
        ],
        warnings: [],
      },
    });
    sessionToItinerary(session);

    const [composed] = mockComposedToItinerary.mock.calls[0];
    // falls back to candidate name for activityName
    expect(composed.days[0].activities[0].activityName).toBe('金閣寺');
    // falls back to empty string for description
    expect(composed.days[0].activities[0].description).toBe('');
  });

  it('passes warnings from session', () => {
    const session = createMockSession();
    sessionToItinerary(session);

    const [composed] = mockComposedToItinerary.mock.calls[0];
    expect(composed.warnings).toEqual(['test warning']);
  });

  it('handles missing generationProfile gracefully', () => {
    const session = createMockSession({ generationProfile: undefined });
    sessionToItinerary(session);

    const [composed, modelInfo] = mockComposedToItinerary.mock.calls[0];
    expect(modelInfo).toBeUndefined();
    expect(composed.metadata.modelName).toBe('unknown');
    expect(composed.metadata.modelTier).toBe('flash');
  });

  it('enriches the returned itinerary with phase 1 metadata', () => {
    const session = createMockSession();
    const itinerary = sessionToItinerary(session);

    expect(itinerary.title).toBe('京都 1日間の旅程');
    expect(itinerary.completionLevel).toBe('fully_verified');
    expect(itinerary.generatedConstraints).toEqual({
      toolBudgetMode: 'selective_verify',
    });
    expect(itinerary.destinationSummary).toEqual({
      primaryDestination: '京都',
      durationDays: 1,
    });
  });
});
