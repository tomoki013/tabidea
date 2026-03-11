/**
 * Step 5: Route Optimizer (v3)
 * 固定→must→最小増分挿入→2-opt 近傍改善
 * + ペナルティ関数による目的関数
 */

import type {
  SelectedStop,
  OptimizedDay,
  OptimizedNode,
  RouteLeg,
  NormalizedRequest,
  DayStructure,
  TransportMode,
  SemanticPlan,
} from '@/types/itinerary-pipeline';
import {
  haversineDistance,
  estimateDistance,
  suggestTransportMode,
  inferAreaType,
} from '@/lib/services/google/distance-estimator';
import { MAX_2OPT_ITERATIONS, MODE_TO_TRANSIT, PENALTY_COEFFICIENTS, MEAL_SLOTS } from '../constants';

// ============================================
// Public API
// ============================================

/**
 * SelectedStop[] をルート最適化して OptimizedDay[] を返す
 */
export function optimizeRoutes(
  stops: SelectedStop[],
  dayStructures: DayStructure[],
  request: NormalizedRequest,
  semanticPlan?: SemanticPlan
): OptimizedDay[] {
  const dayGroups = groupByDay(stops, dayStructures);
  const optimizedDays: OptimizedDay[] = [];

  for (const [dayNum, dayStops] of dayGroups) {
    const structure = dayStructures.find((d) => d.day === dayNum);

    if (dayStops.length === 0) {
      optimizedDays.push({
        day: dayNum,
        nodes: [],
        legs: [],
        title: structure?.title || `Day ${dayNum}`,
        overnightLocation: structure?.overnightLocation || '',
      });
      continue;
    }

    const hasCoords = dayStops.some(
      (s) => s.placeDetails?.latitude && s.placeDetails?.longitude
    );

    let orderedStops: SelectedStop[];
    if (hasCoords) {
      orderedStops = optimizeWithInsertionHeuristic(dayStops, request);
    } else {
      orderedStops = dayStops;
    }

    const nodes: OptimizedNode[] = orderedStops.map((stop, i) => ({
      stop,
      orderInDay: i,
      nodeId: stop.semanticId || crypto.randomUUID(),
    }));

    const legs = buildLegs(orderedStops, nodes, request.preferredTransport);

    optimizedDays.push({
      day: dayNum,
      nodes,
      legs,
      title: structure?.title || `Day ${dayNum}`,
      overnightLocation: structure?.overnightLocation || '',
    });
  }

  return optimizedDays.sort((a, b) => a.day - b.day);
}

// ============================================
// v3: Insertion heuristic
// ============================================

function optimizeWithInsertionHeuristic(
  stops: SelectedStop[],
  request: NormalizedRequest
): SelectedStop[] {
  if (stops.length <= 1) return [...stops];

  // 1. 固定イベント、must_visit、その他に分類
  const fixed: SelectedStop[] = [];
  const mustVisit: SelectedStop[] = [];
  const remaining: SelectedStop[] = [];

  for (const stop of stops) {
    const hasFixedTime = request.fixedSchedule.some(
      (fs) => fs.name.includes(stop.candidate.name) || stop.candidate.name.includes(fs.name)
    );
    if (hasFixedTime) {
      fixed.push(stop);
    } else if (stop.candidate.role === 'must_visit') {
      mustVisit.push(stop);
    } else {
      remaining.push(stop);
    }
  }

  // 2. 固定イベントを基盤に配置
  let route = [...fixed];

  // 3. must_visit を最小増分コストで挿入
  for (const stop of mustVisit) {
    route = insertAtMinCost(route, stop);
  }

  // 4. 残りを priority 順に最小増分コストで挿入
  remaining.sort((a, b) => b.candidate.priority - a.candidate.priority);
  for (const stop of remaining) {
    route = insertAtMinCost(route, stop);
  }

  // 5. 2-opt 改善
  route = twoOptImprove(route);

  return route;
}

function insertAtMinCost(route: SelectedStop[], stop: SelectedStop): SelectedStop[] {
  if (route.length === 0) return [stop];

  let bestIdx = route.length;
  let bestCost = Infinity;

  const stopLat = stop.placeDetails?.latitude ?? 0;
  const stopLng = stop.placeDetails?.longitude ?? 0;

  for (let i = 0; i <= route.length; i++) {
    let insertionCost = 0;

    if (i > 0) {
      const prev = route[i - 1];
      insertionCost += haversineDistance(
        prev.placeDetails?.latitude ?? 0,
        prev.placeDetails?.longitude ?? 0,
        stopLat, stopLng
      );
    }

    if (i < route.length) {
      const next = route[i];
      const nextLat = next.placeDetails?.latitude ?? 0;
      const nextLng = next.placeDetails?.longitude ?? 0;
      insertionCost += haversineDistance(stopLat, stopLng, nextLat, nextLng);

      if (i > 0) {
        const prev = route[i - 1];
        insertionCost -= haversineDistance(
          prev.placeDetails?.latitude ?? 0,
          prev.placeDetails?.longitude ?? 0,
          nextLat, nextLng
        );
      }
    }

    if (insertionCost < bestCost) {
      bestCost = insertionCost;
      bestIdx = i;
    }
  }

  const result = [...route];
  result.splice(bestIdx, 0, stop);
  return result;
}

// ============================================
// Grouping
// ============================================

function groupByDay(
  stops: SelectedStop[],
  dayStructures: DayStructure[]
): Map<number, SelectedStop[]> {
  const groups = new Map<number, SelectedStop[]>();

  for (const ds of dayStructures) {
    groups.set(ds.day, []);
  }

  for (const stop of stops) {
    const dayNum = stop.candidate.dayHint;
    const group = groups.get(dayNum);
    if (group) {
      group.push(stop);
    } else {
      const firstDay = dayStructures[0]?.day ?? 1;
      const firstGroup = groups.get(firstDay) ?? [];
      firstGroup.push(stop);
      groups.set(firstDay, firstGroup);
    }
  }

  return groups;
}

// ============================================
// 2-opt improvement
// ============================================

function twoOptImprove(stops: SelectedStop[]): SelectedStop[] {
  if (stops.length <= 3) return stops;

  const route = [...stops];
  let improved = true;
  let iterations = 0;

  while (improved && iterations < MAX_2OPT_ITERATIONS) {
    improved = false;
    iterations++;

    for (let i = 1; i < route.length - 1; i++) {
      if (route[i].candidate.role === 'must_visit') continue;

      for (let j = i + 1; j < route.length; j++) {
        if (route[j].candidate.role === 'must_visit') continue;

        const currentCost = segmentCost(route, i - 1, i) + segmentCost(route, j, j + 1 < route.length ? j + 1 : j);
        const newRoute = [...route];
        reverseSegment(newRoute, i, j);
        const newCost = segmentCost(newRoute, i - 1, i) + segmentCost(newRoute, j, j + 1 < newRoute.length ? j + 1 : j);

        if (newCost < currentCost) {
          reverseSegment(route, i, j);
          improved = true;
        }
      }
    }
  }

  return route;
}

function segmentCost(route: SelectedStop[], from: number, to: number): number {
  if (from < 0 || to >= route.length) return 0;
  const a = route[from];
  const b = route[to];
  if (!a.placeDetails || !b.placeDetails) return 0;
  return haversineDistance(
    a.placeDetails.latitude, a.placeDetails.longitude,
    b.placeDetails.latitude, b.placeDetails.longitude
  );
}

function reverseSegment(arr: SelectedStop[], i: number, j: number): void {
  while (i < j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    i++;
    j--;
  }
}

// ============================================
// Penalty functions (exported for testing)
// ============================================

/**
 * 食事タイミングペナルティ
 */
export function mealTimingPenalty(stop: SelectedStop, arrivalMinutes: number): number {
  if (stop.candidate.role !== 'meal') return 0;

  const hint = stop.candidate.timeSlotHint;
  let targetWindow: { start: string; end: string } | null = null;

  if (hint === 'morning') targetWindow = MEAL_SLOTS.breakfast;
  else if (hint === 'midday') targetWindow = MEAL_SLOTS.lunch;
  else if (hint === 'evening') targetWindow = MEAL_SLOTS.dinner;

  if (!targetWindow) return 0;

  const windowStart = timeToMinutesLocal(targetWindow.start);
  const windowEnd = timeToMinutesLocal(targetWindow.end);

  if (arrivalMinutes >= windowStart && arrivalMinutes <= windowEnd) return 0;

  const deviation = Math.min(
    Math.abs(arrivalMinutes - windowStart),
    Math.abs(arrivalMinutes - windowEnd)
  );

  return deviation * PENALTY_COEFFICIENTS.mealTiming / 60;
}

/**
 * エリア往復ペナルティ
 */
export function areaBacktrackPenalty(stops: SelectedStop[]): number {
  if (stops.length <= 2) return 0;

  let penalty = 0;
  const visitedAreas: string[] = [];

  for (const stop of stops) {
    const area = stop.candidate.areaHint || '';
    if (area && visitedAreas.length > 1) {
      const lastIdx = visitedAreas.lastIndexOf(area);
      if (lastIdx >= 0 && lastIdx < visitedAreas.length - 1) {
        penalty += PENALTY_COEFFICIENTS.areaBacktrack;
      }
    }
    visitedAreas.push(area);
  }

  return penalty;
}

// ============================================
// Build legs
// ============================================

function buildLegs(
  stops: SelectedStop[],
  nodes: OptimizedNode[],
  preferredModes: TransportMode[]
): RouteLeg[] {
  const legs: RouteLeg[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];

    const fromLat = from.placeDetails?.latitude ?? 0;
    const fromLng = from.placeDetails?.longitude ?? 0;
    const toLat = to.placeDetails?.latitude ?? 0;
    const toLng = to.placeDetails?.longitude ?? 0;

    if (fromLat === 0 && fromLng === 0 && toLat === 0 && toLng === 0) {
      legs.push({
        fromIndex: i,
        toIndex: i + 1,
        distanceKm: 0,
        durationMinutes: 15,
        mode: preferredModes[0] || 'public_transit',
        transitType: MODE_TO_TRANSIT[preferredModes[0] || 'public_transit'],
        legId: crypto.randomUUID(),
        fromNodeId: nodes[i]?.nodeId,
        toNodeId: nodes[i + 1]?.nodeId,
      });
      continue;
    }

    const straightDist = haversineDistance(fromLat, fromLng, toLat, toLng);
    const mode = suggestTransportMode(straightDist, preferredModes);
    const areaType = inferAreaType(straightDist);
    const estimate = estimateDistance(fromLat, fromLng, toLat, toLng, mode, areaType);

    legs.push({
      fromIndex: i,
      toIndex: i + 1,
      distanceKm: estimate.estimatedKm,
      durationMinutes: estimate.estimatedMinutes,
      mode,
      transitType: MODE_TO_TRANSIT[mode],
      legId: crypto.randomUUID(),
      fromNodeId: nodes[i]?.nodeId,
      toNodeId: nodes[i + 1]?.nodeId,
    });
  }

  return legs;
}

// Local time utility (avoid circular import)
function timeToMinutesLocal(time: string): number {
  const parts = time.split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
