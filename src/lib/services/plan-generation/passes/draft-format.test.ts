import { describe, expect, it } from 'vitest';
import type {
  PassBudget,
  PassContext,
  PlanGenerationSession,
} from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { draftFormatPass } from './draft-format';

function createBudget(): PassBudget {
  const deadlineAt = Date.now() + 10_000;
  return {
    maxExecutionMs: 10_000,
    deadlineAt,
    remainingMs: () => deadlineAt - Date.now(),
  };
}

function createNormalizedInput(): NormalizedRequest {
  return {
    destinations: ['金沢'],
    durationDays: 2,
    companions: 'mother',
    themes: ['art', 'local_food'],
    budgetLevel: 'standard',
    pace: 'relaxed',
    freeText: '雨なら屋内多めにしたい',
    travelVibe: 'calm',
    mustVisitPlaces: ['金沢21世紀美術館'],
    fixedSchedule: [],
    preferredTransport: ['walking', 'public_transit'],
    isDestinationDecided: true,
    region: '石川県',
    outputLanguage: 'ja',
    originalInput: {} as NormalizedRequest['originalInput'],
    hardConstraints: {
      destinations: ['金沢'],
      dateConstraints: ['2026-05-14 to 2026-05-15'],
      mustVisitPlaces: ['金沢21世紀美術館'],
      fixedTransports: [],
      fixedHotels: [],
      freeTextDirectives: ['雨なら屋内多め'],
      summaryLines: ['2日間で無理なく回りたい'],
    },
    softPreferences: {
      themes: ['art', 'local_food'],
      travelVibe: 'calm',
      rankedRequests: ['朝はゆっくり', '歩きすぎない'],
      suppressedCount: 0,
    },
    compaction: {
      applied: false,
      hardConstraintCount: 2,
      softPreferenceCount: 2,
      suppressedSoftPreferenceCount: 0,
      longInputDetected: false,
    },
  };
}

function createContext(overrides: Partial<PlanGenerationSession> = {}): PassContext {
  return {
    session: {
      id: 'run_01',
      state: 'draft_generated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      warnings: [],
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      normalizedInput: createNormalizedInput(),
      plannerDraft: {
        days: [
          {
            day: 1,
            mainArea: '広坂',
            overnightLocation: '金沢駅周辺',
            stops: [
              {
                name: '金沢21世紀美術館',
                searchQuery: '金沢21世紀美術館',
                role: 'must_visit',
                timeSlotHint: 'afternoon',
                areaHint: '広坂',
              },
              {
                name: '近江町市場',
                searchQuery: '近江町市場',
                role: 'meal',
                timeSlotHint: 'evening',
                areaHint: '武蔵',
              },
            ],
          },
          {
            day: 2,
            mainArea: '兼六園周辺',
            overnightLocation: '金沢駅周辺',
            stops: [
              {
                name: '兼六園',
                searchQuery: '兼六園',
                role: 'recommended',
                timeSlotHint: 'morning',
                areaHint: '兼六園周辺',
              },
            ],
          },
        ],
      },
      ...overrides,
    } as unknown as PlanGenerationSession,
    budget: createBudget(),
    retryPolicy: { maxRetries: 0, backoffMs: 0, retryableErrors: [] },
    qualityPolicy: {
      minOverallScore: 55,
      minCategoryScores: {},
      maxRepairIterations: 3,
      verificationLevel: 'L1_entity_found',
    },
  };
}

describe('draftFormatPass', () => {
  it('fails terminal when plannerDraft is missing', async () => {
    const result = await draftFormatPass(createContext({ plannerDraft: undefined }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.warnings[0]).toContain('plannerDraft');
  });

  it('deterministically expands PlannerDraft into DraftPlan', async () => {
    const result = await draftFormatPass(createContext());

    expect(result.outcome).toBe('completed');
    expect(result.data?.destination).toBe('金沢');
    expect(result.data?.description).toContain('金沢');
    expect(result.data?.tripIntentSummary).toContain('母');
    expect(result.data?.themes).toEqual(['art', 'local_food']);
    expect(result.data?.orderingPreferences).toEqual(['朝はゆっくり']);
    expect(result.data?.days).toHaveLength(2);
    expect(result.data?.days[0]).toMatchObject({
      day: 1,
      title: '到着後は広坂周辺へ',
      mainArea: '広坂',
      overnightLocation: '金沢駅周辺',
      summary: '到着後は広坂を中心に、2件前後で無理なく回る流れ。',
    });
    expect(result.data?.days[0]?.stops[0]).toMatchObject({
      name: '金沢21世紀美術館',
      stayDurationMinutes: 90,
      categoryHint: 'museum',
      aiConfidence: 'high',
      activityLabel: '金沢21世紀美術館を訪問',
      tags: ['art'],
    });
    expect(result.data?.days[0]?.stops[1]).toMatchObject({
      name: '近江町市場',
      stayDurationMinutes: 60,
      categoryHint: 'restaurant',
      aiConfidence: 'high',
      activityLabel: '近江町市場で食事',
      tags: ['local_food'],
    });
    expect(result.metadata?.formatterContractVersion).toBe('draft_format_v2');
    expect(result.metadata?.dayCount).toBe(2);
    expect(result.metadata?.totalStops).toBe(3);
  });
});
