import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlanGenerationSession } from '@/types/plan-generation';

// vi.hoisted so mocks are available when vi.mock factories run
const { mockLogGeneration, mockAppendPassRun } = vi.hoisted(() => ({
  mockLogGeneration: vi.fn().mockResolvedValue(undefined),
  mockAppendPassRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/analytics/event-logger', () => ({
  EventLogger: class {
    logGeneration = mockLogGeneration;
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}));

vi.mock('./session-store', () => ({
  appendPassRun: (...args: unknown[]) => mockAppendPassRun(...args),
}));

import { PlanGenerationLogger } from './logger';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanGenerationLogger', () => {
  describe('logPassRun', () => {
    it('appends pass run record via session-store', () => {
      const logger = new PlanGenerationLogger('session-1');

      logger.logPassRun({
        passId: 'normalize',
        attempt: 1,
        outcome: 'completed',
        durationMs: 42,
        startedAt: '2026-03-28T00:00:00Z',
      });

      expect(mockAppendPassRun).toHaveBeenCalledWith('session-1', expect.objectContaining({
        passId: 'normalize',
        attempt: 1,
        outcome: 'completed',
        durationMs: 42,
      }));
    });

    it('does not throw on DB error (fire-and-forget)', () => {
      mockAppendPassRun.mockRejectedValueOnce(new Error('DB down'));
      const logger = new PlanGenerationLogger('session-1');

      // Should not throw
      expect(() => logger.logPassRun({
        passId: 'draft_generate',
        attempt: 1,
        outcome: 'completed',
        durationMs: 100,
        startedAt: '2026-03-28T00:00:00Z',
      })).not.toThrow();
    });
  });

  describe('logRunSummary', () => {
    it('logs generation event to EventLogger with v4 metadata', () => {
      const logger = new PlanGenerationLogger('session-1');

      logger.logRunSummary({
        sessionId: 'session-1',
        finalState: 'completed',
        totalDurationMs: 45_000,
        passCount: 7,
        repairIterations: 1,
        destination: 'Tokyo',
        durationDays: 3,
        warnings: ['minor issue'],
      });

      expect(mockLogGeneration).toHaveBeenCalledWith({
        eventType: 'plan_generated',
        destination: 'Tokyo',
        durationDays: 3,
        processingTimeMs: 45_000,
        metadata: expect.objectContaining({
          pipeline: 'v4',
          sessionId: 'session-1',
          finalState: 'completed',
          passCount: 7,
          repairIterations: 1,
          warningCount: 1,
        }),
      });
    });

    it('does not throw if EventLogger fails', () => {
      mockLogGeneration.mockRejectedValueOnce(new Error('log failed'));
      const logger = new PlanGenerationLogger('session-1');

      expect(() => logger.logRunSummary({
        sessionId: 'session-1',
        finalState: 'failed',
        totalDurationMs: 10_000,
        passCount: 3,
        repairIterations: 0,
        warnings: [],
      })).not.toThrow();
    });
  });

  describe('logCompletedSession', () => {
    it('extracts summary from session and logs', () => {
      const logger = new PlanGenerationLogger('session-1');
      const logSummarySpy = vi.spyOn(logger, 'logRunSummary');

      const session = {
        id: 'session-1',
        state: 'completed',
        createdAt: '2026-03-28T00:00:00Z',
        updatedAt: '2026-03-28T00:01:00Z',
        draftPlan: {
          destination: 'Kyoto',
          days: [{ dayNumber: 1, stops: [] }, { dayNumber: 2, stops: [] }],
        },
        repairHistory: [{ iteration: 1 }],
        passRuns: [
          { passId: 'normalize' },
          { passId: 'draft_generate' },
          { passId: 'rule_score' },
        ],
        warnings: ['w1'],
        verifiedEntities: [],
      } as unknown as PlanGenerationSession;

      logger.logCompletedSession(session, 60_000);

      expect(logSummarySpy).toHaveBeenCalledWith({
        sessionId: 'session-1',
        finalState: 'completed',
        totalDurationMs: 60_000,
        passCount: 3,
        repairIterations: 1,
        destination: 'Kyoto',
        durationDays: 2,
        warnings: ['w1'],
      });
    });
  });
});
