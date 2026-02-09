/**
 * useSpotCoordinates Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpotCoordinates } from './useSpotCoordinates';
import type { DayPlan } from '@/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock activity-classifier
vi.mock('@/lib/utils/activity-classifier', () => ({
  shouldSkipPlacesSearch: (name: string) => {
    const skipKeywords = ['移動', 'チェックイン', 'チェックアウト', '出発'];
    return skipKeywords.some(kw => name.includes(kw));
  },
}));

describe('useSpotCoordinates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createDayPlan = (overrides?: Partial<DayPlan>): DayPlan => ({
    day: 1,
    title: 'Test Day',
    activities: [
      {
        time: '10:00',
        activity: '金閣寺',
        description: '金閣寺を見学',
      },
      {
        time: '14:00',
        activity: '清水寺',
        description: '清水寺を参拝',
      },
    ],
    ...overrides,
  });

  it('should return enrichedDays with same structure as input when no coordinates fetched yet', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    });

    const days = [createDayPlan()];
    const { result } = renderHook(() => useSpotCoordinates(days, '京都'));

    expect(result.current.enrichedDays).toHaveLength(1);
    expect(result.current.enrichedDays[0].activities).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
  });

  it('should skip activities that shouldSkipPlacesSearch', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    });

    const days = [createDayPlan({
      activities: [
        { time: '10:00', activity: '金閣寺', description: 'sightseeing' },
        { time: '12:00', activity: '京都駅へ移動', description: 'transit' },
        { time: '15:00', activity: 'チェックイン', description: 'hotel' },
      ],
    })];

    const { result } = renderHook(() => useSpotCoordinates(days, '京都'));

    // Only 金閣寺 should be counted (移動 and チェックイン are skipped)
    expect(result.current.totalCount).toBe(1);
  });

  it('should not refetch for activities that already have coordinates', () => {
    const days = [createDayPlan({
      activities: [
        {
          time: '10:00',
          activity: '金閣寺',
          description: 'sightseeing',
          validation: {
            spotName: '金閣寺',
            isVerified: true,
            confidence: 'high',
            details: { latitude: 35.03, longitude: 135.72 },
          },
        },
      ],
    })];

    const { result } = renderHook(() => useSpotCoordinates(days, '京都'));

    // Should not call fetch for activities with existing coordinates
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.resolvedCount).toBe(1);
  });

  it('should enrich days with fetched coordinates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        validation: {
          spotName: '金閣寺',
          isVerified: true,
          confidence: 'high',
          placeId: 'ChIJ123',
          details: {
            latitude: 35.03,
            longitude: 135.72,
          },
        },
      }),
    });

    const days = [createDayPlan({
      activities: [
        { time: '10:00', activity: '金閣寺', description: 'sightseeing' },
      ],
    })];

    const { result } = renderHook(() => useSpotCoordinates(days, '京都'));

    await waitFor(() => {
      expect(result.current.enrichedDays[0].activities[0].validation?.details?.latitude).toBe(35.03);
    });

    expect(result.current.enrichedDays[0].activities[0].validation?.details?.longitude).toBe(135.72);
  });
});
