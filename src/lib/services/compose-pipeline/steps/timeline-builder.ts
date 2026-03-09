/**
 * Step 6: Timeline Builder
 * 純粋 TypeScript — 外部 API 不使用
 * OptimizedDay[] → TimelineDay[] への時刻確定
 */

import type {
  OptimizedDay,
  TimelineDay,
  TimelineNode,
  RouteLeg,
  NormalizedRequest,
} from '@/types/compose-pipeline';
import type { FixedScheduleItem } from '@/types/user-input';

// ============================================
// Constants
// ============================================

/** デフォルト開始時刻 */
const DEFAULT_START_TIME = '08:00';

/** 最終アクティビティの終了リミット */
const DEFAULT_END_LIMIT = '22:00';

/** 食事タイムスロットの目安 */
const MEAL_SLOTS = {
  breakfast: { start: '07:30', end: '09:00' },
  lunch: { start: '11:30', end: '13:30' },
  dinner: { start: '18:00', end: '20:00' },
};

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
  if (day.nodes.length === 0) {
    return {
      day: day.day,
      title: day.title,
      nodes: [],
      legs: day.legs,
      overnightLocation: day.overnightLocation,
      startTime: DEFAULT_START_TIME,
    };
  }

  // 開始時刻を決定
  const startTime = determineStartTime(day.day, request.fixedSchedule);

  // Fixed schedule items for this day
  const fixedItems = request.fixedSchedule.filter(
    (fs) => parseDayFromDate(fs.date, day.day, request.startDate) === day.day
  );

  const nodes: TimelineNode[] = [];
  let currentTime = timeToMinutes(startTime);
  const endLimit = timeToMinutes(DEFAULT_END_LIMIT);

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

    const arrivalTime = currentTime;
    const departureTime = arrivalTime + stayMinutes;

    // 時間オーバーチェック
    const warnings: string[] = [];

    if (departureTime > endLimit) {
      // priority 低い候補を削除する代わりに、warning 追加
      warnings.push('活動時間が遅くなります (22:00以降)');
    }

    // 営業時間チェック
    const openHoursWarning = checkOpeningHours(
      node.stop.placeDetails?.openingHours,
      arrivalTime,
      departureTime
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
    });

    currentTime = departureTime;
  }

  // 時間不足: priority 低い候補から削除
  const trimmedNodes = trimOverflowNodes(nodes, endLimit);

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
// Start time determination
// ============================================

function determineStartTime(
  dayNum: number,
  fixedSchedule: FixedScheduleItem[]
): string {
  // 初日にフライト到着がある場合、到着時刻 + 移動時間
  const arrival = fixedSchedule.find(
    (fs) => fs.type === 'flight' && fs.to && fs.time
  );

  if (dayNum === 1 && arrival?.time) {
    // フライト到着 + 90分（入国・移動）
    const arrivalMinutes = timeToMinutes(arrival.time) + 90;
    if (arrivalMinutes > timeToMinutes(DEFAULT_START_TIME)) {
      return minutesToTime(arrivalMinutes);
    }
  }

  return DEFAULT_START_TIME;
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
  departureMinutes: number
): string | null {
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    return null; // データなし → 警告なし
  }

  const arrivalHour = arrivalMinutes / 60;

  for (const period of openingHours.periods) {
    const openHour = parseTimeStringToHour(period.open.time);
    const closeHour = period.close
      ? parseTimeStringToHour(period.close.time)
      : 24;

    if (openHour <= arrivalHour && closeHour >= arrivalHour) {
      return null; // 営業時間内
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
  endLimitMinutes: number
): TimelineNode[] {
  // 全ノードが時間内に収まっている場合はそのまま
  const lastNode = nodes[nodes.length - 1];
  if (!lastNode || timeToMinutes(lastNode.departureTime) <= endLimitMinutes) {
    return nodes;
  }

  // priority 低い候補から削除
  const sorted = [...nodes].sort(
    (a, b) => a.stop.candidate.priority - b.stop.candidate.priority
  );

  const removed = new Set<TimelineNode>();

  for (const node of sorted) {
    // must_visit は削除しない
    if (node.stop.candidate.role === 'must_visit') continue;

    removed.add(node);

    // 残りのノードで時間を再計算
    const remaining = nodes.filter((n) => !removed.has(n));
    if (remaining.length === 0) break;

    const lastRemaining = remaining[remaining.length - 1];
    // 簡易チェック: 削除したノードの滞在時間分だけ余裕ができる
    const savedMinutes = node.stayMinutes + 15; // +15 for travel
    const lastDeparture = timeToMinutes(lastRemaining.departureTime) - savedMinutes;

    if (lastDeparture <= endLimitMinutes) break;
  }

  // 削除後のノードリスト (元の順序を維持)
  const result = nodes.filter((n) => !removed.has(n));

  // 時刻を再計算
  return recalculateTimes(result, timeToMinutes(result[0]?.arrivalTime || DEFAULT_START_TIME));
}

function recalculateTimes(nodes: TimelineNode[], startMinutes: number): TimelineNode[] {
  let currentTime = startMinutes;

  return nodes.map((node, i) => {
    if (i > 0) {
      currentTime += 15; // デフォルトの移動時間
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
  // 簡易: ノード数が変わった場合はレッグを切り詰め
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
