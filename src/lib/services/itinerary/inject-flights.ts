/**
 * Flight Injection
 * アダプター変換後の DayPlan[] に往復フライトを注入する
 */

import type { DayPlan, TransitInfo, TimelineItem } from '@/types/itinerary';
import type { FixedScheduleItem } from '@/types/user-input';
import { resolveFlightOriginAirport } from '@/lib/utils/affiliate-links';

export interface FlightInjectionContext {
  /** ユーザーの出発都市 */
  homeBaseCity?: string;
  /** 出発都市の上書き（open-jaw 対応用、未指定時は homeBaseCity） */
  departureCity?: string;
  /** 帰着都市の上書き（open-jaw 対応用、未指定時は homeBaseCity） */
  arrivalCity?: string;
  /** 旅行先 */
  destination: string;
  /** 旅行日数 */
  durationDays: number;
  /** 開始日 (YYYY-MM-DD) */
  startDate?: string;
  /** 予約済みスケジュール（重複回避用） */
  fixedSchedule: FixedScheduleItem[];
  /** 地域 (domestic/overseas) */
  region?: string;
}

/**
 * Day 1 に往路フライト、最終日に復路フライトを注入
 * 既にユーザーが予約済みフライトを持っている場合はスキップ
 */
export function injectFlights(
  days: DayPlan[],
  context: FlightInjectionContext
): DayPlan[] {
  const effectiveDeparture = context.departureCity || context.homeBaseCity;
  const effectiveArrival = context.arrivalCity || context.homeBaseCity;

  if (!effectiveDeparture || days.length === 0) {
    return days;
  }

  // 出発都市と目的地が同一の場合はフライト不要
  if (isSameCity(effectiveDeparture, context.destination)) {
    return days;
  }

  const hasBookedOutboundFlight = context.fixedSchedule.some(
    (item) => item.type === 'flight' && isDay1Flight(item, context.startDate)
  );

  const hasBookedReturnFlight = context.fixedSchedule.some(
    (item) => item.type === 'flight' && isLastDayFlight(item, context.startDate, context.durationDays)
  );

  return days.map((day, index) => {
    const isFirstDay = index === 0;
    const isLastDay = index === days.length - 1;
    let result = day;

    if (isFirstDay && !hasBookedOutboundFlight) {
      result = injectOutboundFlight(result, effectiveDeparture, context.destination);
    }

    if (isLastDay && !hasBookedReturnFlight && effectiveArrival) {
      result = injectReturnFlight(result, context.destination, effectiveArrival);
    }

    return result;
  });
}

/**
 * Resolve a city name to its airport display label.
 * Returns the original name if no airport rule matches (e.g., international destinations).
 */
function resolveAirportLabel(cityName: string): string {
  const { rule } = resolveFlightOriginAirport(cityName);
  if (rule) {
    return rule.label.replace(/\s*\([A-Z]{3}\)\s*$/, '');
  }
  return cityName;
}

function injectOutboundFlight(
  day: DayPlan,
  departure: string,
  destination: string
): DayPlan {
  const transit: TransitInfo = {
    type: 'flight',
    departure: { place: resolveAirportLabel(departure) },
    arrival: { place: resolveAirportLabel(destination) },
  };

  const transitItem: TimelineItem = {
    itemType: 'transit',
    data: transit,
    time: undefined,
  };

  return {
    ...day,
    timelineItems: [transitItem, ...(day.timelineItems ?? [])],
  };
}

function injectReturnFlight(
  day: DayPlan,
  destination: string,
  arrival: string
): DayPlan {
  const transit: TransitInfo = {
    type: 'flight',
    departure: { place: resolveAirportLabel(destination) },
    arrival: { place: resolveAirportLabel(arrival) },
  };

  const transitItem: TimelineItem = {
    itemType: 'transit',
    data: transit,
    time: undefined,
  };

  return {
    ...day,
    timelineItems: [...(day.timelineItems ?? []), transitItem],
  };
}

function isSameCity(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[\s\-・,]/g, '').normalize('NFKC');
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function isDay1Flight(item: FixedScheduleItem, startDate?: string): boolean {
  if (!item.date || !startDate) return false;
  return item.date === startDate;
}

function isLastDayFlight(
  item: FixedScheduleItem,
  startDate?: string,
  durationDays?: number
): boolean {
  if (!item.date || !startDate || !durationDays) return false;
  const start = new Date(`${startDate}T00:00:00`);
  const lastDay = new Date(start);
  lastDay.setDate(start.getDate() + durationDays - 1);
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return item.date === lastDayStr;
}
