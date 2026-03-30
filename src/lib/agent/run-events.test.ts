import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createStoredRunEvent, formatRunEventSse } from './run-events';

describe('run-events', () => {
  it('creates transient stored events with explicit sequence numbers', () => {
    const event = createStoredRunEvent(
      'run_1',
      7,
      'run.progress',
      { phase: 'pass_started' },
      '2026-03-29T09:00:00.000Z',
    );

    expect(event).toEqual({
      eventId: -7,
      runId: 'run_1',
      seq: 7,
      eventName: 'run.progress',
      payload: { phase: 'pass_started' },
      createdAt: '2026-03-29T09:00:00.000Z',
    });
  });

  it('formats SSE payloads from transient events', () => {
    const payload = formatRunEventSse(createStoredRunEvent(
      'run_2',
      3,
      'run.failed',
      { error: 'runtime_budget_exhausted' },
      '2026-03-29T09:00:00.000Z',
    ));

    expect(payload).toContain('id: 3');
    expect(payload).toContain('event: run.failed');
    expect(payload).toContain('"error":"runtime_budget_exhausted"');
  });
});
