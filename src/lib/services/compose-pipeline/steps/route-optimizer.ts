/**
 * Step 5: Route Optimizer
 * Greedy nearest-neighbor + 2-opt ローカル改善
 * Phase 1: ハバーサイン距離推定のみ
 */

import type {
  SelectedStop,
  OptimizedDay,
  OptimizedNode,
  RouteLeg,
  NormalizedRequest,
  DayStructure,
  TransportMode,
} from '@/types/compose-pipeline';
import {
  haversineDistance,
  estimateDistance,
  suggestTransportMode,
  inferAreaType,
} from '@/lib/services/google/distance-estimator';
import type { TransitType } from '@/types/itinerary';

// ============================================
// Constants
// ============================================

/** 2-opt の最大反復回数 */
const MAX_2OPT_ITERATIONS = 50;

/** TransportMode → TransitType マッピング */
const MODE_TO_TRANSIT: Record<TransportMode, TransitType> = {
  walking: 'other',
  public_transit: 'train',
  car: 'car',
  bicycle: 'other',
};

// ============================================
// Public API
// ============================================

/**
 * SelectedStop[] をルート最適化して OptimizedDay[] を返す
 */
export function optimizeRoutes(
  stops: SelectedStop[],
  dayStructures: DayStructure[],
  request: NormalizedRequest
): OptimizedDay[] {
  // 日ごとにグループ化
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

    // 座標が利用可能な場合のみ最適化
    const hasCoords = dayStops.some(
      (s) => s.placeDetails?.latitude && s.placeDetails?.longitude
    );

    let orderedStops: SelectedStop[];
    if (hasCoords) {
      // Greedy nearest-neighbor → 2-opt
      orderedStops = greedyNearestNeighbor(dayStops);
      orderedStops = twoOptImprove(orderedStops);
    } else {
      // 座標なし: 元の順序を維持
      orderedStops = dayStops;
    }

    // ノードとレッグを構築
    const nodes: OptimizedNode[] = orderedStops.map((stop, i) => ({
      stop,
      orderInDay: i,
    }));

    const legs = buildLegs(orderedStops, request.preferredTransport);

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
// Grouping
// ============================================

function groupByDay(
  stops: SelectedStop[],
  dayStructures: DayStructure[]
): Map<number, SelectedStop[]> {
  const groups = new Map<number, SelectedStop[]>();

  // 全日を初期化
  for (const ds of dayStructures) {
    groups.set(ds.day, []);
  }

  // dayHint でグループ化
  for (const stop of stops) {
    const dayNum = stop.candidate.dayHint;
    const group = groups.get(dayNum);
    if (group) {
      group.push(stop);
    } else {
      // dayHint が dayStructure に存在しない場合、最初の日に追加
      const firstDay = dayStructures[0]?.day ?? 1;
      const firstGroup = groups.get(firstDay) ?? [];
      firstGroup.push(stop);
      groups.set(firstDay, firstGroup);
    }
  }

  return groups;
}

// ============================================
// Greedy Nearest Neighbor
// ============================================

function greedyNearestNeighbor(stops: SelectedStop[]): SelectedStop[] {
  if (stops.length <= 1) return [...stops];

  // must_visit を先頭に固定し、それ以外を最適化
  const mustVisit = stops.filter((s) => s.candidate.role === 'must_visit');
  const others = stops.filter((s) => s.candidate.role !== 'must_visit');

  if (others.length === 0) return [...mustVisit];

  const remaining = [...others];
  const result: SelectedStop[] = [...mustVisit];

  // 最初のスポットの座標 or 最初の must_visit の座標
  let currentLat = result[0]?.placeDetails?.latitude ?? 0;
  let currentLng = result[0]?.placeDetails?.longitude ?? 0;

  if (result.length === 0 && remaining.length > 0) {
    // must_visit がない場合、最初の候補をスタート地点に
    const first = remaining.shift()!;
    result.push(first);
    currentLat = first.placeDetails?.latitude ?? 0;
    currentLng = first.placeDetails?.longitude ?? 0;
  }

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      const lat = stop.placeDetails?.latitude ?? 0;
      const lng = stop.placeDetails?.longitude ?? 0;

      if (lat === 0 && lng === 0) continue;

      const dist = haversineDistance(currentLat, currentLng, lat, lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0];
    result.push(nearest);
    currentLat = nearest.placeDetails?.latitude ?? currentLat;
    currentLng = nearest.placeDetails?.longitude ?? currentLng;
  }

  return result;
}

// ============================================
// 2-opt improvement
// ============================================

function twoOptImprove(stops: SelectedStop[]): SelectedStop[] {
  if (stops.length <= 3) return stops;

  // must_visit の位置を固定し、それ以外を最適化
  const route = [...stops];
  let improved = true;
  let iterations = 0;

  while (improved && iterations < MAX_2OPT_ITERATIONS) {
    improved = false;
    iterations++;

    for (let i = 1; i < route.length - 1; i++) {
      // must_visit はスワップしない
      if (route[i].candidate.role === 'must_visit') continue;

      for (let j = i + 1; j < route.length; j++) {
        if (route[j].candidate.role === 'must_visit') continue;

        const currentCost = segmentCost(route, i - 1, i) + segmentCost(route, j, j + 1 < route.length ? j + 1 : j);
        // Reverse the segment [i, j]
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
    a.placeDetails.latitude,
    a.placeDetails.longitude,
    b.placeDetails.latitude,
    b.placeDetails.longitude
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
// Build legs
// ============================================

function buildLegs(
  stops: SelectedStop[],
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
      // 座標なし: デフォルトの移動情報
      legs.push({
        fromIndex: i,
        toIndex: i + 1,
        distanceKm: 0,
        durationMinutes: 15,
        mode: preferredModes[0] || 'public_transit',
        transitType: MODE_TO_TRANSIT[preferredModes[0] || 'public_transit'],
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
    });
  }

  return legs;
}
