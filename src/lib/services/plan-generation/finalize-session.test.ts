import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanGenerationSession } from '@/types/plan-generation';

const { mockPersistTripVersion, mockLogRunCheckpoint } = vi.hoisted(() => ({
  mockPersistTripVersion: vi.fn(),
  mockLogRunCheckpoint: vi.fn(),
}));

vi.mock('@/lib/trips/service', () => ({
  tripService: {
    persistTripVersion: (...args: unknown[]) => mockPersistTripVersion(...args),
  },
}));

vi.mock('./transform/timeline-to-itinerary', () => ({
  sessionToItinerary: vi.fn(() => ({
    title: 'Test Plan',
    tripId: 'trip_1',
    version: 1,
    completionLevel: 'partial_verified',
    generatedConstraints: {
      toolBudgetMode: 'safe',
    },
    days: [
      {
        dayNumber: 1,
        date: '2026-04-01',
        activities: [],
        blocks: [],
      },
    ],
  })),
}));

vi.mock('@/lib/utils/performance-timer', () => ({
  createPerformanceTimer: vi.fn(() => ({
    measure: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
    log: vi.fn(),
  })),
}));

vi.mock('@/lib/agent/run-checkpoint-log', () => ({
  logRunCheckpoint: (...args: unknown[]) => mockLogRunCheckpoint(...args),
}));

import { finalizeSessionToTrip } from './finalize-session';

function createSession(): PlanGenerationSession {
  return {
    id: 'run_1',
    userId: 'user_1',
    state: 'completed',
    createdAt: new Date(Date.now() - 5000).toISOString(),
    updatedAt: new Date().toISOString(),
    pipelineContext: {
      tripId: 'trip_1',
      executionMode: 'draft_with_selective_verify',
      runtimeProfile: 'netlify_free_30s',
    },
    draftPlan: {
      destination: '',
      description: 'desc',
      tripIntentSummary: 'summary',
      days: [],
      themes: [],
      orderingPreferences: [],
    },
    repairHistory: [],
    verifiedEntities: [],
    passRuns: [],
    warnings: [],
  };
}

describe('finalizeSessionToTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPersistTripVersion.mockResolvedValue({
      tripId: 'trip_1',
      version: 3,
      itinerary: {
        title: 'Test Plan',
        tripId: 'trip_1',
        version: 3,
        completionLevel: 'partial_verified',
        generatedConstraints: {
          toolBudgetMode: 'safe',
        },
        days: [
          {
            dayNumber: 1,
            date: '2026-04-01',
            activities: [],
            blocks: [],
          },
        ],
      },
    });
  });

  it('logs persistence checkpoints around trip version save', async () => {
    const session = createSession();

    const result = await finalizeSessionToTrip(session);

    expect(result.tripId).toBe('trip_1');
    expect(result.version).toBe(3);
    expect(mockLogRunCheckpoint).toHaveBeenNthCalledWith(1, expect.objectContaining({
      checkpoint: 'trip_persist_started',
      runId: 'run_1',
      state: 'completed',
      pipelineContext: expect.objectContaining({
        tripId: 'trip_1',
      }),
      dayCount: 1,
      completionLevel: 'partial_verified',
    }));
    expect(mockLogRunCheckpoint).toHaveBeenNthCalledWith(2, expect.objectContaining({
      checkpoint: 'trip_persist_completed',
      runId: 'run_1',
      tripId: 'trip_1',
      tripVersion: 3,
      completionLevel: 'partial_verified',
    }));
  });
});
