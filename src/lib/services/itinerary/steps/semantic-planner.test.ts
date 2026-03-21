import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import {
  buildDeterministicDayCandidates,
  buildDeterministicSemanticSeedPlan,
  sanitizeSemanticPlanFields,
  truncateRepetitive,
} from './semantic-planner';

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    destinations: ['尾道'],
    durationDays: 2,
    companions: '友人',
    themes: ['街歩き', '写真'],
    budgetLevel: 'standard',
    pace: 'balanced',
    freeText: '千光寺と尾道本通り商店街に行きたい。',
    travelVibe: '落ち着いたローカル旅',
    mustVisitPlaces: [],
    fixedSchedule: [],
    preferredTransport: ['walking'],
    isDestinationDecided: true,
    region: 'japan',
    outputLanguage: 'ja',
    originalInput: {
      destinations: ['尾道'],
      dates: '2日間',
      companions: '友人',
      theme: ['街歩き', '写真'],
      budget: '普通',
      pace: 'バランス',
      freeText: '千光寺と尾道本通り商店街に行きたい。',
      preferredTransport: ['徒歩'],
      isDestinationDecided: true,
      region: 'japan',
    },
    durationMinutes: 1680,
    locale: 'ja',
    hardConstraints: {
      destinations: ['尾道'],
      dateConstraints: [],
      mustVisitPlaces: [],
      fixedTransports: [],
      fixedHotels: [],
      freeTextDirectives: [],
      summaryLines: [],
    },
    softPreferences: {
      themes: ['街歩き', '写真'],
      travelVibe: '落ち着いたローカル旅',
      rankedRequests: ['千光寺と尾道本通り商店街に行きたい'],
      suppressedCount: 0,
    },
    compaction: {
      applied: false,
      hardConstraintCount: 0,
      softPreferenceCount: 3,
      suppressedSoftPreferenceCount: 0,
      longInputDetected: false,
    },
    ...overrides,
  };
}

describe('semantic planner deterministic fallbacks', () => {
  it('infers concrete preference places into deterministic seed highlights', () => {
    const seed = buildDeterministicSemanticSeedPlan(makeRequest());

    expect(seed.destinationHighlights?.map((highlight) => highlight.name)).toEqual(
      expect.arrayContaining(['千光寺', '尾道本通り商店街'])
    );
    expect(seed.dayStructure.some((day) =>
      (day.anchorMoments ?? []).some((moment) => moment.includes('千光寺'))
    )).toBe(true);
  });

  it('keeps deterministic day fallback concrete when the day flow already contains places', () => {
    const request = makeRequest({ mustVisitPlaces: ['千光寺'] });
    const seed = buildDeterministicSemanticSeedPlan(request);

    const candidates = buildDeterministicDayCandidates(request, seed, 1, []);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((candidate) => candidate.name === '千光寺')).toBe(true);
    expect(candidates.every((candidate) => !candidate.name.includes('おすすめ'))).toBe(true);
    expect(candidates.every((candidate) => !candidate.name.includes('観光スポット'))).toBe(true);
  });

  it('avoids inventing generic filler spots when only broad area names are known', () => {
    const request = makeRequest({
      destinations: ['東京'],
      freeText: '',
      softPreferences: {
        themes: ['街歩き'],
        rankedRequests: [],
        suppressedCount: 0,
      },
      mustVisitPlaces: [],
    });
    const seed = buildDeterministicSemanticSeedPlan(request);

    const candidates = buildDeterministicDayCandidates(request, seed, 1, []);

    expect(candidates).toEqual([]);
  });
});

describe('truncateRepetitive', () => {
  it('returns normal text unchanged', () => {
    const text = '京都の嵐山を散策して竹林の小径を歩きます。';
    expect(truncateRepetitive(text, 300)).toBe(text);
  });

  it('returns short text unchanged even under maxLength', () => {
    expect(truncateRepetitive('hello', 100)).toBe('hello');
  });

  it('detects and truncates repeating phrases', () => {
    const phrase = '夕食後は祇園の夜の街並みを散策します。';
    const repeated = phrase.repeat(50);
    const result = truncateRepetitive(repeated, 1000);
    expect(result).toBe(phrase);
  });

  it('hard-truncates text exceeding maxLength when no repetition', () => {
    // Use a non-repetitive long string (sequential numbers)
    const text = Array.from({ length: 200 }, (_, i) => `項目${i}`).join('、');
    const result = truncateRepetitive(text, 100);
    expect(result.length).toBe(100);
  });

  it('handles text with repetition that is also too long', () => {
    const phrase = '夕食後は祇園の夜の街並みを散策します。';
    const repeated = phrase.repeat(1000);
    const result = truncateRepetitive(repeated, 300);
    // Should detect repetition and keep only one occurrence
    expect(result).toBe(phrase);
    expect(result.length).toBeLessThanOrEqual(300);
  });

  it('does not false-positive on short repeated substrings', () => {
    // "の" appears multiple times but is too short (< 10 chars) to trigger
    const text = '京都の嵐山の竹林の小径の美しさ';
    expect(truncateRepetitive(text, 300)).toBe(text);
  });
});

describe('sanitizeSemanticPlanFields', () => {
  const basePlan = {
    destination: '京都',
    description: '短い説明',
    dayStructure: [
      { day: 1, title: '1日目', mainArea: '嵐山', overnightLocation: '京都市内', summary: '概要' },
    ],
    candidates: [
      {
        name: '金閣寺',
        role: 'must_visit' as const,
        priority: 10,
        dayHint: 1,
        timeSlotHint: 'morning' as const,
        stayDurationMinutes: 60,
        searchQuery: '金閣寺',
      },
    ],
    tripIntentSummary: '京都を楽しむ旅',
  };

  it('leaves fields within limits unchanged', () => {
    const result = sanitizeSemanticPlanFields(basePlan);
    expect(result.tripIntentSummary).toBe('京都を楽しむ旅');
    expect(result.description).toBe('短い説明');
    expect(result.destination).toBe('京都');
  });

  it('truncates tripIntentSummary exceeding 300 chars', () => {
    const longSummary = Array.from({ length: 100 }, (_, i) => `項目${i}`).join('、');
    expect(longSummary.length).toBeGreaterThan(300);

    const result = sanitizeSemanticPlanFields({ ...basePlan, tripIntentSummary: longSummary });
    expect(result.tripIntentSummary!.length).toBeLessThanOrEqual(300);
  });

  it('truncates description exceeding 500 chars', () => {
    const longDesc = Array.from({ length: 200 }, (_, i) => `説明${i}`).join('。');
    expect(longDesc.length).toBeGreaterThan(500);

    const result = sanitizeSemanticPlanFields({ ...basePlan, description: longDesc });
    expect(result.description.length).toBeLessThanOrEqual(500);
  });

  it('handles undefined optional fields gracefully', () => {
    const result = sanitizeSemanticPlanFields({
      ...basePlan,
      tripIntentSummary: undefined,
      orderingPreferences: undefined,
      fallbackHints: undefined,
      destinationHighlights: undefined,
    });
    expect(result.tripIntentSummary).toBeUndefined();
    expect(result.orderingPreferences).toBeUndefined();
    expect(result.fallbackHints).toBeUndefined();
  });

  it('truncates candidate rationale exceeding 300 chars', () => {
    const longRationale = 'a'.repeat(400);
    const plan = {
      ...basePlan,
      candidates: [{ ...basePlan.candidates[0], rationale: longRationale }],
    };
    const result = sanitizeSemanticPlanFields(plan);
    expect(result.candidates![0].rationale!.length).toBeLessThanOrEqual(300);
  });

  it('truncates destinationHighlights rationale exceeding 300 chars', () => {
    const longRationale = 'b'.repeat(400);
    const plan = {
      ...basePlan,
      destinationHighlights: [
        { name: '金閣寺', areaHint: '北山', dayHint: 1, rationale: longRationale },
      ],
    };
    const result = sanitizeSemanticPlanFields(plan);
    expect(result.destinationHighlights![0].rationale.length).toBeLessThanOrEqual(300);
  });

  it('truncates orderingPreferences items exceeding 200 chars', () => {
    const longPref = 'c'.repeat(250);
    const plan = { ...basePlan, orderingPreferences: [longPref, '短い好み'] };
    const result = sanitizeSemanticPlanFields(plan);
    expect(result.orderingPreferences![0].length).toBeLessThanOrEqual(200);
    expect(result.orderingPreferences![1]).toBe('短い好み');
  });

  it('works with seed plans (no candidates field)', () => {
    const seedPlan = {
      destination: '京都',
      description: '短い説明',
      dayStructure: basePlan.dayStructure,
      tripIntentSummary: 'x'.repeat(400),
    };
    const result = sanitizeSemanticPlanFields(seedPlan);
    expect(result.tripIntentSummary!.length).toBeLessThanOrEqual(300);
    expect(result).not.toHaveProperty('candidates');
  });
});

describe('runSemanticSeedPlanner structured-output recovery', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock('ai');
    vi.doUnmock('@ai-sdk/google');
  });

  it('recovers when generateObject fails with malformed JSON but generateText returns a valid JSON object', async () => {
    const generateObject = vi.fn().mockRejectedValue(
      new SyntaxError('Unterminated string in JSON at position 17158')
    );
    const generateText = vi.fn().mockResolvedValue({
      text: [
        'Here is the repaired payload:',
        '```json',
        JSON.stringify({
          destination: 'パリ',
          description: '左岸とマレ地区をゆったり巡る3日間の骨格です。',
          dayStructure: [
            {
              day: 1,
              title: 'サン・ジェルマン散策',
              mainArea: 'サン・ジェルマン',
              overnightLocation: 'パリ市内',
              summary: '左岸の老舗カフェや庭園を巡る一日。',
            },
          ],
          tripIntentSummary: 'パリらしい街歩きとグルメを楽しむ3日間の旅。',
          orderingPreferences: ['午前は徒歩中心で回る。'],
          fallbackHints: ['空き時間はカフェで調整する。'],
          destinationHighlights: [
            {
              name: 'リュクサンブール公園',
              searchQuery: 'Jardin du Luxembourg',
              areaHint: 'サン・ジェルマン',
              dayHint: 1,
              rationale: '左岸らしい空気感を最初に感じやすい代表スポット。',
            },
          ],
        }),
        '```',
      ].join('\n'),
    });

    vi.doMock('ai', () => ({
      generateObject,
      generateText,
    }));
    vi.doMock('@ai-sdk/google', () => ({
      google: vi.fn(() => ({ provider: 'google-model' })),
    }));

    const { runSemanticSeedPlanner } = await import('./semantic-planner');

    const result = await runSemanticSeedPlanner({
      request: makeRequest({
        destinations: ['パリ'],
        durationDays: 1,
      }),
      context: [],
      modelName: 'gemini-2.5-flash',
      provider: 'gemini',
      temperature: 0.3,
    });

    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(result.destination).toBe('パリ');
    expect(result.dayStructure[0]?.mainArea).toBe('サン・ジェルマン');
    expect(result.destinationHighlights?.[0]?.name).toBe('リュクサンブール公園');
  });

  it('throws a PipelineStepError when recovery text still does not contain a complete JSON object', async () => {
    const generateObject = vi.fn().mockRejectedValue(
      new SyntaxError('Unterminated string in JSON at position 17158')
    );
    const generateText = vi.fn().mockResolvedValue({
      text: '{"destination":"パリ","description":"途中で切れたJSON"',
    });

    vi.doMock('ai', () => ({
      generateObject,
      generateText,
    }));
    vi.doMock('@ai-sdk/google', () => ({
      google: vi.fn(() => ({ provider: 'google-model' })),
    }));

    const { runSemanticSeedPlanner } = await import('./semantic-planner');
    const { PipelineStepError } = await import('../errors');

    await expect(runSemanticSeedPlanner({
      request: makeRequest({
        destinations: ['パリ'],
        durationDays: 1,
      }),
      context: [],
      modelName: 'gemini-2.5-flash',
      provider: 'gemini',
      temperature: 0.3,
    })).rejects.toBeInstanceOf(PipelineStepError);
  });
});
