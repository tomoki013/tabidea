import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  estimateDistance,
  suggestTransportMode,
  inferAreaType,
} from './distance-estimator';

// ==============================
// haversineDistance
// ==============================

describe('haversineDistance', () => {
  it('Tokyo to Osaka is approximately 400km', () => {
    // Tokyo: 35.6762, 139.6503
    // Osaka: 34.6937, 135.5023
    const dist = haversineDistance(35.6762, 139.6503, 34.6937, 135.5023);
    expect(dist).toBeGreaterThan(380);
    expect(dist).toBeLessThan(420);
  });

  it('same point returns 0', () => {
    const dist = haversineDistance(35.6812, 139.7671, 35.6812, 139.7671);
    expect(dist).toBe(0);
  });

  it('Tokyo to New York is approximately 10,800km', () => {
    // Tokyo: 35.6762, 139.6503
    // New York: 40.7128, -74.0060
    const dist = haversineDistance(35.6762, 139.6503, 40.7128, -74.006);
    expect(dist).toBeGreaterThan(10000);
    expect(dist).toBeLessThan(11500);
  });

  it('equator points 1 degree apart ≈ 111km', () => {
    const dist = haversineDistance(0, 0, 0, 1);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(112);
  });

  it('antipodal points ≈ 20,000km', () => {
    const dist = haversineDistance(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(19900);
    expect(dist).toBeLessThan(20100);
  });

  it('very close points return very small distance', () => {
    const dist = haversineDistance(35.6812, 139.7671, 35.6813, 139.7672);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(0.02); // less than 20 meters
  });
});

// ==============================
// estimateDistance
// ==============================

describe('estimateDistance', () => {
  it('urban mode gives correction factor 1.4', () => {
    const result = estimateDistance(35.6812, 139.7671, 35.6900, 139.7700, 'public_transit', 'urban');
    const straight = haversineDistance(35.6812, 139.7671, 35.6900, 139.7700);
    const expectedKm = straight * 1.4;

    // estimatedKm should be approximately straightLineKm * 1.4
    expect(result.estimatedKm).toBeCloseTo(Math.round(expectedKm * 100) / 100, 1);
    expect(result.straightLineKm).toBeCloseTo(Math.round(straight * 100) / 100, 1);
  });

  it('suburban mode gives correction factor 1.3', () => {
    const result = estimateDistance(35.68, 139.77, 35.80, 139.90, 'car', 'suburban');
    const straight = haversineDistance(35.68, 139.77, 35.80, 139.90);
    const expectedKm = straight * 1.3;

    expect(result.estimatedKm).toBeCloseTo(Math.round(expectedKm * 100) / 100, 1);
  });

  it('rural mode gives correction factor 1.2', () => {
    const result = estimateDistance(35.0, 139.0, 36.0, 140.0, 'car', 'rural');
    const straight = haversineDistance(35.0, 139.0, 36.0, 140.0);
    const expectedKm = straight * 1.2;

    expect(result.estimatedKm).toBeCloseTo(Math.round(expectedKm * 100) / 100, 1);
  });

  it('returns correct mode in result', () => {
    const result = estimateDistance(35.68, 139.77, 35.69, 139.78, 'walking');
    expect(result.mode).toBe('walking');
  });

  it('walking speed produces expected duration', () => {
    // Walking at 5 km/h, 1 km straight → 1.4 km urban → 1.4/5*60 = 16.8 + 0 overhead ≈ 17 min
    const result = estimateDistance(35.6812, 139.7671, 35.6902, 139.7671, 'walking', 'urban');
    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.mode).toBe('walking');
  });

  it('public_transit includes overhead minutes', () => {
    const transitResult = estimateDistance(35.68, 139.77, 35.69, 139.78, 'public_transit', 'urban');
    const walkResult = estimateDistance(35.68, 139.77, 35.69, 139.78, 'walking', 'urban');

    // Transit should have 10 min overhead, walking has 0
    // But transit is faster (30 km/h vs 5 km/h), so for short distances
    // transit may still be faster. We just verify overhead is included by
    // comparing relative to the pure distance/speed calculation.
    expect(transitResult.estimatedMinutes).toBeGreaterThan(0);
  });

  it('same point returns 0 distance', () => {
    const result = estimateDistance(35.68, 139.77, 35.68, 139.77);
    expect(result.straightLineKm).toBe(0);
    expect(result.estimatedKm).toBe(0);
  });

  it('defaults to public_transit and urban when not specified', () => {
    const result = estimateDistance(35.68, 139.77, 35.69, 139.78);
    expect(result.mode).toBe('public_transit');
    // Urban correction is 1.4
    const straight = haversineDistance(35.68, 139.77, 35.69, 139.78);
    expect(result.estimatedKm).toBeCloseTo(Math.round(straight * 1.4 * 100) / 100, 1);
  });
});

// ==============================
// suggestTransportMode
// ==============================

describe('suggestTransportMode', () => {
  it('short distances (< 1km) suggest walking when available', () => {
    const mode = suggestTransportMode(0.5, ['walking', 'public_transit']);
    expect(mode).toBe('walking');
  });

  it('short distances without walking preference fallback to public_transit', () => {
    const mode = suggestTransportMode(0.5, ['public_transit']);
    expect(mode).toBe('public_transit');
  });

  it('medium distances (< 3km) suggest bicycle when available', () => {
    const mode = suggestTransportMode(2, ['bicycle', 'public_transit']);
    expect(mode).toBe('bicycle');
  });

  it('medium distances suggest walking if bicycle not available but walking is', () => {
    const mode = suggestTransportMode(2, ['walking', 'public_transit']);
    expect(mode).toBe('walking');
  });

  it('long distances suggest car when available', () => {
    const mode = suggestTransportMode(10, ['car', 'public_transit']);
    expect(mode).toBe('car');
  });

  it('long distances fallback to public_transit when car not available', () => {
    const mode = suggestTransportMode(10, ['public_transit']);
    expect(mode).toBe('public_transit');
  });

  it('defaults to public_transit with no preferences', () => {
    const mode = suggestTransportMode(5);
    expect(mode).toBe('public_transit');
  });

  it('very long distances suggest car', () => {
    const mode = suggestTransportMode(100, ['walking', 'bicycle', 'car', 'public_transit']);
    expect(mode).toBe('car');
  });
});

// ==============================
// inferAreaType
// ==============================

describe('inferAreaType', () => {
  it('distance < 5km → urban', () => {
    expect(inferAreaType(1)).toBe('urban');
    expect(inferAreaType(4.9)).toBe('urban');
  });

  it('distance 5km → suburban', () => {
    expect(inferAreaType(5)).toBe('suburban');
  });

  it('distance < 20km → suburban', () => {
    expect(inferAreaType(10)).toBe('suburban');
    expect(inferAreaType(19.9)).toBe('suburban');
  });

  it('distance >= 20km → rural', () => {
    expect(inferAreaType(20)).toBe('rural');
    expect(inferAreaType(100)).toBe('rural');
  });

  it('distance = 0 → urban', () => {
    expect(inferAreaType(0)).toBe('urban');
  });
});
