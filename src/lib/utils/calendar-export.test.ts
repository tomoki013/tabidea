import { describe, it, expect } from 'vitest';
import { parseTripDates, generateICS, generateGoogleCalendarUrl } from './calendar-export';
import type { Itinerary } from '@/types';

describe('parseTripDates', () => {
  it('YYYY-MM-DDからX日間を正しくパース', () => {
    const result = parseTripDates('2025-07-01から3日間');
    expect(result.hasSpecificDates).toBe(true);
    expect(result.duration).toBe(3);
    expect(result.startDate).toBeDefined();
    expect(result.startDate?.getFullYear()).toBe(2025);
    expect(result.startDate?.getMonth()).toBe(6); // July = 6
    expect(result.startDate?.getDate()).toBe(1);
  });

  it('X日間のみの場合はhasSpecificDates = false', () => {
    const result = parseTripDates('3日間');
    expect(result.hasSpecificDates).toBe(false);
    expect(result.duration).toBe(3);
  });

  it('X泊Y日のフォーマット', () => {
    const result = parseTripDates('2泊3日');
    expect(result.hasSpecificDates).toBe(false);
    expect(result.duration).toBe(3);
  });

  it('不明なフォーマット', () => {
    const result = parseTripDates('不明');
    expect(result.hasSpecificDates).toBe(false);
    expect(result.duration).toBe(0);
  });
});

const mockItinerary: Itinerary = {
  id: 'test-1',
  destination: '京都',
  description: 'テスト旅程',
  days: [
    {
      day: 1,
      title: '初日',
      activities: [
        { time: '09:00', activity: '清水寺', description: '朝一で参拝' },
        { time: '12:00', activity: 'ランチ', description: '京都料理' },
      ],
    },
    {
      day: 2,
      title: '2日目',
      activities: [
        { time: '10:00', activity: '金閣寺', description: '見学' },
      ],
    },
  ],
};

describe('generateICS', () => {
  it('ICSコンテンツを正しく生成', () => {
    const startDate = new Date(2025, 6, 1);
    const result = generateICS(mockItinerary, startDate);
    expect(result.success).toBe(true);
    expect(result.icsContent).toBeDefined();
    expect(result.icsContent).toContain('BEGIN:VCALENDAR');
    expect(result.icsContent).toContain('清水寺');
    expect(result.icsContent).toContain('金閣寺');
  });
});

describe('generateGoogleCalendarUrl', () => {
  it('Google CalendarのURLを生成', () => {
    const startDate = new Date(2025, 6, 1);
    const url = generateGoogleCalendarUrl(mockItinerary, startDate);
    expect(url).toContain('calendar.google.com');
    expect(decodeURIComponent(url)).toContain('京都');
    expect(url).toContain('TEMPLATE');
  });
});
