import { describe, it, expect } from 'vitest';
import type { DraftStop, DraftPlan, VerifiedEntity } from '@/types/plan-generation';
import {
  draftStopToCandidate,
  draftStopToSelectedStop,
  draftPlanToDayStructures,
  timelineDaysToState,
  reconstructTimelineDays,
  flattenDraftStopsAsCandidates,
} from './draft-to-v3';
import type { TimelineDay } from '@/types/itinerary-pipeline';
import type { PlanGenerationSession } from '@/types/plan-generation';

// ============================================
// Fixtures
// ============================================

function createStop(overrides: Partial<DraftStop> = {}): DraftStop {
  return {
    draftId: 'stop-001',
    name: '金閣寺',
    searchQuery: '金閣寺 京都',
    role: 'must_visit',
    timeSlotHint: 'morning',
    stayDurationMinutes: 60,
    areaHint: '北山エリア',
    rationale: '京都の代表的な観光地',
    aiConfidence: 'high',
    ...overrides,
  };
}

function createPlan(overrides: Partial<DraftPlan> = {}): DraftPlan {
  return {
    destination: '京都',
    description: '京都の旅',
    tripIntentSummary: '寺社巡りの旅',
    themes: ['寺社', '和食'],
    orderingPreferences: [],
    days: [
      {
        day: 1,
        title: '金閣寺と嵐山',
        mainArea: '北山〜嵐山',
        overnightLocation: '京都駅周辺',
        summary: '北山から嵐山へ',
        stops: [
          createStop({ draftId: 'stop-001', name: '金閣寺' }),
          createStop({
            draftId: 'stop-002',
            name: '嵐山竹林',
            role: 'recommended',
            timeSlotHint: 'afternoon',
            aiConfidence: 'medium',
            areaHint: '嵐山エリア',
          }),
        ],
      },
      {
        day: 2,
        title: '清水寺と祇園',
        mainArea: '東山',
        overnightLocation: '京都駅周辺',
        summary: '東山散策',
        stops: [
          createStop({
            draftId: 'stop-003',
            name: '清水寺',
            timeSlotHint: 'morning',
            areaHint: '東山',
          }),
        ],
      },
    ],
    ...overrides,
  };
}

function createVerifiedEntity(
  overrides: Partial<VerifiedEntity> = {},
): VerifiedEntity {
  return {
    draftId: 'stop-001',
    stopName: '金閣寺',
    day: 1,
    status: 'confirmed',
    level: 'L1_entity_found',
    details: {
      placeId: 'ChIJ_abc123',
      latitude: 35.0394,
      longitude: 135.7292,
      formattedAddress: '京都市北区金閣寺町1',
      rating: 4.6,
      businessStatus: 'OPERATIONAL',
      existenceConfirmed: true,
    },
    verifiedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// draftStopToCandidate
// ============================================

describe('draftStopToCandidate', () => {
  it('maps all fields correctly', () => {
    const stop = createStop();
    const candidate = draftStopToCandidate(stop, 1);

    expect(candidate.name).toBe('金閣寺');
    expect(candidate.role).toBe('must_visit');
    expect(candidate.priority).toBe(8); // high → 8
    expect(candidate.dayHint).toBe(1);
    expect(candidate.timeSlotHint).toBe('morning');
    expect(candidate.stayDurationMinutes).toBe(60);
    expect(candidate.searchQuery).toBe('金閣寺 京都');
    expect(candidate.semanticId).toBe('stop-001');
    expect(candidate.rationale).toBe('京都の代表的な観光地');
    expect(candidate.areaHint).toBe('北山エリア');
  });

  it('maps aiConfidence to priority correctly', () => {
    expect(draftStopToCandidate(createStop({ aiConfidence: 'high' }), 1).priority).toBe(8);
    expect(draftStopToCandidate(createStop({ aiConfidence: 'medium' }), 1).priority).toBe(5);
    expect(draftStopToCandidate(createStop({ aiConfidence: 'low' }), 1).priority).toBe(3);
  });
});

// ============================================
// draftStopToSelectedStop
// ============================================

describe('draftStopToSelectedStop', () => {
  it('creates SelectedStop without verification', () => {
    const stop = createStop();
    const selected = draftStopToSelectedStop(stop, 1);

    expect(selected.candidate.name).toBe('金閣寺');
    expect(selected.placeDetails).toBeUndefined();
    expect(selected.feasibilityScore).toBe(80); // high → 8 * 10
    expect(selected.semanticId).toBe('stop-001');
  });

  it('includes PlaceDetails when verified with placeId', () => {
    const stop = createStop();
    const verified = createVerifiedEntity();
    const selected = draftStopToSelectedStop(stop, 1, verified);

    expect(selected.placeDetails).toBeDefined();
    expect(selected.placeDetails!.placeId).toBe('ChIJ_abc123');
    expect(selected.placeDetails!.latitude).toBe(35.0394);
    expect(selected.placeDetails!.longitude).toBe(135.7292);
    expect(selected.placeDetails!.googleMapsUrl).toContain('ChIJ_abc123');
  });

  it('returns undefined placeDetails when verified without placeId', () => {
    const stop = createStop();
    const verified = createVerifiedEntity({
      status: 'unverifiable',
      details: undefined,
    });
    const selected = draftStopToSelectedStop(stop, 1, verified);

    expect(selected.placeDetails).toBeUndefined();
  });

  it('maps medium confidence to lower feasibilityScore', () => {
    const stop = createStop({ aiConfidence: 'medium' });
    const selected = draftStopToSelectedStop(stop, 1);
    expect(selected.feasibilityScore).toBe(50); // medium → 5 * 10
  });
});

// ============================================
// draftPlanToDayStructures
// ============================================

describe('draftPlanToDayStructures', () => {
  it('converts DraftPlan to DayStructure[]', () => {
    const plan = createPlan();
    const structures = draftPlanToDayStructures(plan);

    expect(structures).toHaveLength(2);
    expect(structures[0].day).toBe(1);
    expect(structures[0].title).toBe('金閣寺と嵐山');
    expect(structures[0].mainArea).toBe('北山〜嵐山');
    expect(structures[0].overnightLocation).toBe('京都駅周辺');
    expect(structures[0].summary).toBe('北山から嵐山へ');
    expect(structures[1].day).toBe(2);
  });
});

// ============================================
// flattenDraftStopsAsCandidates
// ============================================

describe('flattenDraftStopsAsCandidates', () => {
  it('flattens all stops across days', () => {
    const plan = createPlan();
    const candidates = flattenDraftStopsAsCandidates(plan);

    expect(candidates).toHaveLength(3);
    expect(candidates[0].semanticId).toBe('stop-001');
    expect(candidates[0].dayHint).toBe(1);
    expect(candidates[1].semanticId).toBe('stop-002');
    expect(candidates[1].dayHint).toBe(1);
    expect(candidates[2].semanticId).toBe('stop-003');
    expect(candidates[2].dayHint).toBe(2);
  });
});

// ============================================
// timelineDaysToState
// ============================================

describe('timelineDaysToState', () => {
  const mockTimelineDays: TimelineDay[] = [
    {
      day: 1,
      title: '金閣寺と嵐山',
      startTime: '09:00',
      overnightLocation: '京都駅周辺',
      nodes: [
        {
          stop: {
            candidate: {
              name: '金閣寺',
              role: 'must_visit',
              priority: 8,
              dayHint: 1,
              timeSlotHint: 'morning',
              stayDurationMinutes: 60,
              searchQuery: '金閣寺 京都',
              semanticId: 'stop-001',
            },
            placeDetails: {
              placeId: 'ChIJ_abc123',
              name: '金閣寺',
              formattedAddress: '京都市北区',
              latitude: 35.0394,
              longitude: 135.7292,
              googleMapsUrl: 'https://maps.google.com',
            },
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
      legs: [
        {
          fromIndex: 0,
          toIndex: 1,
          distanceKm: 5.2,
          durationMinutes: 25,
          mode: 'public_transit',
          transitType: 'train',
        },
      ],
    },
  ];

  it('converts TimelineDay[] to compact TimelineState', () => {
    const state = timelineDaysToState(mockTimelineDays, []);

    expect(state.days).toHaveLength(1);
    expect(state.days[0].day).toBe(1);
    expect(state.days[0].startTime).toBe('09:00');
    expect(state.days[0].nodes).toHaveLength(1);
    expect(state.days[0].nodes[0].draftId).toBe('stop-001');
    expect(state.days[0].nodes[0].arrivalTime).toBe('09:00');
    expect(state.days[0].nodes[0].latitude).toBe(35.0394);
    expect(state.days[0].legs).toHaveLength(1);
    expect(state.days[0].legs[0].mode).toBe('public_transit');
  });

  it('computes metadata correctly', () => {
    const state = timelineDaysToState(mockTimelineDays, []);

    expect(state.metadata.routeOptimizationApplied).toBe(true);
    expect(state.metadata.totalStops).toBe(1);
    expect(state.metadata.totalTravelMinutes).toBe(25);
  });

  it('uses verified entity placeId when available', () => {
    const verified = createVerifiedEntity();
    const state = timelineDaysToState(mockTimelineDays, [verified]);

    expect(state.days[0].nodes[0].placeId).toBe('ChIJ_abc123');
  });
});

// ============================================
// reconstructTimelineDays
// ============================================

describe('reconstructTimelineDays', () => {
  it('reconstructs TimelineDay[] from session data', () => {
    const plan = createPlan({
      days: [
        {
          day: 1,
          title: '金閣寺と嵐山',
          mainArea: '北山',
          overnightLocation: '京都駅周辺',
          summary: '',
          stops: [createStop({ draftId: 'stop-001' })],
        },
      ],
    });

    const session = {
      id: 'test',
      state: 'timeline_ready',
      createdAt: '',
      updatedAt: '',
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      warnings: [],
      draftPlan: plan,
      timelineState: {
        days: [
          {
            day: 1,
            title: '金閣寺と嵐山',
            overnightLocation: '京都駅周辺',
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
    } as unknown as PlanGenerationSession;

    const days = reconstructTimelineDays(session);

    expect(days).toHaveLength(1);
    expect(days[0].day).toBe(1);
    expect(days[0].nodes).toHaveLength(1);
    expect(days[0].nodes[0].stop.candidate.name).toBe('金閣寺');
    expect(days[0].nodes[0].arrivalTime).toBe('09:00');
    expect(days[0].nodes[0].semanticId).toBe('stop-001');
  });

  it('throws when draftPlan is missing', () => {
    const session = {
      draftPlan: undefined,
      timelineState: { days: [], warnings: [], metadata: {} },
    } as unknown as PlanGenerationSession;

    expect(() => reconstructTimelineDays(session)).toThrow('missing draftPlan');
  });

  it('creates fallback stop when draftId not found', () => {
    const plan = createPlan({ days: [] }); // empty days → stop won't be found

    const session = {
      draftPlan: plan,
      verifiedEntities: [],
      timelineState: {
        days: [
          {
            day: 1,
            title: 'Test',
            overnightLocation: '',
            startTime: '09:00',
            nodes: [
              {
                draftId: 'unknown-id',
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
        metadata: { routeOptimizationApplied: true, totalTravelMinutes: 0, totalStops: 1 },
      },
    } as unknown as PlanGenerationSession;

    const days = reconstructTimelineDays(session);
    expect(days[0].nodes[0].stop.candidate.name).toContain('[unknown:');
    expect(days[0].nodes[0].stop.warnings).toContain('Could not resolve original DraftStop');
  });
});
