import { describe, expect, it } from 'vitest';

import type { DestinationHighlight, SemanticCandidate } from '@/types/itinerary-pipeline';
import {
  assignHighlightDaysFromAreas,
  buildDestinationHighlightPromptSections,
  mergeDestinationHighlightCandidates,
  sanitizeDestinationHighlights,
} from './destination-highlights';

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

const PARIS_HIGHLIGHTS: DestinationHighlight[] = [
  {
    name: 'エッフェル塔',
    searchQuery: 'Eiffel Tower',
    areaHint: '7区・シャン・ド・マルス周辺',
    dayHint: 2,
    rationale: 'パリの象徴として外しにくい。',
  },
  {
    name: 'ルーブル美術館',
    searchQuery: 'Louvre Museum',
    areaHint: '1区・ルーブル周辺',
    dayHint: 1,
    rationale: '代表的な美術館。',
  },
  {
    name: '凱旋門',
    searchQuery: 'Arc de Triomphe',
    areaHint: '8区・シャルル・ド・ゴール広場周辺',
    dayHint: 3,
    rationale: 'シャンゼリゼ散策の軸になる。',
  },
];

describe('destination highlights', () => {
  it('sanitizes generic or duplicated highlights', () => {
    const sanitized = sanitizeDestinationHighlights(
      [
        ...PARIS_HIGHLIGHTS,
        { ...PARIS_HIGHLIGHTS[0] },
        {
          name: 'おすすめカフェ',
          areaHint: 'サンジェルマン',
          dayHint: 2,
          rationale: '抽象名',
        },
      ],
      3
    );

    expect(sanitized).toHaveLength(3);
    expect(sanitized.map((highlight) => highlight.searchQuery)).toEqual(
      expect.arrayContaining(['Eiffel Tower', 'Louvre Museum', 'Arc de Triomphe'])
    );
  });

  it('merges missing highlights without relying on hardcoded destination lists', () => {
    const merged = mergeDestinationHighlightCandidates({
      request: { durationDays: 3 },
      destinationHighlights: PARIS_HIGHLIGHTS,
      candidates: [makeCandidate({ name: 'カフェ・ド・フロール', searchQuery: 'Café de Flore' })],
      existingCandidates: [makeCandidate({ name: 'ルーブル美術館', searchQuery: 'Louvre Museum' })],
      day: 2,
    });

    expect(merged.map((candidate) => candidate.searchQuery)).toEqual(
      expect.arrayContaining(['Eiffel Tower', 'Café de Flore'])
    );
    expect(merged.map((candidate) => candidate.searchQuery)).not.toContain('Louvre Museum');
  });

  it('builds prompt sections for all and remaining highlights per day', () => {
    const sections = buildDestinationHighlightPromptSections({
      destinationHighlights: PARIS_HIGHLIGHTS,
      durationDays: 3,
      day: 2,
      existingCandidates: [makeCandidate({ name: 'ルーブル美術館', searchQuery: 'Louvre Museum', dayHint: 1 })],
    });

    expect(sections.allHighlightsSection).toContain('エッフェル塔');
    expect(sections.remainingHighlightsSection).toContain('エッフェル塔');
  });

  it('reassigns highlight days from day structure area matches', () => {
    const reassigned = assignHighlightDaysFromAreas(PARIS_HIGHLIGHTS, [
      {
        day: 1,
        title: 'ルーブル周辺を歩く',
        mainArea: '1区・ルーブル周辺',
        overnightLocation: 'Paris',
        summary: '美術館中心の日',
      },
      {
        day: 2,
        title: '7区とエッフェル塔',
        mainArea: '7区・シャン・ド・マルス周辺',
        overnightLocation: 'Paris',
        summary: 'パリの象徴を回る日',
      },
      {
        day: 3,
        title: 'シャンゼリゼ散策',
        mainArea: '8区・シャルル・ド・ゴール広場周辺',
        overnightLocation: 'Paris',
        summary: '大通りと凱旋門へ',
      },
    ]);

    expect(reassigned.find((highlight) => highlight.searchQuery === 'Louvre Museum')?.dayHint).toBe(1);
    expect(reassigned.find((highlight) => highlight.searchQuery === 'Eiffel Tower')?.dayHint).toBe(2);
    expect(reassigned.find((highlight) => highlight.searchQuery === 'Arc de Triomphe')?.dayHint).toBe(3);
  });
});
