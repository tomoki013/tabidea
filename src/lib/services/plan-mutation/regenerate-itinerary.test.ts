import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Itinerary } from '@/types';

const {
  modifyItineraryMock,
  getUserConstraintPromptMock,
  getUnsplashImageMock,
  measureMock,
  getTotalDurationMock,
  logMock,
} = vi.hoisted(() => ({
  modifyItineraryMock: vi.fn(),
  getUserConstraintPromptMock: vi.fn(),
  getUnsplashImageMock: vi.fn(),
  measureMock: vi.fn(async (_step: string, fn: () => Promise<unknown>) => fn()),
  getTotalDurationMock: vi.fn(() => 123),
  logMock: vi.fn(),
}));

vi.mock('@/lib/services/ai/gemini', () => ({
  GeminiService: class {
    modifyItinerary = modifyItineraryMock;
  },
}));

vi.mock('./user-constraints', () => ({
  getUserConstraintPrompt: getUserConstraintPromptMock,
}));

vi.mock('@/lib/unsplash', () => ({
  getUnsplashImage: getUnsplashImageMock,
}));

vi.mock('@/lib/utils/performance-timer', () => ({
  createPerformanceTimer: vi.fn(() => ({
    measure: measureMock,
    getTotalDuration: getTotalDurationMock,
    log: logMock,
  })),
}));

import { regenerateItinerary } from './regenerate-itinerary';

function createPlan(overrides: Partial<Itinerary> = {}): Itinerary {
  return {
    id: 'itin-1',
    destination: 'Kyoto',
    description: 'Kyoto trip',
    days: [
      {
        day: 1,
        title: 'Day 1',
        activities: [
          {
            time: '10:00',
            activity: 'Kinkaku-ji',
            description: 'Temple',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('regenerateItinerary', () => {
  const originalEnv = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
    getUserConstraintPromptMock.mockResolvedValue('');
    getUnsplashImageMock.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalEnv;
  });

  it('injects user constraint prompt and returns regenerated itinerary', async () => {
    const currentPlan = createPlan();
    const regeneratedPlan = createPlan({
      destination: 'Osaka',
      description: 'Osaka trip',
    });

    getUserConstraintPromptMock.mockResolvedValue('Prefer museums');
    getUnsplashImageMock.mockResolvedValue({
      url: 'https://example.com/hero.jpg',
      photographer: 'Tester',
      photographerUrl: 'https://example.com/tester',
    });
    modifyItineraryMock.mockResolvedValue(regeneratedPlan);

    const result = await regenerateItinerary({
      currentPlan,
      chatHistory: [{ role: 'user', text: 'Make it more cultural' }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(modifyItineraryMock).toHaveBeenCalledWith(
      currentPlan,
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          text: expect.stringContaining('[SYSTEM NOTE:'),
        }),
      ]),
    );
    expect(result.data.changedDestination).toBe(true);
    expect(result.data.retryUsed).toBe(false);
    expect(result.data.itinerary.heroImage).toBe('https://example.com/hero.jpg');
  });

  it('returns regenerate_no_effect when retry also produces the same plan', async () => {
    const currentPlan = createPlan();
    modifyItineraryMock.mockResolvedValue(currentPlan);

    const result = await regenerateItinerary({
      currentPlan,
      chatHistory: [{ role: 'user', text: 'Change lunch only' }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toBe('regenerate_no_effect');
    expect(result.meta.retryCount).toBe(1);
    expect(modifyItineraryMock).toHaveBeenCalledTimes(2);
  });

  it('maps timeout-like failures to regenerate_timeout', async () => {
    const currentPlan = createPlan();
    modifyItineraryMock.mockRejectedValue(new Error('タイムアウトしました'));

    const result = await regenerateItinerary({
      currentPlan,
      chatHistory: [{ role: 'user', text: 'Change the hotel' }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toBe('regenerate_timeout');
  });
});
