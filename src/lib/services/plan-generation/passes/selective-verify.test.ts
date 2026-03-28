import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  PlanGenerationSession,
  PassContext,
  PassBudget,
  DraftPlan,
  VerifiedEntity,
} from '@/types/plan-generation';
import type { ResolvedPlaceGroup, SemanticCandidate } from '@/types/itinerary-pipeline';

// Mock place-resolver
vi.mock('@/lib/services/itinerary/steps/place-resolver', () => ({
  resolvePlaces: vi.fn(),
}));

import { selectiveVerifyPass } from './selective-verify';
import { resolvePlaces } from '@/lib/services/itinerary/steps/place-resolver';

const mockResolvePlaces = vi.mocked(resolvePlaces);

function createMockCandidate(name: string): SemanticCandidate {
  return {
    name,
    role: 'recommended',
    priority: 5,
    dayHint: 1,
    timeSlotHint: 'midday',
    stayDurationMinutes: 60,
    searchQuery: name,
  };
}

function createMockBudget(remainingMs = 20_000): PassBudget {
  const deadline = Date.now() + remainingMs;
  return {
    maxExecutionMs: remainingMs,
    deadlineAt: deadline,
    remainingMs: () => Math.max(0, deadline - Date.now()),
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
            searchQuery: '金閣寺 京都',
            role: 'must_visit',
            timeSlotHint: 'morning',
            stayDurationMinutes: 60,
            areaHint: '北山',
            rationale: '',
            aiConfidence: 'high',
          },
          {
            draftId: 'stop-002',
            name: 'カフェ・モーニング',
            searchQuery: 'cafe near kinkakuji',
            role: 'meal',
            timeSlotHint: 'midday',
            stayDurationMinutes: 45,
            areaHint: '北山',
            rationale: '',
            aiConfidence: 'low',
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
      state: 'draft_scored',
      createdAt: '',
      updatedAt: '',
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      warnings: [],
      draftPlan: createMockDraftPlan(),
      ...overrides,
    } as PlanGenerationSession,
    budget: createMockBudget(),
    retryPolicy: { maxRetries: 1, backoffMs: 300, retryableErrors: ['PlaceResolveError'] },
    qualityPolicy: {
      minOverallScore: 55,
      minCategoryScores: {},
      maxRepairIterations: 3,
      verificationLevel: 'L1_entity_found',
    },
  };
}

function mockResolvedGroup(
  name: string,
  success: boolean,
  matchScore = 0.8,
  businessStatus = 'OPERATIONAL' as string,
): ResolvedPlaceGroup {
  if (!success) {
    return {
      candidate: createMockCandidate(name),
      resolved: [],
      success: false,
      error: 'Not found',
    };
  }
  return {
    candidate: createMockCandidate(name),
    resolved: [
      {
        placeDetails: {
          placeId: `place-${name}`,
          name,
          formattedAddress: `${name} address`,
          latitude: 35.0,
          longitude: 135.7,
          rating: 4.5,
          businessStatus,
          googleMapsUrl: 'https://maps.google.com',
          openingHours: { periods: [] },
        },
        matchScore,
      },
    ],
    success: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('selectiveVerifyPass', () => {
  it('fails terminal when draftPlan is missing', async () => {
    const ctx = createMockCtx({ draftPlan: undefined });
    const result = await selectiveVerifyPass(ctx);
    expect(result.outcome).toBe('failed_terminal');
  });

  it('verifies stops and maps to VerifiedEntity[]', async () => {
    mockResolvePlaces.mockResolvedValue([
      mockResolvedGroup('金閣寺', true, 0.9),
      mockResolvedGroup('カフェ・モーニング', true, 0.5),
    ]);

    const ctx = createMockCtx();
    const result = await selectiveVerifyPass(ctx);

    expect(result.outcome).toBe('completed');
    const entities = result.data as VerifiedEntity[];

    // must_visit sorted first
    const kinkaku = entities.find(e => e.draftId === 'stop-001')!;
    expect(kinkaku.status).toBe('confirmed');
    expect(kinkaku.level).toBe('L2_hours_checked'); // has opening hours
    expect(kinkaku.details?.placeId).toBe('place-金閣寺');

    const cafe = entities.find(e => e.draftId === 'stop-002')!;
    expect(cafe.status).toBe('weakly_confirmed');
  });

  it('marks CLOSED_PERMANENTLY as invalid', async () => {
    mockResolvePlaces.mockResolvedValue([
      mockResolvedGroup('金閣寺', true, 0.9, 'CLOSED_PERMANENTLY'),
      mockResolvedGroup('カフェ・モーニング', true, 0.5),
    ]);

    const ctx = createMockCtx();
    const result = await selectiveVerifyPass(ctx);
    const entities = result.data as VerifiedEntity[];

    const kinkaku = entities.find(e => e.draftId === 'stop-001')!;
    expect(kinkaku.status).toBe('invalid');
    expect(kinkaku.level).toBe('L1_entity_found');
  });

  it('marks unresolved stops as unverifiable', async () => {
    mockResolvePlaces.mockResolvedValue([
      mockResolvedGroup('金閣寺', true, 0.9),
      mockResolvedGroup('カフェ・モーニング', false),
    ]);

    const ctx = createMockCtx();
    const result = await selectiveVerifyPass(ctx);
    const entities = result.data as VerifiedEntity[];

    const cafe = entities.find(e => e.draftId === 'stop-002')!;
    expect(cafe.status).toBe('unverifiable');
    expect(cafe.level).toBe('L0_unverified');
  });

  it('handles Places API failure gracefully', async () => {
    mockResolvePlaces.mockRejectedValue(new Error('OVER_QUERY_LIMIT'));

    const ctx = createMockCtx();
    const result = await selectiveVerifyPass(ctx);

    expect(result.outcome).toBe('completed');
    const entities = result.data as VerifiedEntity[];
    expect(entities).toHaveLength(2);
    expect(entities.every(e => e.status === 'unverifiable')).toBe(true);
    expect(result.warnings[0]).toBe('warning_code:places_quota_exceeded');
  });

  it('respects budget limit on number of stops', async () => {
    // Very tight budget — only 1 stop should be verified
    const ctx = {
      ...createMockCtx(),
      budget: createMockBudget(1_000), // 1s → ~1 stop
    };

    mockResolvePlaces.mockResolvedValue([
      mockResolvedGroup('金閣寺', true, 0.9),
    ]);

    const result = await selectiveVerifyPass(ctx);
    expect(result.outcome).toBe('completed');
    expect(result.warnings.some(w => w.includes('Budget limited'))).toBe(true);
  });
});
