import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PassBudget,
  PassContext,
  PlanGenerationSession,
  PlannerDraft,
  PlannerSeed,
} from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import type { UserInput } from '@/types/user-input';

const mockStreamText = vi.fn();

vi.mock('ai', () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
  streamText: mockStreamText,
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => ({ provider: 'gemini-model' }))),
}));

import { draftGeneratePass } from './draft-generate';

function createNormalizedInput(): NormalizedRequest {
  return {
    destinations: ['金沢'],
    durationDays: 2,
    startDate: '2026-05-14',
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
    originalInput: {} as UserInput,
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

function createBudget(remainingMs: number): PassBudget {
  const deadlineAt = Date.now() + remainingMs;
  return {
    maxExecutionMs: remainingMs,
    deadlineAt,
    remainingMs: () => deadlineAt - Date.now(),
  };
}

function createCtx(
  overrides: Partial<PlanGenerationSession> = {},
  remainingMs = 20_000,
): PassContext {
  return {
    session: {
      id: 'run_01',
      state: 'normalized',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      warnings: [],
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      normalizedInput: createNormalizedInput(),
      generationProfile: {
        modelName: 'gemini-2.5-flash',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-2.5-flash',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
      },
      ...overrides,
    } as unknown as PlanGenerationSession,
    budget: createBudget(remainingMs),
    retryPolicy: { maxRetries: 0, backoffMs: 0, retryableErrors: [] },
    qualityPolicy: {
      minOverallScore: 55,
      minCategoryScores: {},
      maxRepairIterations: 3,
      verificationLevel: 'L1_entity_found',
    },
  };
}

function createStreamTextResult(text: string) {
  return {
    textStream: (async function* () {
      yield text;
    })(),
  };
}

const seedResponse = JSON.stringify({
  days: [
    { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
    { day: 2, mainArea: '兼六園周辺', overnightLocation: '金沢駅周辺' },
  ],
});

const day1Response = JSON.stringify({
  day: 1,
  stops: [
    {
      name: 'ひがし茶屋街',
      searchQuery: 'ひがし茶屋街',
      role: 'recommended',
      timeSlotHint: 'midday',
      areaHint: '東山',
    },
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
});

const day2Response = JSON.stringify({
  day: 2,
  stops: [
    {
      name: '兼六園',
      searchQuery: '兼六園',
      role: 'recommended',
      timeSlotHint: 'morning',
      areaHint: '兼六園周辺',
    },
    {
      name: '金沢城公園',
      searchQuery: '金沢城公園',
      role: 'recommended',
      timeSlotHint: 'afternoon',
      areaHint: '兼六園周辺',
    },
    {
      name: 'ひらみぱん',
      searchQuery: 'ひらみぱん',
      role: 'meal',
      timeSlotHint: 'midday',
      areaHint: '長町',
    },
  ],
});

const oneDaySeedResponse = JSON.stringify({
  days: [
    { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
  ],
});

const day1SingleChunkResponse = JSON.stringify({
  day: 1,
  stops: [
    { slotIndex: 1, name: '金沢21世紀美術館', role: 'recommended', timeSlotHint: 'morning', areaHint: '広坂' },
  ],
});

const insufficientDayResponse = JSON.stringify({
  day: 1,
  stops: [
    {
      name: '金沢21世紀美術館',
      searchQuery: '金沢21世紀美術館',
      role: 'recommended',
      timeSlotHint: 'morning',
      areaHint: '広坂',
    },
  ],
});

const middayOnlyDayResponse = JSON.stringify({
  day: 1,
  stops: [
    {
      name: '金沢駅鼓門',
      searchQuery: '金沢駅鼓門',
      role: 'recommended',
      timeSlotHint: 'morning',
      areaHint: '金沢駅',
    },
    {
      name: '近江町市場',
      searchQuery: '近江町市場',
      role: 'meal',
      timeSlotHint: 'midday',
      areaHint: '武蔵',
    },
    {
      name: 'ホテル日航金沢',
      searchQuery: 'ホテル日航金沢',
      role: 'accommodation',
      timeSlotHint: 'evening',
      areaHint: '金沢駅',
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  mockStreamText.mockReset();
});

describe('draftGeneratePass', () => {
  it('pauses on seed_request when runtime budget is already too low', async () => {
    const result = await draftGeneratePass(createCtx({}, 6_200));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('seed_request');
    expect(result.metadata?.pauseReason).toBe('runtime_budget_exhausted');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'seed_request',
      pauseReason: 'runtime_budget_exhausted',
      nextDayIndex: 1,
      seedAttempt: 1,
    });
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it('completes via seed + per-day requests inside the canonical split planner', async () => {
    mockStreamText
      .mockResolvedValueOnce(createStreamTextResult(seedResponse))
      .mockResolvedValueOnce(createStreamTextResult(day1Response))
      .mockResolvedValueOnce(createStreamTextResult(day2Response));

    const result = await draftGeneratePass(createCtx());

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.plannerContractVersion).toBe('semantic_draft_v5');
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.pauseAfterDayCompletion).toBe(true);
    expect(result.data?.days).toHaveLength(1);
    expect(result.data?.days[0]).toMatchObject({
      day: 1,
      mainArea: '広坂',
      overnightLocation: '金沢駅周辺',
    });
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      currentDayExecution: null,
      nextDayIndex: 2,
      resumeSubstage: 'day_request',
    });
    expect(mockStreamText).toHaveBeenCalledTimes(2);
    expect(mockStreamText.mock.calls[0]?.[0]).toMatchObject({
      maxTokens: 520,
    });
    expect(mockStreamText.mock.calls[1]?.[0]).toMatchObject({
      maxTokens: 655,
    });
  });

  it('keeps the canonical split planner as the default even on the free preview model', async () => {
    mockStreamText
      .mockResolvedValueOnce(createStreamTextResult(seedResponse))
      .mockResolvedValueOnce(createStreamTextResult(day1Response))
      .mockResolvedValueOnce(createStreamTextResult(day2Response));

    const result = await draftGeneratePass(createCtx({
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.plannerContractVersion).toBe('semantic_draft_v5');
    expect(result.metadata?.plannerStrategy).toBe('split_day_v5');
    expect(result.metadata?.pathType).toBe('full_day');
    expect(result.metadata?.fallbackTriggered).toBe(false);
    expect(mockStreamText).toHaveBeenCalledTimes(2);
  });

  it('falls back to micro day split only after repeated full-day validation failures on the same day', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(insufficientDayResponse));

    const result = await draftGeneratePass(createCtx({
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 2,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(result.metadata?.plannerContractVersion).toBe('semantic_draft_v6');
    expect(result.metadata?.pathType).toBe('micro_day_split');
    expect(result.metadata?.fallbackTriggered).toBe(true);
    expect(result.metadata?.fallbackReason).toBe('full_day_validation_retries_exhausted');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumeSubstage: 'day_outline_request',
      outlineAttempt: 1,
      nextDayIndex: 1,
      currentDayExecution: {
        dayIndex: 1,
        strategy: 'micro_day_split',
        substage: 'day_outline_request',
      },
    });
  });

  it('rejects a day that only has activities until midday plus accommodation', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(middayOnlyDayResponse));

    const result = await draftGeneratePass(createCtx({
      plannerSeed: {
        days: [
          { day: 1, mainArea: '金沢駅周辺', overnightLocation: '金沢駅周辺' },
        ],
      },
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.nextDayIndex).toBe(1);
    expect(result.metadata?.dayAttempt).toBe(2);
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumeSubstage: 'day_request',
      nextDayIndex: 1,
      dayAttempt: 2,
      currentDayExecution: {
        dayIndex: 1,
        strategy: 'split_day_v5',
        substage: 'day_request',
      },
    });
  });

  it('does not revive stale constrained_completion state on retry', async () => {
    const constrainedMismatchResponse = JSON.stringify({
      day: 1,
      slots: [
        {
          slotIndex: 1,
          role: 'recommended',
          timeSlotHint: 'morning',
          areaHint: '広坂',
        },
      ],
    });

    mockStreamText.mockResolvedValueOnce(createStreamTextResult(constrainedMismatchResponse));

    const firstResult = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 1,
        draftGenerateStrategyDay: 1,
        draftGenerateCurrentStrategy: 'constrained_completion',
        draftGenerateStrategyEscalationCount: 1,
      },
    }));

    expect(firstResult.outcome).toBe('partial');
    expect(firstResult.metadata?.plannerStrategy).toBe('split_day_v5');
    expect(firstResult.metadata?.errorCode).toBe('draft_generation_contract_mismatch');
    expect(firstResult.metadata?.rootCause).toBe('strategy_contract_mismatch');
    expect(firstResult.metadata?.pipelineContextPatch).toMatchObject({
      draftGenerateCurrentStrategy: 'split_day_v5',
      resumeSubstage: 'day_request',
    });

    mockStreamText.mockReset();
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(constrainedMismatchResponse));

    const retryPipelineContext = firstResult.metadata?.pipelineContextPatch as Record<string, unknown>;
    const secondResult = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        ...retryPipelineContext,
      },
    }));

    expect(secondResult.outcome).toBe('partial');
    expect(secondResult.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(secondResult.metadata?.errorCode).toBe('draft_generation_contract_mismatch');
    expect(secondResult.metadata?.fallbackReason).toBe('full_day_contract_recurrence_micro_split');
  });

  it('salvages a truncated outline prefix and proceeds to chunk generation without requiring meal in the outline', async () => {
    mockStreamText
      .mockResolvedValueOnce(createStreamTextResult(oneDaySeedResponse))
      .mockResolvedValueOnce(createStreamTextResult(
        '{"day":1,"slots":[{"slotIndex":1,"role":"recommended","timeSlotHint":"morning","areaHint":"広坂"},{"slotIndex":2,"role":"meal"',
      ))
      .mockResolvedValueOnce(createStreamTextResult(day1SingleChunkResponse));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_outline_request',
        nextDayIndex: 1,
        outlineAttempt: 1,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(result.metadata?.plannerContractVersion).toBe('semantic_draft_v6');
    expect(result.metadata?.substage).toBe('day_outline_parse');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumeSubstage: 'day_outline_request',
    });
  });

  it('salvages a parsed outline with trailing slot index mismatch and proceeds to chunk generation', async () => {
    mockStreamText
      .mockResolvedValueOnce(createStreamTextResult(oneDaySeedResponse))
      .mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
        day: 1,
        slots: [
          { slotIndex: 1, role: 'recommended', timeSlotHint: 'morning', areaHint: '広坂' },
          { slotIndex: 3, role: 'meal', timeSlotHint: 'midday', areaHint: '武蔵' },
        ],
      })))
      .mockResolvedValueOnce(createStreamTextResult(day1SingleChunkResponse));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_outline_request',
        nextDayIndex: 1,
        outlineAttempt: 1,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(result.metadata?.substage).toBe('day_outline_parse');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumeSubstage: 'day_outline_request',
    });
  });

  it('salvages a truncated stops-shaped outline and reaches chunk generation', async () => {
    mockStreamText
      .mockResolvedValueOnce(createStreamTextResult(
        '{"day":1,"stops":[{"name":"近江町市場","role":"meal","timeSlotHint":"midday"},{"name":"金沢21世紀美術館","role":"must_visit","timeSlotHint":"afternoon"},{"name":"ひがし茶屋街","role":"recommended","timeSlotHint":"evening"}',
      ))
      .mockRejectedValueOnce(new Error('text json generation timed out after 3000ms for draft_generate.day_chunk_1_0'));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_outline_request',
        nextDayIndex: 1,
        outlineAttempt: 1,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(result.metadata?.substage).toBe('day_chunk_request');
    expect(result.metadata?.errorCode).toBe('draft_generation_timeout');
    expect(mockStreamText).toHaveBeenCalledTimes(2);
  });

  it('pauses and retries seed_request instead of terminal-failing on timeout', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('text json generation timed out after 4000ms for draft_generate.seed'));

    const result = await draftGeneratePass(createCtx());

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('seed_request');
    expect(result.metadata?.pauseReason).toBe('runtime_budget_exhausted');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'seed_request',
      seedAttempt: 2,
      nextDayIndex: 1,
    });
  });

  it('fails terminal after the final allowed seed_request retry', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('text json generation timed out after 4000ms for draft_generate.seed'));

    const result = await draftGeneratePass(createCtx({
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'seed_request',
        seedAttempt: 3,
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.substage).toBe('seed_request');
    expect(result.metadata?.errorCode).toBe('draft_generation_timeout');
    expect(result.metadata?.rootCause).toBe('timeout');
  });

  it('classifies seed schema validation failures as invalid_output instead of provider_error', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      days: [
        { day: 1, overnightLocation: '金沢駅周辺' },
        { day: 2, mainArea: '兼六園周辺', overnightLocation: '金沢駅周辺' },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'seed_request',
        seedAttempt: 3,
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.substage).toBe('seed_parse');
    expect(result.metadata?.errorCode).toBe('draft_generation_invalid_output');
    expect(result.metadata?.rootCause).toBe('invalid_structured_output');
    expect(result.metadata?.invalidFieldPath).toBe('days.0.mainArea');
    expect(result.metadata?.validationIssueCode).toBe('invalid_type');
    expect(result.metadata?.seedPromptVariant).toBe('ultra_compact');
  });

  it('salvages a valid seed prefix and pauses for another seed_request instead of terminal-failing', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      days: [
        { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        { day: 2, mainArea: '兼六園周辺' },
      ],
    })));

    const result = await draftGeneratePass(createCtx());

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('seed_parse');
    expect(result.metadata?.pauseReason).toBe('recovery_required');
    expect(result.metadata?.usedTextRecovery).toBe(true);
    expect(result.metadata?.salvagedDayCount).toBe(1);
    expect(result.metadata?.expectedDayCount).toBe(2);
    expect(result.metadata?.seedPromptVariant).toBe('standard');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'seed_request',
      seedAttempt: 2,
      nextDayIndex: 1,
    });
  });

  it('pauses after a recovered seed completion before starting day 1 in the same stream', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(
      '{"days":[{"day":1,"mainArea":"広坂","overnightLocation":"金沢駅周辺"},{"day":2,"mainArea":"兼六園周辺","overnightLocation":"金沢駅周辺"}',
    ));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 2,
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('seed_parse');
    expect(result.metadata?.pauseReason).toBe('runtime_budget_exhausted');
    expect(result.metadata?.pauseAfterSeedCompletion).toBe(true);
    expect(result.metadata?.minimumDayStartBudgetMs).toBe(5000);
    expect(result.metadata?.nextDayIndex).toBe(1);
    expect(result.metadata?.dayAttempt).toBe(1);
    expect(result.metadata?.completedDayCount).toBe(0);
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'day_request',
      nextDayIndex: 1,
      dayAttempt: 1,
      pauseReason: 'runtime_budget_exhausted',
    });
  });

  it('keeps true upstream failures classified as provider_error', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('upstream service unavailable'));

    const result = await draftGeneratePass(createCtx({
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'seed_request',
        seedAttempt: 3,
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.substage).toBe('seed_request');
    expect(result.metadata?.errorCode).toBe('draft_generation_provider_error');
    expect(result.metadata?.rootCause).toBe('llm_error');
  });

  it('uses a more aggressive seed prompt budget on later retries', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('text json generation timed out after 4500ms for draft_generate.seed'));

    const result = await draftGeneratePass(createCtx({
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'seed_request',
        seedAttempt: 2,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('seed_request');
    expect(result.metadata?.seedPromptVariant).toBe('compact');
    expect(result.metadata?.selectedTimeoutMs).toBe(4500);
    expect(mockStreamText.mock.calls[0]?.[0]).toMatchObject({
      maxTokens: 648,
      temperature: 0.4,
    });
  });

  it('pauses on day_request parse failure and retries the same day', async () => {
    mockStreamText
      .mockResolvedValueOnce(createStreamTextResult(seedResponse))
      .mockResolvedValueOnce(createStreamTextResult('{"day":1,"stops":[{"name":"金沢21世紀美術館"'));

    const result = await draftGeneratePass(createCtx());

    expect(result.outcome).toBe('partial');
    expect(result.data).toEqual({ days: [] });
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.pauseReason).toBe('recovery_required');
    expect(result.metadata?.usedTextRecovery).toBe(true);
    expect(result.metadata?.dayPromptVariant).toBe('standard');
    expect(result.metadata?.salvagedStopCount).toBe(1);
    expect(result.metadata?.requiredMealRecovered).toBe(false);
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'day_request',
      nextDayIndex: 1,
      dayAttempt: 2,
    });
    expect((result.metadata?.sessionPatch as { plannerSeed?: PlannerSeed })?.plannerSeed?.days).toHaveLength(2);
  });

  it('uses a more aggressive day prompt budget on later retries', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('text json generation timed out after 4500ms for draft_generate.day_1'));

    const result = await draftGeneratePass(createCtx({
      plannerSeed: JSON.parse(seedResponse) as PlannerSeed,
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 2,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('day_request');
    expect(result.metadata?.dayPromptVariant).toBe('compact');
    expect(result.metadata?.selectedTimeoutMs).toBe(6000);
    expect(mockStreamText.mock.calls[0]?.[0]).toMatchObject({
      maxTokens: 783,
      temperature: 0.4,
    });
  });

  it('pauses day attempt 1 instead of starting with less than the minimum first-day budget', async () => {
    const result = await draftGeneratePass(createCtx({
      plannerSeed: JSON.parse(seedResponse) as PlannerSeed,
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 1,
      },
    }, 3_000));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('day_request');
    expect(result.metadata?.pauseReason).toBe('runtime_budget_exhausted');
    expect(result.metadata?.minimumDayStartBudgetMs).toBe(5000);
    expect(result.metadata?.nextDayIndex).toBe(1);
    expect(result.metadata?.dayAttempt).toBe(1);
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it('salvages a valid day stop prefix and completes when meal coverage is preserved', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(
      '{"day":1,"stops":[{"name":"兼六園","role":"recommended","timeSlotHint":"morning","areaHint":"兼六園周辺"},{"name":"金沢21世紀美術館","role":"must_visit","timeSlotHint":"afternoon","areaHint":"広坂"},{"name":"近江町市場","role":"meal","timeSlotHint":"evening","areaHint":"武蔵"}',
    ));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 1,
      },
    }));

    expect(result.outcome).toBe('completed');
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.usedTextRecovery).toBe(true);
    expect(result.metadata?.salvagedStopCount).toBe(3);
    expect(result.metadata?.requiredMealRecovered).toBe(true);
    expect(result.data?.days[0]?.stops).toHaveLength(3);
  });

  it('fills searchQuery and missing areaHint deterministically for day output', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 1,
      stops: [
        {
          name: '金沢21世紀美術館',
          role: 'must_visit',
          timeSlotHint: 'morning',
        },
        {
          name: '兼六園',
          role: 'recommended',
          timeSlotHint: 'afternoon',
        },
        {
          name: '近江町市場',
          role: 'meal',
          timeSlotHint: 'evening',
        },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 1,
      },
    }));

    expect(result.outcome).toBe('completed');
    expect(result.data?.days[0]?.stops[0]).toMatchObject({
      name: '金沢21世紀美術館',
      searchQuery: '金沢21世紀美術館',
      areaHint: '広坂',
    });
    expect(result.data?.days[0]?.stops[1]).toMatchObject({
      name: '兼六園',
      searchQuery: '兼六園',
      areaHint: '広坂',
    });
  });

  it('pauses after a recovered day completion before starting the next day in the same stream', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(
      '{"day":1,"stops":[{"name":"兼六園","role":"recommended","timeSlotHint":"morning","areaHint":"兼六園周辺"},{"name":"金沢21世紀美術館","role":"must_visit","timeSlotHint":"afternoon","areaHint":"広坂"},{"name":"近江町市場","role":"meal","timeSlotHint":"evening","areaHint":"武蔵"}',
    ));

    const result = await draftGeneratePass(createCtx({
      plannerSeed: JSON.parse(seedResponse) as PlannerSeed,
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 3,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.pauseReason).toBe('runtime_budget_exhausted');
    expect(result.metadata?.usedTextRecovery).toBe(true);
    expect(result.metadata?.nextDayIndex).toBe(2);
    expect(result.metadata?.dayAttempt).toBe(1);
    expect(result.metadata?.pauseAfterDayCompletion).toBe(true);
    expect(result.metadata?.continuedToNextDayInSameStream).toBe(false);
    expect(result.metadata?.completedDayCount).toBe(1);
    expect(result.metadata?.salvagedStopCount).toBe(3);
    expect(result.metadata?.requiredMealRecovered).toBe(true);
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'day_request',
      nextDayIndex: 2,
      dayAttempt: 1,
      pauseReason: 'runtime_budget_exhausted',
    });
  });

  it('fails terminal after the final allowed day_request retry', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('text json generation timed out after 5000ms for draft_generate.day_1'));

    const result = await draftGeneratePass(createCtx({
      plannerSeed: JSON.parse(seedResponse) as PlannerSeed,
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 3,
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.substage).toBe('day_request');
    expect(result.metadata?.errorCode).toBe('draft_generation_timeout');
    expect(result.metadata?.dayPromptVariant).toBe('ultra_compact');
    expect(result.metadata?.selectedTimeoutMs).toBe(7000);
  });

  it('resumes at day_request and completes remaining days without AI recovery fallback', async () => {
    const partialDraft: PlannerDraft = {
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
      ],
    };

    mockStreamText.mockResolvedValueOnce(createStreamTextResult(day2Response));

    const result = await draftGeneratePass(createCtx({
      plannerSeed: JSON.parse(seedResponse) as PlannerSeed,
      plannerDraft: partialDraft,
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 2,
        dayAttempt: 1,
      },
    }));

    expect(result.outcome).toBe('completed');
    expect(result.data?.days).toHaveLength(2);
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.sessionPatch).toMatchObject({
      plannerSeed: null,
    });
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: null,
      resumeSubstage: null,
      nextDayIndex: null,
    });
  });

  it('raises day maxTokens for a 3-day balanced trip but keeps per-day planning split', async () => {
    mockStreamText
      .mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
        days: [
          { day: 1, mainArea: '金沢駅周辺', overnightLocation: '金沢駅周辺' },
          { day: 2, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
          { day: 3, mainArea: '兼六園周辺', overnightLocation: '金沢駅周辺' },
        ],
      })))
      .mockResolvedValueOnce(createStreamTextResult(day1Response))
      .mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
        day: 2,
        stops: [
          {
            name: 'しいのき迎賓館',
            searchQuery: 'しいのき迎賓館',
            role: 'recommended',
            timeSlotHint: 'morning',
            areaHint: '広坂',
          },
          {
            name: '金沢21世紀美術館',
            searchQuery: '金沢21世紀美術館',
            role: 'must_visit',
            timeSlotHint: 'midday',
            areaHint: '広坂',
          },
          {
            name: '近江町市場',
            searchQuery: '近江町市場',
            role: 'meal',
            timeSlotHint: 'afternoon',
            areaHint: '武蔵',
          },
          {
            name: '金沢城公園',
            searchQuery: '金沢城公園',
            role: 'recommended',
            timeSlotHint: 'evening',
            areaHint: '広坂',
          },
        ],
      })))
      .mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
        day: 3,
        stops: [
          {
            name: '兼六園',
            searchQuery: '兼六園',
            role: 'recommended',
            timeSlotHint: 'morning',
            areaHint: '兼六園周辺',
          },
          {
            name: '不室屋カフェ',
            searchQuery: '不室屋カフェ',
            role: 'meal',
            timeSlotHint: 'midday',
            areaHint: '東山',
          },
        ],
      })));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 3,
        pace: 'balanced',
      },
    }));

    expect(['completed', 'partial']).toContain(result.outcome);
    expect(result.metadata?.plannerContractVersion).toBe('semantic_draft_v5');
    expect(mockStreamText.mock.calls[0]?.[0]).toMatchObject({
      maxTokens: 660,
    });
    expect(mockStreamText.mock.calls[1]?.[0]).toMatchObject({
      maxTokens: 750,
    });
  });

  it('pauses and retries the same day when generated stops duplicate an already completed stop', async () => {
    const partialDraft: PlannerDraft = {
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
              timeSlotHint: 'morning',
              areaHint: '広坂',
            },
            {
              name: '近江町市場',
              searchQuery: '近江町市場',
              role: 'meal',
              timeSlotHint: 'midday',
              areaHint: '武蔵',
            },
          ],
        },
      ],
    };

    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 2,
      stops: [
        {
          name: '金沢21世紀美術館',
          searchQuery: '金沢21世紀美術館',
          role: 'recommended',
          timeSlotHint: 'morning',
          areaHint: '兼六園周辺',
        },
        {
          name: 'ひらみぱん',
          searchQuery: 'ひらみぱん',
          role: 'meal',
          timeSlotHint: 'midday',
          areaHint: '長町',
        },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      plannerSeed: JSON.parse(seedResponse) as PlannerSeed,
      plannerDraft: partialDraft,
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 2,
        dayAttempt: 1,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.pauseReason).toBe('recovery_required');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumeSubstage: 'day_request',
      nextDayIndex: 2,
      dayAttempt: 2,
    });
  });

  it('pauses and retries the same middle day when the stop count is below the hard minimum', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 2,
      stops: [
        {
          name: 'しいのき迎賓館',
          searchQuery: 'しいのき迎賓館',
          role: 'recommended',
          timeSlotHint: 'morning',
          areaHint: '広坂',
        },
        {
          name: '近江町市場',
          searchQuery: '近江町市場',
          role: 'meal',
          timeSlotHint: 'midday',
          areaHint: '武蔵',
        },
        {
          name: '金沢能楽美術館',
          searchQuery: '金沢能楽美術館',
          role: 'recommended',
          timeSlotHint: 'afternoon',
          areaHint: '広坂',
        },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 3,
        pace: 'balanced',
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '金沢駅周辺', overnightLocation: '金沢駅周辺' },
          { day: 2, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
          { day: 3, mainArea: '兼六園周辺', overnightLocation: '金沢駅周辺' },
        ],
      },
      plannerDraft: {
        days: [
          {
            day: 1,
            mainArea: '金沢駅周辺',
            overnightLocation: '金沢駅周辺',
            stops: [
              {
                name: '近江町市場',
                searchQuery: '近江町市場',
                role: 'meal',
                timeSlotHint: 'midday',
                areaHint: '武蔵',
              },
              {
                name: '金沢21世紀美術館',
                searchQuery: '金沢21世紀美術館',
                role: 'must_visit',
                timeSlotHint: 'afternoon',
                areaHint: '広坂',
              },
            ],
          },
        ],
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 2,
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.pauseReason).toBe('recovery_required');
  });

  it('fails fast after repeated micro outline failures on the same day', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 1,
      slots: [],
    })));

    const firstResult = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_outline_request',
        nextDayIndex: 1,
        outlineAttempt: 1,
        draftGenerateCurrentStrategy: 'micro_day_split',
      },
    }));

    expect(firstResult.outcome).toBe('partial');
    expect(firstResult.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(firstResult.metadata?.errorCode).toBe('draft_generation_outline_contract_mismatch');

    mockStreamText.mockReset();
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 1,
      slots: [],
    })));

    const retryPipelineContext = firstResult.metadata?.pipelineContextPatch as Record<string, unknown>;
    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        ...retryPipelineContext,
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(result.metadata?.pathType).toBe('micro_day_split');
    expect(result.metadata?.fallbackReason).toBe('micro_strategy_exhausted');
    expect(result.metadata?.sameErrorRecurrenceCount).toBe(2);
    expect(result.metadata?.errorCode).toBe('draft_generation_outline_contract_mismatch');
  });

  it('classifies insufficient outline slots as outline contract mismatch', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 1,
      slots: [
        { slotIndex: 1, role: 'meal', timeSlotHint: 'midday', areaHint: '武蔵' },
        { slotIndex: 2, role: 'recommended', timeSlotHint: 'afternoon', areaHint: '広坂' },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_outline_request',
        nextDayIndex: 1,
        outlineAttempt: 3,
        draftGenerateCurrentStrategy: 'micro_day_split',
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.plannerStrategy).toBe('micro_day_split');
    expect(result.metadata?.invalidFieldPath).toBe('slots');
    expect(result.metadata?.rootCause).toBe('strategy_contract_mismatch');
    expect(result.metadata?.errorCode).toBe('draft_generation_outline_contract_mismatch');
  });

  it('classifies repeated missing_meal validation failures with a dedicated error code', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 1,
      stops: [
        {
          name: '兼六園',
          searchQuery: '兼六園',
          role: 'must_visit',
          timeSlotHint: 'morning',
          areaHint: '兼六園周辺',
          rationale: '朝の散策に向く',
        },
        {
          name: '金沢21世紀美術館',
          searchQuery: '金沢21世紀美術館',
          role: 'recommended',
          timeSlotHint: 'afternoon',
          areaHint: '広坂',
          rationale: '午後の主目的地',
        },
        {
          name: '金沢駅',
          searchQuery: '金沢駅',
          role: 'hotel',
          timeSlotHint: 'evening',
          areaHint: '金沢駅周辺',
          rationale: '宿に向かう',
        },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 3,
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.errorCode).toBe('draft_generation_missing_meal');
    expect(result.metadata?.rootCause).toBe('invalid_structured_output');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'day_request',
      pauseReason: 'recovery_required',
      nextDayIndex: 1,
      dayAttempt: 3,
    });
  });

  it('classifies insufficient_stops validation failures with a dedicated error code', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 2,
      stops: [
        {
          name: '兼六園',
          searchQuery: '兼六園',
          role: 'must_visit',
          timeSlotHint: 'morning',
          areaHint: '兼六園周辺',
          rationale: '朝の散策に向く',
        },
        {
          name: '近江町市場',
          searchQuery: '近江町市場',
          role: 'meal',
          timeSlotHint: 'midday',
          areaHint: '武蔵',
          rationale: '昼食',
        },
        {
          name: '金沢駅',
          searchQuery: '金沢駅',
          role: 'hotel',
          timeSlotHint: 'evening',
          areaHint: '金沢駅周辺',
          rationale: '宿に向かう',
        },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 3,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '金沢駅周辺', overnightLocation: '金沢駅周辺' },
          { day: 2, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
          { day: 3, mainArea: '兼六園周辺', overnightLocation: '金沢駅周辺' },
        ],
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 2,
        dayAttempt: 3,
      },
    }));

    expect(result.outcome).toBe('failed_terminal');
    expect(result.metadata?.substage).toBe('day_parse');
    expect(result.metadata?.errorCode).toBe('draft_generation_insufficient_stops');
    expect(result.metadata?.rootCause).toBe('invalid_structured_output');
    expect(result.metadata?.pipelineContextPatch).toMatchObject({
      resumePassId: 'draft_generate',
      resumeSubstage: 'day_request',
      pauseReason: 'recovery_required',
      nextDayIndex: 2,
      dayAttempt: 3,
    });
  });

  it('classifies split-day stop-shape validation failures as contract mismatches', async () => {
    mockStreamText.mockResolvedValueOnce(createStreamTextResult(JSON.stringify({
      day: 1,
      stops: [
        {
          role: 'must_visit',
          timeSlotHint: 'morning',
          areaHint: '兼六園周辺',
          rationale: '朝の散策に向く',
        },
      ],
    })));

    const result = await draftGeneratePass(createCtx({
      normalizedInput: {
        ...createNormalizedInput(),
        durationDays: 1,
      },
      plannerSeed: {
        days: [
          { day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' },
        ],
      },
      generationProfile: {
        modelName: 'gemini-3-flash-preview',
        narrativeModelName: 'gemini-2.5-flash',
        plannerModelName: 'gemini-3-flash-preview',
        provider: 'gemini',
        plannerProvider: 'gemini',
        temperature: 0.5,
        modelTier: 'flash',
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 1,
        dayAttempt: 1,
        draftGenerateCurrentStrategy: 'split_day_v5',
      },
    }));

    expect(result.outcome).toBe('partial');
    expect(result.metadata?.plannerStrategy).toBe('split_day_v5');
    expect(result.metadata?.errorCode).toBe('draft_generation_contract_mismatch');
    expect(result.metadata?.rootCause).toBe('strategy_contract_mismatch');
  });
});
