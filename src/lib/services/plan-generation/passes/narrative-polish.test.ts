import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  PlanGenerationSession,
  PassContext,
  PassBudget,
  NarrativeState,
} from '@/types/plan-generation';

// Mock narrative renderer
vi.mock('@/lib/services/itinerary/steps/narrative-renderer', () => ({
  runNarrativeRenderer: vi.fn(),
}));

import { narrativePolishPass } from './narrative-polish';
import { runNarrativeRenderer } from '@/lib/services/itinerary/steps/narrative-renderer';

const mockRunNarrativeRenderer = vi.mocked(runNarrativeRenderer);

function createMockBudget(): PassBudget {
  const deadline = Date.now() + 20_000;
  return {
    maxExecutionMs: 20_000,
    deadlineAt: deadline,
    remainingMs: () => deadline - Date.now(),
  };
}

function createMockCtx(overrides: Partial<PlanGenerationSession> = {}): PassContext {
  return {
    session: {
      id: 'test-session',
      state: 'timeline_ready',
      createdAt: '',
      updatedAt: '',
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      warnings: [],
      draftPlan: {
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
      generationProfile: {
        modelName: 'gemini-2.5-flash',
        narrativeModelName: 'gemini-2.5-flash',
        modelTier: 'flash',
        provider: 'gemini',
        temperature: 0.7,
        pipelineVersion: 'v4',
      },
      ...overrides,
    } as unknown as PlanGenerationSession,
    budget: createMockBudget(),
    retryPolicy: { maxRetries: 1, backoffMs: 500, retryableErrors: ['AbortError'] },
    qualityPolicy: {
      minOverallScore: 55,
      minCategoryScores: {},
      maxRepairIterations: 3,
      verificationLevel: 'L1_entity_found',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('narrativePolishPass', () => {
  it('fails terminal when timelineState is missing', async () => {
    const ctx = createMockCtx({ timelineState: undefined });
    const result = await narrativePolishPass(ctx);
    expect(result.outcome).toBe('failed_terminal');
    expect(result.warnings[0]).toContain('Missing');
  });

  it('generates narratives and converts to NarrativeState', async () => {
    mockRunNarrativeRenderer.mockResolvedValue({
      description: '京都寺社巡りの旅',
      days: [
        {
          day: 1,
          title: '金閣寺と北山',
          activities: [
            {
              node: {
                stop: {
                  candidate: { name: '金閣寺', role: 'must_visit', priority: 8, dayHint: 1, timeSlotHint: 'morning', stayDurationMinutes: 60, searchQuery: '' },
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
              description: '朝日に輝く金閣を鑑賞',
              activityName: '金閣寺参拝',
              source: { type: 'ai' as const, confidence: 1.0 },
            },
          ],
          legs: [],
          overnightLocation: '京都駅',
        },
      ],
    });

    const ctx = createMockCtx();
    const result = await narrativePolishPass(ctx);

    expect(result.outcome).toBe('completed');
    const state = result.data as NarrativeState;

    expect(state.description).toBe('京都寺社巡りの旅');
    expect(state.completedDays).toEqual([1]);
    expect(state.dayNarratives).toHaveLength(1);
    expect(state.dayNarratives[0].title).toBe('金閣寺と北山');
    expect(state.dayNarratives[0].activities[0].draftId).toBe('stop-001');
    expect(state.dayNarratives[0].activities[0].description).toBe('朝日に輝く金閣を鑑賞');
  });

  it('returns needs_retry on timeout', async () => {
    mockRunNarrativeRenderer.mockRejectedValue(new Error('Request timed out'));

    const ctx = createMockCtx();
    const result = await narrativePolishPass(ctx);
    expect(result.outcome).toBe('needs_retry');
    expect(result.warnings[0]).toContain('timed out');
  });

  it('passes correct model settings to renderer', async () => {
    mockRunNarrativeRenderer.mockResolvedValue({
      description: '',
      days: [],
    });

    const ctx = createMockCtx();
    await narrativePolishPass(ctx);

    expect(mockRunNarrativeRenderer).toHaveBeenCalledTimes(1);
    const input = mockRunNarrativeRenderer.mock.calls[0][0];
    expect(input.modelName).toBe('gemini-2.5-flash');
    expect(input.provider).toBe('gemini');
    expect(input.temperature).toBe(0.7);
    expect(input.context).toEqual([]);
  });
});
