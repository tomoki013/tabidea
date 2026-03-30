import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  assertTransition,
  getNextPassForState,
  getStateAfterPassCompleted,
  determineResumeState,
} from './state-machine';
import { InvalidStateTransitionError } from './errors';
import { VALID_TRANSITIONS } from '@/types/plan-generation';
import type {
  SessionState,
  PassId,
  PlanGenerationSession,
  EvaluationReport,
  RepairRecord,
} from '@/types/plan-generation';

function createMockSession(overrides: Partial<PlanGenerationSession> = {}): PlanGenerationSession {
  return {
    id: 'test-session',
    state: 'draft_scored',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    repairHistory: [],
    verifiedEntities: [],
    passRuns: [],
    warnings: [],
    ...overrides,
  };
}

function createReport(grade: 'pass' | 'marginal' | 'fail'): EvaluationReport {
  return {
    overallScore: grade === 'pass' ? 80 : grade === 'marginal' ? 60 : 30,
    categoryScores: [],
    violations: [],
    passGrade: grade,
    repairTargets: [],
  };
}

function createRepairRecord(overrides: Partial<RepairRecord> = {}): RepairRecord {
  return {
    iteration: 1,
    unit: { type: 'day', day: 1 },
    beforeScore: 40,
    afterScore: 50,
    durationMs: 5000,
    improved: true,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// validateTransition
// ============================================

describe('validateTransition', () => {
  it('allows created → normalized', () => {
    expect(validateTransition('created', 'normalized')).toBe(true);
  });

  it('allows created → failed', () => {
    expect(validateTransition('created', 'failed')).toBe(true);
  });

  it('allows created → cancelled', () => {
    expect(validateTransition('created', 'cancelled')).toBe(true);
  });

  it('allows normalized → draft_generated', () => {
    expect(validateTransition('normalized', 'draft_generated')).toBe(true);
  });

  it('allows draft_generated → draft_formatted', () => {
    expect(validateTransition('draft_generated', 'draft_formatted')).toBe(true);
  });

  it('allows draft_formatted → draft_scored', () => {
    expect(validateTransition('draft_formatted', 'draft_scored')).toBe(true);
  });

  it('allows draft_scored → draft_repaired_partial', () => {
    expect(validateTransition('draft_scored', 'draft_repaired_partial')).toBe(true);
  });

  it('allows draft_scored → timeline_ready (skip repair)', () => {
    expect(validateTransition('draft_scored', 'timeline_ready')).toBe(true);
  });

  it('allows draft_scored → verification_partial', () => {
    expect(validateTransition('draft_scored', 'verification_partial')).toBe(true);
  });

  it('allows draft_repaired_partial → draft_scored (re-score after repair)', () => {
    expect(validateTransition('draft_repaired_partial', 'draft_scored')).toBe(true);
  });

  it('allows timeline_ready → narrative_partial', () => {
    expect(validateTransition('timeline_ready', 'narrative_partial')).toBe(true);
  });

  it('allows timeline_ready → completed (skip narrative)', () => {
    expect(validateTransition('timeline_ready', 'completed')).toBe(true);
  });

  it('allows narrative_partial → completed', () => {
    expect(validateTransition('narrative_partial', 'completed')).toBe(true);
  });

  it('allows failed → created (retry from scratch)', () => {
    expect(validateTransition('failed', 'created')).toBe(true);
  });

  // Invalid transitions
  it('rejects created → completed (skip all steps)', () => {
    expect(validateTransition('created', 'completed')).toBe(false);
  });

  it('rejects completed → anything', () => {
    expect(validateTransition('completed', 'created')).toBe(false);
    expect(validateTransition('completed', 'normalized')).toBe(false);
  });

  it('rejects cancelled → anything', () => {
    expect(validateTransition('cancelled', 'created')).toBe(false);
    expect(validateTransition('cancelled', 'failed')).toBe(false);
  });

  it('rejects normalized → completed (skip all)', () => {
    expect(validateTransition('normalized', 'completed')).toBe(false);
  });

  it('rejects backward transitions (except repair loop)', () => {
    expect(validateTransition('draft_generated', 'normalized')).toBe(false);
    expect(validateTransition('draft_generated', 'created')).toBe(false);
    expect(validateTransition('timeline_ready', 'draft_scored')).toBe(false);
  });

  // Every state can reach failed (except terminal states)
  it('every non-terminal state can transition to failed', () => {
    const nonTerminal: SessionState[] = [
      'created', 'normalized', 'draft_generated', 'draft_formatted', 'draft_scored',
      'draft_repaired_partial', 'verification_partial', 'timeline_ready',
      'narrative_partial',
    ];
    for (const state of nonTerminal) {
      expect(validateTransition(state, 'failed')).toBe(true);
    }
  });

  // Every non-terminal state can be cancelled
  it('every non-terminal state can transition to cancelled', () => {
    const nonTerminal: SessionState[] = [
      'created', 'normalized', 'draft_generated', 'draft_formatted', 'draft_scored',
      'draft_repaired_partial', 'verification_partial', 'timeline_ready',
      'narrative_partial',
    ];
    for (const state of nonTerminal) {
      expect(validateTransition(state, 'cancelled')).toBe(true);
    }
  });

  // Exhaustive: all valid transitions from VALID_TRANSITIONS map
  it('accepts all transitions defined in VALID_TRANSITIONS', () => {
    for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of targets) {
        expect(validateTransition(from as SessionState, to)).toBe(true);
      }
    }
  });
});

// ============================================
// assertTransition
// ============================================

describe('assertTransition', () => {
  it('does not throw for valid transition', () => {
    expect(() => assertTransition('created', 'normalized')).not.toThrow();
  });

  it('throws InvalidStateTransitionError for invalid transition', () => {
    expect(() => assertTransition('created', 'completed')).toThrow(
      InvalidStateTransitionError,
    );
  });

  it('error contains from and to states', () => {
    try {
      assertTransition('completed', 'created');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidStateTransitionError);
      const err = e as InvalidStateTransitionError;
      expect(err.from).toBe('completed');
      expect(err.to).toBe('created');
      expect(err.message).toContain('completed');
      expect(err.message).toContain('created');
    }
  });
});

// ============================================
// getNextPassForState
// ============================================

describe('getNextPassForState', () => {
  describe('without session (static routing)', () => {
    const expected: [SessionState, PassId | null][] = [
      ['created', 'normalize'],
      ['normalized', 'draft_generate'],
      ['draft_generated', 'draft_format'],
      ['draft_formatted', 'rule_score'],
      ['draft_scored', 'local_repair'], // no session → static fallback
      ['draft_repaired_partial', 'rule_score'],
      ['verification_partial', 'timeline_construct'],
      ['timeline_ready', 'narrative_polish'],
      ['narrative_partial', null],
      ['completed', null],
      ['failed', null],
      ['cancelled', null],
    ];

    for (const [state, expectedPass] of expected) {
      it(`${state} → ${expectedPass ?? 'null'}`, () => {
        expect(getNextPassForState(state)).toBe(expectedPass);
      });
    }
  });

  describe('decideAfterScoring (session-aware routing)', () => {
    it('pass grade → selective_verify', () => {
      const session = createMockSession({
        evaluationReport: createReport('pass'),
      });
      expect(getNextPassForState('draft_scored', session)).toBe('selective_verify');
    });

    it('fail grade with no repairs → local_repair', () => {
      const session = createMockSession({
        evaluationReport: createReport('fail'),
        repairHistory: [],
      });
      expect(getNextPassForState('draft_scored', session)).toBe('local_repair');
    });

    it('fail grade at max iterations → selective_verify', () => {
      const session = createMockSession({
        evaluationReport: createReport('fail'),
        repairHistory: [
          createRepairRecord({ iteration: 1 }),
          createRepairRecord({ iteration: 2 }),
          createRepairRecord({ iteration: 3 }),
        ],
      });
      expect(getNextPassForState('draft_scored', session)).toBe('selective_verify');
    });

    it('marginal grade with improving repairs → local_repair', () => {
      const session = createMockSession({
        evaluationReport: createReport('marginal'),
        repairHistory: [
          createRepairRecord({ iteration: 1, beforeScore: 40, afterScore: 55, improved: true }),
        ],
      });
      expect(getNextPassForState('draft_scored', session)).toBe('local_repair');
    });

    it('marginal grade with stagnant repairs → selective_verify', () => {
      const session = createMockSession({
        evaluationReport: createReport('marginal'),
        repairHistory: [
          createRepairRecord({ iteration: 1, beforeScore: 55, afterScore: 56, improved: true }),
        ],
      });
      // improvement (1) < MIN_REPAIR_IMPROVEMENT (3) → stop repairing
      expect(getNextPassForState('draft_scored', session)).toBe('selective_verify');
    });

    it('marginal grade with no improvement → selective_verify', () => {
      const session = createMockSession({
        evaluationReport: createReport('marginal'),
        repairHistory: [
          createRepairRecord({ iteration: 1, beforeScore: 55, afterScore: 54, improved: false }),
        ],
      });
      expect(getNextPassForState('draft_scored', session)).toBe('selective_verify');
    });

    it('no evaluationReport → local_repair (safe fallback)', () => {
      const session = createMockSession({
        evaluationReport: undefined,
      });
      expect(getNextPassForState('draft_scored', session)).toBe('local_repair');
    });
  });
});

// ============================================
// getStateAfterPassCompleted
// ============================================

describe('determineResumeState', () => {
  it('returns created when session has no data', () => {
    const session = createMockSession({ state: 'failed' });
    expect(determineResumeState(session)).toBe('created');
  });

  it('returns normalized when only normalizedInput exists', () => {
    const session = createMockSession({
      state: 'failed',
      normalizedInput: { destinations: ['Tokyo'], durationDays: 3 } as PlanGenerationSession['normalizedInput'],
    });
    expect(determineResumeState(session)).toBe('normalized');
  });

  it('returns draft_generated when draftPlan exists', () => {
    const session = createMockSession({
      state: 'failed',
      normalizedInput: {} as PlanGenerationSession['normalizedInput'],
      plannerDraft: { days: [] } as unknown as PlanGenerationSession['plannerDraft'],
    });
    expect(determineResumeState(session)).toBe('draft_generated');
  });

  it('returns draft_formatted when draftPlan exists', () => {
    const session = createMockSession({
      state: 'failed',
      normalizedInput: {} as PlanGenerationSession['normalizedInput'],
      plannerDraft: { days: [] } as unknown as PlanGenerationSession['plannerDraft'],
      draftPlan: { destination: 'Tokyo', days: [] } as unknown as PlanGenerationSession['draftPlan'],
    });
    expect(determineResumeState(session)).toBe('draft_formatted');
  });

  it('returns draft_scored when evaluationReport exists', () => {
    const session = createMockSession({
      state: 'failed',
      normalizedInput: {} as PlanGenerationSession['normalizedInput'],
      plannerDraft: { days: [] } as unknown as PlanGenerationSession['plannerDraft'],
      draftPlan: { destination: 'Tokyo', days: [] } as unknown as PlanGenerationSession['draftPlan'],
      evaluationReport: { overallScore: 65, passGrade: 'marginal' } as unknown as EvaluationReport,
    });
    expect(determineResumeState(session)).toBe('draft_scored');
  });

  it('returns timeline_ready when timelineState exists', () => {
    const session = createMockSession({
      state: 'failed',
      normalizedInput: {} as PlanGenerationSession['normalizedInput'],
      plannerDraft: { days: [] } as unknown as PlanGenerationSession['plannerDraft'],
      draftPlan: { destination: 'Tokyo', days: [] } as unknown as PlanGenerationSession['draftPlan'],
      evaluationReport: { overallScore: 75, passGrade: 'pass' } as unknown as EvaluationReport,
      verifiedEntities: [{ name: 'Tokyo Tower' }] as unknown as PlanGenerationSession['verifiedEntities'],
      timelineState: { days: [] } as unknown as PlanGenerationSession['timelineState'],
    });
    expect(determineResumeState(session)).toBe('timeline_ready');
  });

  it('returns verification_partial when verifiedEntities exist but no timelineState', () => {
    const session = createMockSession({
      state: 'failed',
      normalizedInput: {} as PlanGenerationSession['normalizedInput'],
      plannerDraft: { days: [] } as unknown as PlanGenerationSession['plannerDraft'],
      draftPlan: { destination: 'Tokyo', days: [] } as unknown as PlanGenerationSession['draftPlan'],
      evaluationReport: { overallScore: 75, passGrade: 'pass' } as unknown as EvaluationReport,
      verifiedEntities: [{ name: 'Tokyo Tower' }] as unknown as PlanGenerationSession['verifiedEntities'],
    });
    expect(determineResumeState(session)).toBe('verification_partial');
  });
});

describe('failed → resume transitions are valid', () => {
  const resumeTargets: SessionState[] = ['created', 'normalized', 'draft_generated', 'draft_formatted', 'draft_scored', 'verification_partial', 'timeline_ready'];
  for (const target of resumeTargets) {
    it(`failed → ${target} is allowed`, () => {
      expect(validateTransition('failed', target)).toBe(true);
    });
  }
});

describe('getStateAfterPassCompleted', () => {
  const expected: [PassId, SessionState][] = [
    ['normalize', 'normalized'],
    ['draft_generate', 'draft_generated'],
    ['draft_format', 'draft_formatted'],
    ['rule_score', 'draft_scored'],
    ['local_repair', 'draft_repaired_partial'],
    ['selective_verify', 'verification_partial'],
    ['timeline_construct', 'timeline_ready'],
    ['narrative_polish', 'completed'],
  ];

  for (const [passId, expectedState] of expected) {
    it(`${passId} → ${expectedState}`, () => {
      expect(getStateAfterPassCompleted(passId)).toBe(expectedState);
    });
  }
});
