import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('@/lib/limits/check', () => ({
  checkAndRecordUsage: vi.fn().mockResolvedValue({
    allowed: true,
    userType: 'free',
    userId: 'test-user',
    currentCount: 1,
    limit: 10,
    remaining: 9,
    resetAt: null,
  }),
}));

vi.mock('@/lib/services/ai/model-resolver', () => ({
  getDefaultProvider: vi.fn().mockReturnValue('gemini'),
  resolveModelForPhase: vi.fn((phase: string) => ({
    modelName: phase === 'outline' ? 'gemini-2.5-flash' : 'gemini-3-flash-preview',
    provider: 'gemini',
    temperature: phase === 'outline' ? 0.3 : 0.1,
    source: 'default',
  })),
}));

vi.mock('./steps/semantic-planner', () => ({
  runSemanticPlanner: vi.fn().mockResolvedValue({
    destination: '東京',
    description: 'テスト旅行プラン',
    candidates: [
      {
        name: '浅草寺',
        role: 'must_visit',
        priority: 10,
        dayHint: 1,
        timeSlotHint: 'morning',
        stayDurationMinutes: 60,
        searchQuery: '浅草寺',
        categoryHint: 'temple',
      },
      {
        name: 'カフェ',
        role: 'meal',
        priority: 5,
        dayHint: 1,
        timeSlotHint: 'midday',
        stayDurationMinutes: 45,
        searchQuery: 'カフェ 浅草',
        categoryHint: 'cafe',
      },
    ],
    dayStructure: [
      {
        day: 1,
        title: '浅草散策',
        mainArea: '浅草',
        overnightLocation: '浅草',
        summary: '浅草を楽しむ一日',
      },
    ],
    themes: ['歴史', 'グルメ'],
  }),
}));

vi.mock('./generation-run-logger', () => {
  class MockGenerationRunLogger {
    async startRun() {}
    async logStep() {}
    async endRun() {}
  }
  return { GenerationRunLogger: MockGenerationRunLogger };
});

vi.mock('./steps/place-resolver', () => ({
  isPlaceResolveEnabled: vi.fn().mockReturnValue(false),
  resolvePlaces: vi.fn(),
}));

vi.mock('./steps/narrative-renderer', () => ({
  runNarrativeRenderer: vi.fn().mockResolvedValue({
    description: '東京の1日旅行',
    days: [
      {
        day: 1,
        title: '浅草散策',
        activities: [
          {
            node: {
              stop: {
                candidate: {
                  name: '浅草寺',
                  role: 'must_visit',
                  priority: 10,
                  dayHint: 1,
                  timeSlotHint: 'morning',
                  stayDurationMinutes: 60,
                  searchQuery: '浅草寺',
                },
                feasibilityScore: 50,
                warnings: [],
              },
              arrivalTime: '08:00',
              departureTime: '09:00',
              stayMinutes: 60,
              warnings: [],
            },
            description: '浅草寺を訪問',
            activityName: '浅草寺',
          },
          {
            node: {
              stop: {
                candidate: {
                  name: 'カフェ',
                  role: 'meal',
                  priority: 5,
                  dayHint: 1,
                  timeSlotHint: 'midday',
                  stayDurationMinutes: 45,
                  searchQuery: 'カフェ 浅草',
                },
                feasibilityScore: 50,
                warnings: [],
              },
              arrivalTime: '09:15',
              departureTime: '10:00',
              stayMinutes: 45,
              warnings: [],
            },
            description: 'カフェでランチ',
            activityName: 'カフェ',
          },
        ],
        legs: [],
        overnightLocation: '浅草',
      },
    ],
  }),
  buildFallbackNarrativeOutput: vi.fn().mockReturnValue({
    description: '東京の1日旅行',
    days: [
      {
        day: 1,
        title: '浅草散策',
        activities: [
          {
            node: {
              stop: {
                candidate: {
                  name: '浅草寺',
                  role: 'must_visit',
                  priority: 10,
                  dayHint: 1,
                  timeSlotHint: 'morning',
                  stayDurationMinutes: 60,
                  searchQuery: '浅草寺',
                },
                feasibilityScore: 50,
                warnings: [],
              },
              arrivalTime: '08:00',
              departureTime: '09:00',
              stayMinutes: 60,
              warnings: [],
            },
            description: '浅草寺',
            activityName: '浅草寺',
          },
        ],
        legs: [],
        overnightLocation: '浅草',
      },
    ],
  }),
  streamNarrativeRendererWithResult: vi.fn().mockResolvedValue({
    dayStream: {
      async *[Symbol.asyncIterator]() {
        yield {
          day: 1,
          dayData: {
            day: 1,
            title: '浅草散策',
            activities: [
              {
                time: '08:00',
                activity: '浅草寺',
                description: '浅草寺を訪問',
              },
              {
                time: '09:15',
                activity: 'カフェ',
                description: 'カフェでランチ',
              },
            ],
          },
          isComplete: true,
        };
      },
    },
    finalOutput: Promise.resolve({
      description: '東京の1日旅行',
      days: [
        {
          day: 1,
          title: '浅草散策',
          activities: [
            {
              node: {
                stop: {
                  candidate: {
                    name: '浅草寺',
                    role: 'must_visit',
                    priority: 10,
                    dayHint: 1,
                    timeSlotHint: 'morning',
                    stayDurationMinutes: 60,
                    searchQuery: '浅草寺',
                  },
                  feasibilityScore: 50,
                  warnings: [],
                },
                arrivalTime: '08:00',
                departureTime: '09:00',
                stayMinutes: 60,
                warnings: [],
              },
              description: '浅草寺を訪問',
              activityName: '浅草寺',
            },
            {
              node: {
                stop: {
                  candidate: {
                    name: 'カフェ',
                    role: 'meal',
                    priority: 5,
                    dayHint: 1,
                    timeSlotHint: 'midday',
                    stayDurationMinutes: 45,
                    searchQuery: 'カフェ 浅草',
                  },
                  feasibilityScore: 50,
                  warnings: [],
                },
                arrivalTime: '09:15',
                departureTime: '10:00',
                stayMinutes: 45,
                warnings: [],
              },
              description: 'カフェでランチ',
              activityName: 'カフェ',
            },
          ],
          legs: [],
          overnightLocation: '浅草',
        },
      ],
    }),
  }),
}));

vi.mock('@/lib/unsplash', () => ({
  getUnsplashImage: vi.fn().mockResolvedValue({
    url: 'https://example.com/image.jpg',
    photographer: 'Test Photographer',
    photographerUrl: 'https://example.com/photographer',
  }),
}));

import { runComposePipeline } from './pipeline-orchestrator';
import type { UserInput } from '@/types/user-input';

const makeTestInput = (overrides?: Partial<UserInput>): UserInput => ({
  destinations: ['東京'],
  region: 'domestic',
  dates: '1日間',
  companions: '友達',
  theme: ['グルメ'],
  budget: 'standard',
  pace: 'balanced',
  freeText: '',
  ...overrides,
});

describe('pipeline-orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete pipeline successfully with Place resolve OFF', async () => {
    const input = makeTestInput();
    const progressSteps: string[] = [];

    const result = await runComposePipeline(input, undefined, (event) => {
      progressSteps.push(event.step);
    });

    expect(result.success).toBe(true);
    expect(result.itinerary).toBeDefined();
    expect(result.itinerary!.destination).toBe('東京');
    expect(result.itinerary!.days.length).toBeGreaterThan(0);
    expect(result.warnings).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata!.pipelineVersion).toBe('v3');
    expect(result.metadata!.placeResolveEnabled).toBe(false);

    // All progress steps should have been emitted
    expect(progressSteps).toContain('usage_check');
    expect(progressSteps).toContain('normalize');
    expect(progressSteps).toContain('semantic_plan');
    expect(progressSteps).toContain('narrative_render');
    expect(progressSteps).toContain('hero_image');
  });

  it('should return limitExceeded when usage check fails', async () => {
    const { checkAndRecordUsage } = await import('@/lib/limits/check');
    vi.mocked(checkAndRecordUsage).mockResolvedValueOnce({
      allowed: false,
      userType: 'free',
      userId: 'test-user',
      currentCount: 10,
      limit: 10,
      remaining: 0,
      resetAt: new Date('2025-04-01T00:00:00Z'),
    });

    const result = await runComposePipeline(makeTestInput());

    expect(result.success).toBe(false);
    expect(result.limitExceeded).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('should produce Itinerary with correct structure', async () => {
    const result = await runComposePipeline(makeTestInput());

    expect(result.success).toBe(true);
    const itinerary = result.itinerary!;

    // Check Itinerary structure
    expect(itinerary.id).toBeDefined();
    expect(typeof itinerary.id).toBe('string');
    expect(itinerary.description).toBeDefined();
    expect(itinerary.heroImage).toBe('https://example.com/image.jpg');
    expect(itinerary.heroImagePhotographer).toBe('Test Photographer');

    // Check days
    expect(itinerary.days.length).toBe(1);
    const day = itinerary.days[0];
    expect(day.day).toBe(1);
    expect(day.title).toBe('浅草散策');
    expect(day.activities.length).toBe(2);

    // Check activities
    expect(day.activities[0].time).toBe('08:00');
    expect(day.activities[0].activity).toBe('浅草寺');
    expect(day.activities[0].searchQuery).toBe('浅草寺');
  });

  it('should emit progress callbacks in order', async () => {
    const progressOrder: string[] = [];

    await runComposePipeline(makeTestInput(), undefined, (event) => {
      progressOrder.push(event.step);
    });

    // Verify key steps are in the right order
    const usageIdx = progressOrder.indexOf('usage_check');
    const normalizeIdx = progressOrder.indexOf('normalize');
    const semanticIdx = progressOrder.indexOf('semantic_plan');
    const heroIdx = progressOrder.indexOf('hero_image');

    expect(usageIdx).toBeLessThan(normalizeIdx);
    expect(normalizeIdx).toBeLessThan(semanticIdx);
    expect(semanticIdx).toBeLessThan(heroIdx);
  });

  it('should include metadata with step timings', async () => {
    const result = await runComposePipeline(makeTestInput());

    expect(result.metadata).toBeDefined();
    expect(result.metadata!.stepTimings).toBeDefined();
    expect(typeof result.metadata!.stepTimings.normalize).toBe('number');
    expect(result.metadata!.modelName).toBe('gemini-2.5-flash');
    expect(result.metadata!.modelTier).toBe('flash');
  });

  it('should report compaction metadata when optional requests are excessive', async () => {
    const result = await runComposePipeline(
      makeTestInput({
        theme: ['グルメ', 'カフェ', '歴史', '自然', '買い物'],
        travelVibe: '大人っぽい旅',
        freeText:
          '朝活したい。写真映え重視。穴場も見たい。カフェ多め。散歩したい。ゆっくりしたい。買い物もしたい。ホテルは絶対守って。',
      })
    );

    expect(result.success).toBe(true);
    expect(result.metadata?.compactionApplied).toBe(true);
    expect(result.metadata?.softPreferenceCount).toBeGreaterThan(0);
    expect(result.metadata?.suppressedSoftPreferenceCount).toBeGreaterThan(0);
    expect(result.metadata?.hardConstraintCount).toBeGreaterThan(0);
  });

  it('should skip place resolve when the deadline is close', async () => {
    const { isPlaceResolveEnabled, resolvePlaces } = await import('./steps/place-resolver');
    vi.mocked(isPlaceResolveEnabled).mockReturnValueOnce(true);

    let fakeNow = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);
    const { runSemanticPlanner } = await import('./steps/semantic-planner');
    vi.mocked(runSemanticPlanner).mockImplementationOnce(async () => {
      fakeNow = 19_500;
      return {
        destination: '東京',
        description: 'テスト旅行プラン',
        candidates: [
          {
            name: '浅草寺',
            role: 'must_visit',
            priority: 10,
            dayHint: 1,
            timeSlotHint: 'morning',
            stayDurationMinutes: 60,
            searchQuery: '浅草寺',
            categoryHint: 'temple',
          },
        ],
        dayStructure: [
          {
            day: 1,
            title: '浅草散策',
            mainArea: '浅草',
            overnightLocation: '浅草',
            summary: '浅草を楽しむ一日',
          },
        ],
        themes: ['歴史'],
      };
    });

    const result = await runComposePipeline(makeTestInput());

    expect(result.success).toBe(true);
    expect(resolvePlaces).not.toHaveBeenCalled();
    expect(result.metadata?.timeoutMitigationUsed).toBe(true);
    nowSpy.mockRestore();
  });

  it('should fall back to a plain narrative when the remaining budget is too small', async () => {
    let fakeNow = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);
    const { streamNarrativeRendererWithResult } = await import('./steps/narrative-renderer');

    vi.mocked(streamNarrativeRendererWithResult).mockImplementationOnce(async () => {
      throw new Error('stream should be skipped when time is low');
    });

    const { runSemanticPlanner } = await import('./steps/semantic-planner');
    vi.mocked(runSemanticPlanner).mockImplementationOnce(async () => {
      fakeNow = 19_500;
      return {
        destination: '東京',
        description: 'テスト旅行プラン',
        candidates: [
          {
            name: '浅草寺',
            role: 'must_visit',
            priority: 10,
            dayHint: 1,
            timeSlotHint: 'morning',
            stayDurationMinutes: 60,
            searchQuery: '浅草寺',
            categoryHint: 'temple',
          },
        ],
        dayStructure: [
          {
            day: 1,
            title: '浅草散策',
            mainArea: '浅草',
            overnightLocation: '浅草',
            summary: '浅草を楽しむ一日',
          },
        ],
        themes: ['歴史'],
      };
    });

    const result = await runComposePipeline(makeTestInput());

    expect(result.success).toBe(true);
    expect(streamNarrativeRendererWithResult).not.toHaveBeenCalled();
    expect(result.metadata?.timeoutMitigationUsed).toBe(true);
    nowSpy.mockRestore();
  });
});
