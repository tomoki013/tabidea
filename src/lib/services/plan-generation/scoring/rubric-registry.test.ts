import { describe, it, expect } from 'vitest';
import { evaluateDraft } from './rubric-registry';
import type { DraftPlan, DraftDay, DraftStop } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import type { UserInput } from '@/types/user-input';

// ============================================
// Test Fixtures
// ============================================

function createMinimalInput(): UserInput {
  return {
    destinations: ['東京'],
    region: 'domestic',
    dates: '3日',
    companions: 'solo',
    theme: ['culture'],
    budget: 'standard',
    pace: 'balanced',
    freeText: '',
  };
}

function createMinimalNormalized(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    destinations: ['東京'],
    durationDays: 3,
    companions: 'solo',
    themes: ['culture'],
    budgetLevel: 'standard',
    pace: 'balanced',
    freeText: '',
    mustVisitPlaces: [],
    fixedSchedule: [],
    preferredTransport: [],
    isDestinationDecided: true,
    region: 'domestic',
    outputLanguage: 'ja',
    originalInput: createMinimalInput(),
    hardConstraints: {
      destinations: ['東京'],
      dateConstraints: [],
      mustVisitPlaces: [],
      fixedTransports: [],
      fixedHotels: [],
      freeTextDirectives: [],
      summaryLines: [],
    },
    softPreferences: {
      themes: ['culture'],
      rankedRequests: [],
      suppressedCount: 0,
    },
    compaction: {
      applied: false,
      hardConstraintCount: 0,
      softPreferenceCount: 0,
      suppressedSoftPreferenceCount: 0,
      longInputDetected: false,
    },
    ...overrides,
  };
}

function createStop(overrides: Partial<DraftStop> = {}): DraftStop {
  return {
    draftId: `stop-${Math.random().toString(36).slice(2)}`,
    name: '浅草寺',
    searchQuery: 'Senso-ji Temple Asakusa Tokyo',
    role: 'recommended',
    timeSlotHint: 'morning',
    stayDurationMinutes: 60,
    areaHint: '浅草エリア',
    rationale: '朝一番の参拝は人が少なく落ち着いて回れる',
    aiConfidence: 'high',
    categoryHint: 'temple',
    ...overrides,
  };
}

function createDay(day: number, stops: DraftStop[], overrides: Partial<DraftDay> = {}): DraftDay {
  return {
    day,
    title: `Day ${day}: 東京探索`,
    mainArea: '浅草エリア',
    overnightLocation: '東京駅周辺ホテル',
    summary: `Day ${day} の概要`,
    stops,
    ...overrides,
  };
}

function createGoodDraft(): DraftPlan {
  return {
    destination: '東京',
    description: '3日間の東京文化体験旅',
    tripIntentSummary: '東京の文化と食を巡る3日間',
    themes: ['culture', 'food'],
    orderingPreferences: ['寺社は午前中に'],
    days: [
      createDay(1, [
        createStop({ name: '浅草寺', timeSlotHint: 'afternoon', role: 'recommended', categoryHint: 'temple' }),
        createStop({ name: '仲見世通り', timeSlotHint: 'afternoon', areaHint: '浅草エリア', categoryHint: 'shopping' }),
        createStop({ name: '天ぷら大黒家', timeSlotHint: 'evening', role: 'meal', categoryHint: 'restaurant' }),
      ]),
      createDay(2, [
        createStop({ name: '明治神宮', timeSlotHint: 'morning', categoryHint: 'shrine' }),
        createStop({ name: '竹下通り', timeSlotHint: 'midday', areaHint: '原宿エリア', categoryHint: 'shopping' }),
        createStop({ name: '渋谷スクランブル交差点', timeSlotHint: 'afternoon', areaHint: '渋谷エリア', categoryHint: 'landmark' }),
        createStop({ name: '一蘭 渋谷店', timeSlotHint: 'evening', role: 'meal', categoryHint: 'restaurant' }),
      ]),
      createDay(3, [
        createStop({ name: '築地場外市場', timeSlotHint: 'morning', categoryHint: 'market' }),
        createStop({ name: '寿司大', timeSlotHint: 'morning', role: 'meal', categoryHint: 'restaurant' }),
        createStop({ name: '東京駅', timeSlotHint: 'midday', role: 'accommodation', categoryHint: 'station' }),
      ]),
    ],
  };
}

// ============================================
// Tests
// ============================================

describe('evaluateDraft', () => {
  it('scores a good draft above passing threshold', () => {
    const draft = createGoodDraft();
    const normalized = createMinimalNormalized();
    const report = evaluateDraft(draft, normalized);

    expect(report.overallScore).toBeGreaterThanOrEqual(50);
    expect(report.categoryScores).toHaveLength(9);
    expect(report.passGrade).not.toBe('fail');
  });

  it('returns all 9 category scores', () => {
    const draft = createGoodDraft();
    const normalized = createMinimalNormalized();
    const report = evaluateDraft(draft, normalized);

    const categories = report.categoryScores.map(cs => cs.category);
    expect(categories).toContain('constraint_fit');
    expect(categories).toContain('preference_fit');
    expect(categories).toContain('destination_authenticity');
    expect(categories).toContain('day_flow_quality');
    expect(categories).toContain('temporal_realism');
    expect(categories).toContain('spatial_coherence');
    expect(categories).toContain('variety');
    expect(categories).toContain('editability');
    expect(categories).toContain('verification_risk');
  });

  it('flags missing must-visit as error', () => {
    const draft = createGoodDraft();
    const normalized = createMinimalNormalized({
      mustVisitPlaces: ['スカイツリー'],
      hardConstraints: {
        destinations: ['東京'],
        dateConstraints: [],
        mustVisitPlaces: ['スカイツリー'],
        fixedTransports: [],
        fixedHotels: [],
        freeTextDirectives: [],
        summaryLines: [],
      },
    });

    const report = evaluateDraft(draft, normalized);
    const constraintScore = report.categoryScores.find(cs => cs.category === 'constraint_fit');

    expect(constraintScore!.violations.some(v =>
      v.severity === 'error' && v.message.includes('スカイツリー'),
    )).toBe(true);
  });

  it('flags generic stop names', () => {
    const draft = createGoodDraft();
    draft.days[0].stops[0] = createStop({ name: '東京 観光', aiConfidence: 'low' });

    const normalized = createMinimalNormalized();
    const report = evaluateDraft(draft, normalized);

    const authScore = report.categoryScores.find(cs => cs.category === 'destination_authenticity');
    expect(authScore!.violations.some(v =>
      v.severity === 'error' && v.message.includes('Generic'),
    )).toBe(true);
  });

  it('flags duplicate stops', () => {
    const draft = createGoodDraft();
    // Add duplicate
    draft.days[1].stops.push(
      createStop({ name: '浅草寺', draftId: 'duplicate-1' }),
    );

    const normalized = createMinimalNormalized();
    const report = evaluateDraft(draft, normalized);

    const varietyScore = report.categoryScores.find(cs => cs.category === 'variety');
    expect(varietyScore!.violations.some(v =>
      v.severity === 'error' && v.message.includes('重複'),
    )).toBe(true);
    expect(varietyScore!.violations.every(v => v.scope.type === 'day')).toBe(true);
  });

  it('flags day count mismatch', () => {
    const draft = createGoodDraft();
    // Remove day 3
    draft.days = draft.days.slice(0, 2);

    const normalized = createMinimalNormalized({ durationDays: 3 });
    const report = evaluateDraft(draft, normalized);

    const constraintScore = report.categoryScores.find(cs => cs.category === 'constraint_fit');
    expect(constraintScore!.violations.some(v =>
      v.message.includes('日数が不一致'),
    )).toBe(true);
  });

  it('generates repair targets for error violations', () => {
    const draft = createGoodDraft();
    draft.days[0].stops[0] = createStop({ name: '東京 観光' }); // generic

    const normalized = createMinimalNormalized({
      mustVisitPlaces: ['スカイツリー'],
      hardConstraints: {
        destinations: ['東京'],
        dateConstraints: [],
        mustVisitPlaces: ['スカイツリー'],
        fixedTransports: [],
        fixedHotels: [],
        freeTextDirectives: [],
        summaryLines: [],
      },
    });

    const report = evaluateDraft(draft, normalized);
    expect(report.repairTargets.length).toBeGreaterThan(0);
    expect(report.repairTargets[0].priority).toBe(1);
  });

  it('creates day-scoped repair targets for duplicated spots', () => {
    const draft = createGoodDraft();
    draft.days[1].stops.push(createStop({ name: '浅草寺', draftId: 'duplicate-1' }));

    const report = evaluateDraft(draft, createMinimalNormalized());
    expect(report.repairTargets.some((target) => target.scope.type === 'day' && target.scope.day === 1)).toBe(true);
    expect(report.repairTargets.some((target) => target.scope.type === 'day' && target.scope.day === 2)).toBe(true);
  });

  it('returns pass grade for high-quality draft', () => {
    const draft = createGoodDraft();
    const normalized = createMinimalNormalized();
    const report = evaluateDraft(draft, normalized);

    // A good draft with no constraint violations should score well
    expect(report.passGrade).not.toBe('fail');
  });
});
