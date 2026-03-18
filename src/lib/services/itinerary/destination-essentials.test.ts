import { describe, expect, it } from 'vitest';

import type { DayStructure, SemanticCandidate } from '@/types/itinerary-pipeline';
import {
  buildDestinationEssentialsPrompt,
  getDestinationEssentialCandidates,
  mergeDestinationEssentialCandidates,
} from './destination-essentials';

function makeCandidate(overrides: Partial<SemanticCandidate> = {}): SemanticCandidate {
  return {
    name: 'セーヌ川クルーズ',
    searchQuery: 'Seine River Cruise',
    role: 'recommended',
    priority: 7,
    dayHint: 1,
    timeSlotHint: 'evening',
    stayDurationMinutes: 90,
    ...overrides,
  };
}

describe('destination essentials', () => {
  it('returns Paris essentials with iconic landmarks', () => {
    const candidates = getDestinationEssentialCandidates({
      request: {
        destinations: ['Paris'],
        durationDays: 3,
      },
    });

    expect(candidates.map((candidate) => candidate.locationEn)).toEqual(
      expect.arrayContaining(['Eiffel Tower', 'Louvre Museum', 'Arc de Triomphe'])
    );
    expect(candidates.some((candidate) => candidate.role === 'must_visit')).toBe(true);
  });

  it('spreads essentials using day structure area matches when available', () => {
    const dayStructure: DayStructure[] = [
      {
        day: 1,
        title: 'ルーブルとセーヌ左岸',
        mainArea: '1区・ルーブル周辺',
        overnightLocation: 'Paris',
        summary: '王道の美術館を巡る日',
      },
      {
        day: 2,
        title: 'エッフェル塔と7区',
        mainArea: '7区・シャン・ド・マルス周辺',
        overnightLocation: 'Paris',
        summary: '王道ランドマークを楽しむ日',
      },
      {
        day: 3,
        title: '凱旋門とシャンゼリゼ',
        mainArea: '8区・シャルル・ド・ゴール広場周辺',
        overnightLocation: 'Paris',
        summary: 'パリの大通りを歩く日',
      },
    ];

    const candidates = getDestinationEssentialCandidates({
      request: {
        destinations: ['パリ'],
        durationDays: 3,
      },
      dayStructure,
    });

    expect(candidates.find((candidate) => candidate.locationEn === 'Louvre Museum')?.dayHint).toBe(1);
    expect(candidates.find((candidate) => candidate.locationEn === 'Eiffel Tower')?.dayHint).toBe(2);
    expect(candidates.find((candidate) => candidate.locationEn === 'Arc de Triomphe')?.dayHint).toBe(3);
  });

  it('merges missing essentials without duplicating already-selected iconic places', () => {
    const merged = mergeDestinationEssentialCandidates({
      request: {
        destinations: ['Paris'],
        durationDays: 2,
      },
      candidates: [makeCandidate(), makeCandidate({ name: 'エッフェル塔', searchQuery: 'Eiffel Tower' })],
      existingCandidates: [makeCandidate({ name: 'ルーブル美術館', searchQuery: 'Louvre Museum' })],
    });

    const mergedQueries = merged.map((candidate) => candidate.searchQuery);
    expect(mergedQueries.filter((query) => query === 'Eiffel Tower')).toHaveLength(1);
    expect(mergedQueries).not.toContain('Louvre Museum');
    expect(mergedQueries).toContain('Arc de Triomphe');
  });

  it('builds a prompt block only for supported destinations', () => {
    expect(
      buildDestinationEssentialsPrompt({
        destinations: ['Paris'],
        durationDays: 3,
      })
    ).toContain('エッフェル塔 / Eiffel Tower');

    expect(
      buildDestinationEssentialsPrompt({
        destinations: ['Unknown City'],
        durationDays: 3,
      })
    ).toBe('');
  });
});
