import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  PlanGenerationSession,
  PassContext,
  PassBudget,
  DraftPlan,
  TimelineState,
} from '@/types/plan-generation';

// Mock v3 steps
vi.mock('@/lib/services/itinerary/steps/route-optimizer', () => ({
  optimizeRoutes: vi.fn(),
}));

vi.mock('@/lib/services/itinerary/steps/timeline-builder', () => ({
  buildTimeline: vi.fn(),
}));

import { timelineConstructPass } from './timeline-construct';
import { optimizeRoutes } from '@/lib/services/itinerary/steps/route-optimizer';
import { buildTimeline } from '@/lib/services/itinerary/steps/timeline-builder';
import type { OptimizedDay, TimelineDay } from '@/types/itinerary-pipeline';

const mockOptimizeRoutes = vi.mocked(optimizeRoutes);
const mockBuildTimeline = vi.mocked(buildTimeline);

function createMockBudget(): PassBudget {
  const deadline = Date.now() + 5_000;
  return {
    maxExecutionMs: 5_000,
    deadlineAt: deadline,
    remainingMs: () => deadline - Date.now(),
  };
}

function createMockDraftPlan(): DraftPlan {
  return {
    destination: '京都',
    description: '',
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
  };
}

function createMockCtx(overrides: Partial<PlanGenerationSession> = {}): PassContext {
  return {
    session: {
      id: 'test-session',
      state: 'verification_partial',
      createdAt: '',
      updatedAt: '',
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      warnings: [],
      draftPlan: createMockDraftPlan(),
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
      ...overrides,
    } as unknown as PlanGenerationSession,
    budget: createMockBudget(),
    retryPolicy: { maxRetries: 0, backoffMs: 0, retryableErrors: [] },
    qualityPolicy: {
      minOverallScore: 55,
      minCategoryScores: {},
      maxRepairIterations: 3,
      verificationLevel: 'L1_entity_found',
    },
  };
}

const mockOptimizedDay: OptimizedDay = {
  day: 1,
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
          searchQuery: '金閣寺',
          semanticId: 'stop-001',
        },
        feasibilityScore: 80,
        warnings: [],
        semanticId: 'stop-001',
      },
      orderInDay: 0,
    },
  ],
  legs: [],
  title: 'Day 1',
  overnightLocation: '京都駅',
};

const mockTimelineDay: TimelineDay = {
  day: 1,
  title: 'Day 1',
  startTime: '09:00',
  overnightLocation: '京都駅',
  nodes: [
    {
      stop: mockOptimizedDay.nodes[0].stop,
      arrivalTime: '09:00',
      departureTime: '10:00',
      stayMinutes: 60,
      warnings: [],
      semanticId: 'stop-001',
    },
  ],
  legs: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockOptimizeRoutes.mockReturnValue([mockOptimizedDay]);
  mockBuildTimeline.mockReturnValue([mockTimelineDay]);
});

describe('timelineConstructPass', () => {
  it('fails terminal when draftPlan is missing', async () => {
    const ctx = createMockCtx({ draftPlan: undefined });
    const result = await timelineConstructPass(ctx);
    expect(result.outcome).toBe('failed_terminal');
  });

  it('calls optimizeRoutes and buildTimeline with correct inputs', async () => {
    const ctx = createMockCtx();
    const result = await timelineConstructPass(ctx);

    expect(result.outcome).toBe('completed');
    expect(mockOptimizeRoutes).toHaveBeenCalledTimes(1);
    expect(mockBuildTimeline).toHaveBeenCalledTimes(1);

    // optimizeRoutes called with SelectedStop[], DayStructure[], NormalizedRequest
    const [stops, dayStructures] = mockOptimizeRoutes.mock.calls[0];
    expect(stops).toHaveLength(1);
    expect(stops[0].candidate.name).toBe('金閣寺');
    expect(dayStructures).toHaveLength(1);
    expect(dayStructures[0].day).toBe(1);
  });

  it('produces TimelineState with correct metadata', async () => {
    const ctx = createMockCtx();
    const result = await timelineConstructPass(ctx);

    const state = result.data as TimelineState;
    expect(state.days).toHaveLength(1);
    expect(state.days[0].day).toBe(1);
    expect(state.days[0].nodes).toHaveLength(1);
    expect(state.days[0].nodes[0].draftId).toBe('stop-001');
    expect(state.metadata.totalStops).toBe(1);
    expect(state.metadata.routeOptimizationApplied).toBe(true);
  });
});
