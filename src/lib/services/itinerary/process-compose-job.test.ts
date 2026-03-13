import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockStore, runComposePipeline } = vi.hoisted(() => ({
  mockStore: {
    getJobInput: vi.fn(),
    markRunning: vi.fn(),
    appendProgress: vi.fn(),
    markCompleted: vi.fn(),
    markFailed: vi.fn(),
  },
  runComposePipeline: vi.fn(),
}));

vi.mock('@/lib/services/itinerary/compose-job-store', () => ({
  ComposeJobStore: vi.fn(function ComposeJobStoreMock() {
    return mockStore;
  }),
}));

vi.mock('@/lib/services/itinerary/pipeline-orchestrator', () => ({
  runComposePipeline,
}));

import { processComposeJob } from './process-compose-job';

describe('processComposeJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getJobInput.mockResolvedValue({
      input: {
        destinations: ['東京'],
        region: 'domestic',
        dates: '1日間',
        companions: '友達',
        theme: ['グルメ'],
        budget: 'standard',
        pace: 'balanced',
        freeText: '',
      },
      options: undefined,
    });
  });

  it('retries timeout failures and eventually marks completed', async () => {
    runComposePipeline
      .mockResolvedValueOnce({
        success: false,
        warnings: [],
        failedStep: 'semantic_plan',
        message: 'semantic_plan timed out before platform deadline',
      })
      .mockResolvedValueOnce({
        success: true,
        warnings: [],
        itinerary: {
          id: 'id',
          destination: '東京',
          description: 'desc',
          days: [],
          references: [],
        },
      });

    await processComposeJob('job-1');

    expect(runComposePipeline).toHaveBeenCalledTimes(2);
    expect(mockStore.markCompleted).toHaveBeenCalledTimes(1);
    expect(mockStore.markFailed).not.toHaveBeenCalled();
  });

  it('stops retrying after max attempts and marks failed', async () => {
    runComposePipeline.mockResolvedValue({
      success: false,
      warnings: [],
      failedStep: 'semantic_plan',
      message: 'semantic_plan timed out before platform deadline',
    });

    await processComposeJob('job-2');

    expect(runComposePipeline).toHaveBeenCalledTimes(3);
    expect(mockStore.markFailed).toHaveBeenCalledTimes(1);
  });
});
