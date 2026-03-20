import { describe, it, expect } from 'vitest';
import { deduplicateCandidates } from './dedup-candidates';
import type { SemanticCandidate } from '@/types/itinerary-pipeline';

function makeCandidate(overrides: Partial<SemanticCandidate> & { name: string }): SemanticCandidate {
  return {
    role: 'attraction',
    priority: 5,
    dayHint: 1,
    timeSlotHint: 'flexible',
    stayDurationMinutes: 60,
    searchQuery: overrides.name,
    semanticId: crypto.randomUUID(),
    ...overrides,
  };
}

describe('deduplicateCandidates', () => {
  it('should remove exact name duplicates', () => {
    const candidates = [
      makeCandidate({ name: '東京タワー', dayHint: 1 }),
      makeCandidate({ name: '東京タワー', dayHint: 2 }),
      makeCandidate({ name: '浅草寺', dayHint: 1 }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('東京タワー');
    expect(result[1].name).toBe('浅草寺');
  });

  it('should normalize whitespace and punctuation for dedup', () => {
    const candidates = [
      makeCandidate({ name: 'Tokyo Tower', searchQuery: 'Tokyo Tower' }),
      makeCandidate({ name: 'Tokyo  Tower', searchQuery: 'Tokyo  Tower' }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
  });

  it('should keep first occurrence (preserve order)', () => {
    const candidates = [
      makeCandidate({ name: '清水寺', priority: 10 }),
      makeCandidate({ name: '清水寺', priority: 5 }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(10);
  });

  it('should handle empty array', () => {
    expect(deduplicateCandidates([])).toEqual([]);
  });

  it('should handle no duplicates', () => {
    const candidates = [
      makeCandidate({ name: '金閣寺' }),
      makeCandidate({ name: '銀閣寺' }),
      makeCandidate({ name: '伏見稲荷' }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(3);
  });

  it('should use searchQuery for dedup when available', () => {
    const candidates = [
      makeCandidate({ name: 'Kinkaku-ji Temple', searchQuery: 'Kinkaku-ji' }),
      makeCandidate({ name: 'Golden Pavilion', searchQuery: 'Kinkaku-ji' }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
  });
});
