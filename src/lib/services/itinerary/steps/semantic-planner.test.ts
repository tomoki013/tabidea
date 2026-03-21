import { describe, expect, it } from 'vitest';

import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import {
  buildDeterministicDayCandidates,
  buildDeterministicSemanticSeedPlan,
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
