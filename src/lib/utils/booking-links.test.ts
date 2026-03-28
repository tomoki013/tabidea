import { describe, it, expect } from 'vitest';
import { generateBookingLinks, generateTripBookingSummary, inferFlightOriginFromItinerary } from './booking-links';

describe('generateBookingLinks', () => {
  it('ホテル予約リンクを生成', () => {
    const result = generateBookingLinks({
      type: 'hotel',
      destination: '京都',
    });
    expect(result.type).toBe('hotel');
    expect(result.icon).toBe('🏨');
    expect(result.links.length).toBeGreaterThan(0);
    expect(decodeURIComponent(result.links[0].url)).toContain('京都');
  });

  it('航空券リンクを生成', () => {
    const result = generateBookingLinks({
      type: 'flight',
      destination: 'パリ',
      origin: '東京',
    });
    expect(result.type).toBe('flight');
    expect(result.icon).toBe('✈️');
    expect(result.links.length).toBeGreaterThan(0);
  });

  it('海外旅行では都市名の出発地を主要国際空港へ補正する', () => {
    const result = generateBookingLinks({
      type: 'flight',
      destination: 'パリ',
      origin: '京都',
    });

    expect(result.flightSearchInfo?.resolvedOrigin).toBe('KIX');
    expect(result.flightSearchInfo?.originAdjusted).toBe(true);
  });

  it('アクティビティリンクを生成', () => {
    const result = generateBookingLinks({
      type: 'activity',
      destination: 'バリ島',
    });
    expect(result.type).toBe('activity');
    expect(result.icon).toBe('🎫');
    expect(result.links.length).toBeGreaterThan(0);
  });
});

describe('generateTripBookingSummary', () => {
  it('全カテゴリのリンクまとめを生成', () => {
    const results = generateTripBookingSummary('京都');
    expect(results).toHaveLength(3);
    expect(results[0].type).toBe('hotel');
    expect(results[1].type).toBe('flight');
    expect(results[2].type).toBe('activity');
  });
});

describe('inferFlightOriginFromItinerary', () => {
  it('初日の往路フライトから出発地を推定する', () => {
    const origin = inferFlightOriginFromItinerary({
      days: [
        {
          day: 1,
          title: 'Day 1',
          activities: [],
          timelineItems: [
            {
              itemType: 'transit',
              data: {
                type: 'flight',
                departure: { place: '京都' },
                arrival: { place: 'パリ' },
              },
            },
          ],
        },
      ],
    });

    expect(origin).toBe('京都');
  });
});
