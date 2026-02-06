/**
 * カレンダーエクスポートユーティリティ
 * 旅程をiCalendar (.ics) またはGoogle Calendarに連携
 */

import { createEvents, type EventAttributes, type DateArray } from 'ics';
import type { Itinerary, DayPlan, Activity } from '@/types';

// ============================================
// Types
// ============================================

export interface CalendarExportResult {
  success: boolean;
  icsContent?: string;
  error?: string;
}

export interface ParsedTripDates {
  hasSpecificDates: boolean;
  startDate?: Date;
  endDate?: Date;
  duration: number;
}

// ============================================
// Date Parsing
// ============================================

/**
 * 旅行日程文字列から具体的な日付を抽出
 */
export function parseTripDates(dateStr: string): ParsedTripDates {
  // "YYYY-MM-DDからX日間" format
  const fullMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})から(\d+)日間/);
  if (fullMatch) {
    const startDate = new Date(
      parseInt(fullMatch[1], 10),
      parseInt(fullMatch[2], 10) - 1,
      parseInt(fullMatch[3], 10)
    );
    const duration = parseInt(fullMatch[4], 10);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);
    return { hasSpecificDates: true, startDate, endDate, duration };
  }

  // "X日間" format (no specific date)
  const daysMatch = dateStr.match(/(\d+)日間/);
  if (daysMatch) {
    return { hasSpecificDates: false, duration: parseInt(daysMatch[1], 10) };
  }

  // "X泊Y日" format
  const nightsDaysMatch = dateStr.match(/(\d+)泊(\d+)日/);
  if (nightsDaysMatch) {
    return { hasSpecificDates: false, duration: parseInt(nightsDaysMatch[2], 10) };
  }

  return { hasSpecificDates: false, duration: 0 };
}

/**
 * 時間文字列をパース（例: "09:00" → [9, 0]）
 */
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10),
  };
}

/**
 * DateArray (ics library format) を生成
 */
function toDateArray(date: Date, hour = 0, minute = 0): DateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    hour,
    minute,
  ];
}

// ============================================
// ICS Generation
// ============================================

/**
 * 旅程からICSイベントを生成
 */
function buildEvents(
  itinerary: Itinerary,
  startDate: Date
): EventAttributes[] {
  const events: EventAttributes[] = [];

  itinerary.days.forEach((day: DayPlan) => {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + day.day - 1);

    // Transit event
    if (day.transit) {
      const depTime = day.transit.departure.time
        ? parseTime(day.transit.departure.time)
        : null;
      const arrTime = day.transit.arrival.time
        ? parseTime(day.transit.arrival.time)
        : null;

      events.push({
        title: `🚃 ${day.transit.departure.place} → ${day.transit.arrival.place}`,
        description: [
          day.transit.memo,
          day.transit.duration ? `所要時間: ${day.transit.duration}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        start: toDateArray(
          dayDate,
          depTime?.hour ?? 8,
          depTime?.minute ?? 0
        ),
        end: toDateArray(
          dayDate,
          arrTime?.hour ?? (depTime ? depTime.hour + 2 : 10),
          arrTime?.minute ?? 0
        ),
        location: `${day.transit.departure.place} → ${day.transit.arrival.place}`,
        status: 'CONFIRMED' as const,
      });
    }

    // Activity events
    day.activities.forEach((activity: Activity, index: number) => {
      const startTime = parseTime(activity.time);
      const nextActivity = day.activities[index + 1];
      const endTime = nextActivity
        ? parseTime(nextActivity.time)
        : null;

      const startHour = startTime?.hour ?? 9 + index * 2;
      const startMinute = startTime?.minute ?? 0;
      const endHour = endTime?.hour ?? startHour + 1;
      const endMinute = endTime?.minute ?? 0;

      events.push({
        title: activity.activity,
        description: activity.description,
        start: toDateArray(dayDate, startHour, startMinute),
        end: toDateArray(dayDate, endHour, endMinute),
        status: 'CONFIRMED' as const,
      });
    });
  });

  return events;
}

/**
 * 旅程をICSファイル内容に変換
 */
export function generateICS(
  itinerary: Itinerary,
  startDate: Date
): CalendarExportResult {
  const events = buildEvents(itinerary, startDate);

  if (events.length === 0) {
    return { success: false, error: 'エクスポートするイベントがありません' };
  }

  const { error, value } = createEvents(events);

  if (error) {
    console.error('[calendar-export] ICS generation error:', error);
    return { success: false, error: 'カレンダーファイルの生成に失敗しました' };
  }

  return { success: true, icsContent: value ?? undefined };
}

/**
 * ICSファイルをダウンロード
 */
export function downloadICS(
  itinerary: Itinerary,
  startDate: Date,
  fileName?: string
): boolean {
  const result = generateICS(itinerary, startDate);
  if (!result.success || !result.icsContent) return false;

  const blob = new Blob([result.icsContent], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${itinerary.destination}_旅程.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

// ============================================
// Google Calendar
// ============================================

/**
 * Google Calendar追加リンクを生成
 * 旅程全体を1つのイベントとして追加
 */
export function generateGoogleCalendarUrl(
  itinerary: Itinerary,
  startDate: Date
): string {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + itinerary.days.length);

  const formatGCDate = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const daysSummary = itinerary.days
    .map(
      (day) =>
        `Day ${day.day}: ${day.title}\n${day.activities.map((a) => `  ${a.time} ${a.activity}`).join('\n')}`
    )
    .join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${itinerary.destination} 旅行`,
    dates: `${formatGCDate(startDate)}/${formatGCDate(endDate)}`,
    details: `${itinerary.description}\n\n${daysSummary}`,
    location: itinerary.destination,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
