import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/limits/check', () => ({
  checkAndRecordUsage: vi.fn(),
}));

vi.mock('@/lib/services/itinerary/pipeline-helpers', () => ({
  resolveModelsForPipeline: vi.fn(() => ({
    semanticModel: { modelName: 'gemini-2.5-flash' },
    narrativeModel: { modelName: 'gemini-2.5-flash' },
    modelTier: 'flash',
    provider: 'gemini',
  })),
}));

vi.mock('@/lib/agent/run-checkpoint-log', () => ({
  logPreflightCheckpoint: vi.fn(),
}));

vi.mock('@/lib/utils/performance-timer', () => ({
  createPerformanceTimer: vi.fn(() => ({
    measure: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
    log: vi.fn(),
  })),
}));

import { checkAndRecordUsage } from '@/lib/limits/check';
import { POST } from './route';

const mockCheckAndRecordUsage = vi.mocked(checkAndRecordUsage);

describe('POST /api/itinerary/plan/preflight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a read-only usage check during preflight', async () => {
    mockCheckAndRecordUsage.mockResolvedValue({
      allowed: true,
      userType: 'free',
      userId: 'user_1',
      currentCount: 0,
      limit: 3,
      remaining: 3,
      resetAt: null,
    });

    const response = await POST(new Request('http://localhost/api/itinerary/plan/preflight', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(mockCheckAndRecordUsage).toHaveBeenCalledWith('plan_generation', undefined, {
      skipConsume: true,
    });
  });

  it('fails open in development when the read-only preflight check times out', async () => {
    mockCheckAndRecordUsage.mockRejectedValue(new Error('plan preflight usage check timed out after 1500ms'));

    const response = await POST(new Request('http://localhost/api/itinerary/plan/preflight', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      allowed: true,
      degraded: true,
      userType: 'free',
    });
  });
});
