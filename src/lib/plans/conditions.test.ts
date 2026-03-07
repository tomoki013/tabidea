import { describe, expect, it } from 'vitest';
import { buildConditionsSnapshot, conditionsSnapshotToUserInput } from './conditions';
import type { UserInput } from '@/types/user-input';

const baseInput: UserInput = {
  destinations: ['京都'],
  region: 'domestic',
  dates: '3泊4日',
  companions: 'couple',
  theme: ['gourmet', 'historyCulture'],
  budget: 'standard',
  pace: 'balanced',
  freeText: '秘密の情報です',
  travelVibe: '落ち着いた雰囲気',
  mustVisitPlaces: ['金閣寺'],
  fixedSchedule: [{ type: 'flight', name: 'NH123', date: '2026-04-01' }],
};

describe('buildConditionsSnapshot', () => {
  it('excludes freeText and fixedSchedule', () => {
    const snapshot = buildConditionsSnapshot(baseInput, 4);
    expect(snapshot).not.toHaveProperty('freeText');
    expect(snapshot).not.toHaveProperty('fixedSchedule');
  });

  it('includes expected fields', () => {
    const snapshot = buildConditionsSnapshot(baseInput, 4);
    expect(snapshot.destinations).toEqual(['京都']);
    expect(snapshot.region).toBe('domestic');
    expect(snapshot.companions).toBe('couple');
    expect(snapshot.theme).toEqual(['gourmet', 'historyCulture']);
    expect(snapshot.budget).toBe('standard');
    expect(snapshot.pace).toBe('balanced');
    expect(snapshot.travelVibe).toBe('落ち着いた雰囲気');
    expect(snapshot.mustVisitPlaces).toEqual(['金閣寺']);
    expect(snapshot.durationDays).toBe(4);
  });

  it('handles null durationDays', () => {
    const snapshot = buildConditionsSnapshot(baseInput);
    expect(snapshot.durationDays).toBeNull();
  });
});

describe('conditionsSnapshotToUserInput', () => {
  it('maps snapshot fields to UserInput partial', () => {
    const snapshot = buildConditionsSnapshot(baseInput, 4);
    const partial = conditionsSnapshotToUserInput(snapshot);
    expect(partial.destinations).toEqual(['京都']);
    expect(partial.region).toBe('domestic');
    expect(partial.companions).toBe('couple');
    expect(partial.theme).toEqual(['gourmet', 'historyCulture']);
    expect(partial.travelVibe).toBe('落ち着いた雰囲気');
  });

  it('does not include durationDays or private fields', () => {
    const snapshot = buildConditionsSnapshot(baseInput, 4);
    const partial = conditionsSnapshotToUserInput(snapshot);
    expect(partial).not.toHaveProperty('durationDays');
    expect(partial).not.toHaveProperty('freeText');
    expect(partial).not.toHaveProperty('fixedSchedule');
  });
});
