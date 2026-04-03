/**
 * Step 6: Timeline Builder (v3)
 * 純粋 TypeScript — 外部 API 不使用
 * OptimizedDay[] → TimelineDay[] への時刻確定
 * + nodeId 付与、meal window 調整、startTime/endTime 尊重
 */

import type {
  OptimizedDay,
  TimelineDay,
  TimelineNode,
  RouteLeg,
  NormalizedRequest,
} from '@/types/itinerary-pipeline';
import type { FixedScheduleItem } from '@/types/user-input';
import { DEFAULT_START_TIME, DEFAULT_END_LIMIT, MEAL_SLOTS } from '../constants';

// ============================================
// Public API
// ============================================

/**
 * OptimizedDay[] をタイムラインに変換
 */
export function buildTimeline(
  optimizedDays: OptimizedDay[],
  request: NormalizedRequest
): TimelineDay[] {
  return optimizedDays.map((day) => buildDayTimeline(day, request));
}

// ============================================
// Day-level timeline building
// ============================================

function buildDayTimeline(
  day: OptimizedDay,
  request: NormalizedRequest
): TimelineDay {
  const { dayStartTime, dayEndLimit } = determineDayBounds(day.day, request);

  if (day.nodes.length === 0) {
    return {
      day: day.day,
      title: day.title,
      nodes: [],
      legs: day.legs,
      overnightLocation: day.overnightLocation,
      startTime: dayStartTime,
    };
  }

  // 開始時刻を決定
  const startTime = determineStartTime(day.day, request.fixedSchedule, dayStartTime);

  // Fixed schedule items for this day
  const fixedItems = request.fixedSchedule.filter(
    (fs) => parseDayFromDate(fs.date, day.day, request.startDate) === day.day
  );

  const nodes: TimelineNode[] = [];
  let currentTime = timeToMinutes(startTime);
  const endLimit = timeToMinutes(dayEndLimit);

  for (let i = 0; i < day.nodes.length; i++) {
    const node = day.nodes[i];
    const stayMinutes = node.stop.candidate.stayDurationMinutes;

    // Fixed schedule: override time if applicable
    const fixedTime = findFixedTime(node.stop.candidate.name, fixedItems);
    if (fixedTime !== null) {
      currentTime = Math.max(currentTime, fixedTime);
    }

    // 前のノードからの移動時間を加算
    if (i > 0 && day.legs[i - 1]) {
      currentTime += day.legs[i - 1].durationMinutes;
    }

    // v3: 食事候補を meal window に引き寄せる
    if (node.stop.candidate.role === 'meal') {
      currentTime = adjustForMealWindow(currentTime, node.stop.candidate.timeSlotHint);
    }

    const arrivalTime = currentTime;
    const departureTime = arrivalTime + stayMinutes;

    // 時間オーバーチェック
    const warnings: string[] = [];

    if (departureTime > endLimit) {
      warnings.push('活動時間が遅くなります (22:00以降)');
    }

    // 営業時間チェック
    const openHoursWarning = checkOpeningHours(
      node.stop.placeDetails?.openingHours,
      arrivalTime,
    );
    if (openHoursWarning) {
      warnings.push(openHoursWarning);
    }

    nodes.push({
      stop: node.stop,
      arrivalTime: minutesToTime(arrivalTime),
      departureTime: minutesToTime(departureTime),
      stayMinutes,
      warnings: [...node.stop.warnings, ...warnings],
      // v3: nodeId と semanticId
      nodeId: node.nodeId,
      semanticId: node.stop.semanticId,
    });

    currentTime = departureTime;
  }

  // 時間不足: priority 低い候補から削除
  const trimmedNodes = trimOverflowNodes(nodes, endLimit, request);

  return {
    day: day.day,
    title: day.title,
    nodes: trimmedNodes,
    legs: adjustLegsForTrimming(day.legs, day.nodes.length, trimmedNodes.length),
    overnightLocation: day.overnightLocation,
    startTime,
  };
}

// ============================================
// v3: Meal window adjustment
// ============================================

function adjustForMealWindow(currentMinutes: number, timeSlotHint: string): number {
  let targetStart: number | null = null;

  if (timeSlotHint === 'morning') targetStart = timeToMinutes(MEAL_SLOTS.breakfast.start);
  else if (timeSlotHint === 'midday') targetStart = timeToMinutes(MEAL_SLOTS.lunch.start);
  else if (timeSlotHint === 'evening') targetStart = timeToMinutes(MEAL_SLOTS.dinner.start);

  if (targetStart === null) return currentMinutes;

  // もう食事時間帯を過ぎていたら、そのまま
  const targetEnd = targetStart + 120; // 2h window
  if (currentMinutes > targetEnd) return currentMinutes;

  // まだ早い場合は、食事時間帯の開始に寄せる (ただし30分以上早い場合のみ)
  if (currentMinutes < targetStart - 30) return currentMinutes;
  if (currentMinutes < targetStart) return targetStart;

  return currentMinutes;
}

// ============================================
// Start time determination
// ============================================

function determineStartTime(
  dayNum: number,
  fixedSchedule: FixedScheduleItem[],
  defaultStart: string
): string {
  const arrival = fixedSchedule.find(
    (fs) => fs.type === 'flight' && fs.to && fs.time
  );

  if (dayNum === 1 && arrival?.time) {
    const arrivalMinutes = timeToMinutes(arrival.time) + 90;
    if (arrivalMinutes > timeToMinutes(defaultStart)) {
      return minutesToTime(arrivalMinutes);
    }
  }

  return defaultStart;
}

function determineDayBounds(
  dayNum: number,
  request: NormalizedRequest
): { dayStartTime: string; dayEndLimit: string } {
  let dayStartTime = request.startTime || DEFAULT_START_TIME;
  let endLimitMinutes = timeToMinutes(request.endTime || DEFAULT_END_LIMIT);

  const destinationMatches = (value?: string) =>
    value
      ? request.destinations.some((destination) => value.includes(destination))
      : false;

  for (const transport of request.hardConstraints.fixedTransports) {
    if (!transport.time || transport.day !== dayNum) continue;

    const transportMinutes = timeToMinutes(transport.time);
    const isArrival =
      destinationMatches(transport.to) ||
      (!transport.from && dayNum === 1);
    const isDeparture =
      destinationMatches(transport.from) ||
      (!transport.to && dayNum === request.durationDays);

    if (isArrival) {
      const arrivalTime = minutesToTime(transportMinutes + 90);
      if (timeToMinutes(arrivalTime) > timeToMinutes(dayStartTime)) {
        dayStartTime = arrivalTime;
      }
    }

    if (isDeparture) {
      endLimitMinutes = Math.min(endLimitMinutes, Math.max(transportMinutes - 90, timeToMinutes(dayStartTime)));
    }
  }

  return {
    dayStartTime,
    dayEndLimit: minutesToTime(endLimitMinutes),
  };
}

// ============================================
// Fixed schedule matching
// ============================================

function findFixedTime(
  name: string,
  fixedItems: FixedScheduleItem[]
): number | null {
  for (const item of fixedItems) {
    if (item.time && (item.name.includes(name) || name.includes(item.name))) {
      return timeToMinutes(item.time);
    }
  }
  return null;
}

function parseDayFromDate(
  date: string | undefined,
  defaultDay: number,
  startDate?: string
): number {
  if (!date || !startDate) return defaultDay;

  try {
    const start = new Date(startDate);
    const target = new Date(date);
    const diffMs = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return diffDays + 1;
  } catch {
    return defaultDay;
  }
}

// ============================================
// Opening hours check
// ============================================

function checkOpeningHours(
  openingHours: { periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }> } | undefined,
  arrivalMinutes: number,
): string | null {
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    return null;
  }

  const arrivalHour = arrivalMinutes / 60;

  for (const period of openingHours.periods) {
    const openHour = parseTimeStringToHour(period.open.time);
    const closeHour = period.close
      ? parseTimeStringToHour(period.close.time)
      : 24;

    if (openHour <= arrivalHour && closeHour >= arrivalHour) {
      return null;
    }
  }

  return '営業時間外の可能性があります — 要確認';
}

function parseTimeStringToHour(time: string): number {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
  }
  return parseInt(time, 10);
}

// ============================================
// Overflow trimming
// ============================================

function trimOverflowNodes(
  nodes: TimelineNode[],
  endLimitMinutes: number,
  request: NormalizedRequest
): TimelineNode[] {
  const lastNode = nodes[nodes.length - 1];
  if (!lastNode || timeToMinutes(lastNode.departureTime) <= endLimitMinutes) {
    return nodes;
  }

  const sorted = [...nodes].sort(
    (a, b) => a.stop.candidate.priority - b.stop.candidate.priority
  );

  const removed = new Set<TimelineNode>();

  for (const node of sorted) {
    if (isHardLockedNode(node, request) || preservesDayCoverage(node, nodes)) continue;

    removed.add(node);

    const remaining = nodes.filter((n) => !removed.has(n));
    if (remaining.length === 0) break;

    const lastRemaining = remaining[remaining.length - 1];
    const savedMinutes = node.stayMinutes + 15;
    const lastDeparture = timeToMinutes(lastRemaining.departureTime) - savedMinutes;

    if (lastDeparture <= endLimitMinutes) break;
  }

  const result = nodes.filter((n) => !removed.has(n));
  return recalculateTimes(result, timeToMinutes(result[0]?.arrivalTime || DEFAULT_START_TIME));
}

function isHardLockedNode(
  node: TimelineNode,
  request: NormalizedRequest
): boolean {
  if (node.stop.candidate.role === 'must_visit') {
    return true;
  }

  return request.fixedSchedule.some((item) =>
    item.name.includes(node.stop.candidate.name) || node.stop.candidate.name.includes(item.name)
  );
}

function preservesDayCoverage(
  node: TimelineNode,
  nodes: TimelineNode[],
): boolean {
  if (node.stop.candidate.role === 'accommodation') {
    return false;
  }

  const laterCoverageSlots = new Set(['afternoon', 'evening', 'night']);
  if (
    node.stop.candidate.role !== 'meal'
    && laterCoverageSlots.has(node.stop.candidate.timeSlotHint)
    && nodes.find((candidate) =>
      candidate.stop.candidate.role !== 'meal'
      && candidate.stop.candidate.role !== 'accommodation'
      && candidate.stop.candidate.timeSlotHint === node.stop.candidate.timeSlotHint,
    ) === node
  ) {
    return true;
  }

  if (node.stop.candidate.role === 'meal') {
    return nodes.filter((candidate) => candidate.stop.candidate.role === 'meal').length <= 1;
  }

  return false;
}

function recalculateTimes(nodes: TimelineNode[], startMinutes: number): TimelineNode[] {
  let currentTime = startMinutes;

  return nodes.map((node, i) => {
    if (i > 0) {
      const previousNode = nodes[i - 1];
      const inferredGap = Math.max(
        15,
        timeToMinutes(node.arrivalTime) - timeToMinutes(previousNode.departureTime),
      );
      currentTime += inferredGap;
    }
    const arrivalTime = currentTime;
    const departureTime = arrivalTime + node.stayMinutes;
    currentTime = departureTime;

    return {
      ...node,
      arrivalTime: minutesToTime(arrivalTime),
      departureTime: minutesToTime(departureTime),
    };
  });
}

function adjustLegsForTrimming(
  legs: RouteLeg[],
  originalCount: number,
  newCount: number
): RouteLeg[] {
  if (originalCount === newCount) return legs;
  return legs.slice(0, Math.max(0, newCount - 1));
}

// ============================================
// Time utilities
// ============================================

/**
 * "HH:mm" → 分 (0:00 = 0, 23:59 = 1439)
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * 分 → "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
