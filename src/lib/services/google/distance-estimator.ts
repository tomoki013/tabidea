/**
 * Distance Estimator
 * ハバーサイン距離推定 — Phase 1 では Routes API 未使用
 * 将来 Routes API に差し替え可能な interface を提供
 */

import type {
  TransportMode,
  AreaType,
  DistanceEstimate,
} from '@/types/itinerary-pipeline';

// ============================================
// Constants
// ============================================

/** 地球の半径 (km) */
const EARTH_RADIUS_KM = 6371;

/** 補正係数 (直線距離 → 実走距離) */
const CORRECTION_FACTORS: Record<AreaType, number> = {
  urban: 1.4,
  suburban: 1.3,
  rural: 1.2,
};

/** 移動速度 (km/h) by mode */
const SPEED_KMH: Record<TransportMode, number> = {
  walking: 5,
  public_transit: 30,
  car: 40,
  bicycle: 15,
};

/** 乗換・待ち時間の加算 (分) by mode */
const OVERHEAD_MINUTES: Record<TransportMode, number> = {
  walking: 0,
  public_transit: 10,
  car: 5,
  bicycle: 3,
};

// ============================================
// Public API
// ============================================

/**
 * 2 地点間のハバーサイン距離を計算 (km)
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * 2 地点間の移動時間・距離を推定
 */
export function estimateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  mode: TransportMode = 'public_transit',
  areaType: AreaType = 'urban'
): DistanceEstimate {
  const straightLineKm = haversineDistance(lat1, lon1, lat2, lon2);
  const correctionFactor = CORRECTION_FACTORS[areaType];
  const estimatedKm = straightLineKm * correctionFactor;
  const speed = SPEED_KMH[mode];
  const overhead = OVERHEAD_MINUTES[mode];

  // 移動時間 = 距離/速度 * 60 + 乗換オーバーヘッド
  const travelMinutes = (estimatedKm / speed) * 60 + overhead;

  return {
    straightLineKm: Math.round(straightLineKm * 100) / 100,
    estimatedKm: Math.round(estimatedKm * 100) / 100,
    estimatedMinutes: Math.round(travelMinutes),
    mode,
  };
}

/**
 * 距離に基づいて最適な移動手段を推定
 */
export function suggestTransportMode(
  distanceKm: number,
  preferredModes: TransportMode[] = ['public_transit']
): TransportMode {
  // 1km 未満は徒歩
  if (distanceKm < 1 && preferredModes.includes('walking')) {
    return 'walking';
  }
  // 3km 未満は自転車 or 徒歩
  if (distanceKm < 3) {
    if (preferredModes.includes('bicycle')) return 'bicycle';
    if (preferredModes.includes('walking')) return 'walking';
  }
  // それ以上は車 or 公共交通
  if (preferredModes.includes('car')) return 'car';
  return 'public_transit';
}

/**
 * 距離と移動モードから具体的な TransitType を推定
 * walking → walking, public_transit → 距離に応じて walking/bus/train/bullet_train
 */
export function inferTransitType(
  distanceKm: number,
  mode: TransportMode
): import('@/types/itinerary').TransitType {
  switch (mode) {
    case 'walking':
      return 'walking';
    case 'car':
      return 'car';
    case 'bicycle':
      return 'other';
    case 'public_transit':
    default:
      if (distanceKm < 1.5) return 'walking';
      if (distanceKm < 5) return 'bus';
      if (distanceKm < 80) return 'train';
      return 'bullet_train';
  }
}

/**
 * エリアタイプを距離で推定
 */
export function inferAreaType(straightLineKm: number): AreaType {
  if (straightLineKm < 5) return 'urban';
  if (straightLineKm < 20) return 'suburban';
  return 'rural';
}

// ============================================
// Internal helpers
// ============================================

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
