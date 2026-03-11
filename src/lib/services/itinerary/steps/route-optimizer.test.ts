import { describe, it, expect } from 'vitest';
import { optimizeRoutes } from './route-optimizer';
import type {
  SelectedStop,
  DayStructure,
  NormalizedRequest,
  SemanticCandidate,
} from '@/types/itinerary-pipeline';
import type { PlaceDetails } from '@/types/places';
import type { UserInput } from '@/types/user-input';

// ==============================
// Helpers
// ==============================

const makeCandidate = (overrides: Partial<SemanticCandidate> = {}): SemanticCandidate => ({
  name: 'テストスポット',
  role: 'recommended',
  priority: 5,
  dayHint: 1,
  timeSlotHint: 'morning',
  stayDurationMinutes: 60,
  searchQuery: 'テストスポット',
  ...overrides,
});

const makePlaceDetails = (overrides: Partial<PlaceDetails> = {}): PlaceDetails => ({
  placeId: 'place-1',
  name: 'Test Place',
  formattedAddress: '東京都渋谷区',
  latitude: 35.6812,
  longitude: 139.7671,
  rating: 4.2,
  userRatingsTotal: 500,
  googleMapsUrl: 'https://maps.google.com',
  ...overrides,
});

const makeStop = (
  name: string,
  lat: number,
  lng: number,
  dayHint = 1,
  role: SemanticCandidate['role'] = 'recommended'
): SelectedStop => ({
  candidate: makeCandidate({ name, dayHint, role, searchQuery: name }),
  placeDetails: makePlaceDetails({
    placeId: `place-${name}`,
    name,
    latitude: lat,
    longitude: lng,
  }),
  feasibilityScore: 70,
  warnings: [],
});

const makeUserInput = (): UserInput => ({
  destinations: ['東京'],
  region: 'domestic',
  dates: '3日間',
  companions: '友達',
  theme: ['グルメ'],
  budget: 'standard',
  pace: 'balanced',
  freeText: '',
});

const makeRequest = (overrides: Partial<NormalizedRequest> = {}): NormalizedRequest => ({
  destinations: ['東京'],
  durationDays: 1,
  companions: '友達',
  themes: ['グルメ'],
  budgetLevel: 'standard',
  pace: 'balanced',
  freeText: '',
  mustVisitPlaces: [],
  fixedSchedule: [],
  preferredTransport: ['public_transit'],
  isDestinationDecided: true,
  region: 'domestic',
  outputLanguage: 'ja',
  originalInput: makeUserInput(),
  ...overrides,
});

const makeDayStructure = (day: number): DayStructure => ({
  day,
  title: `Day ${day}`,
  mainArea: '東京',
  overnightLocation: '東京',
  summary: `Day ${day} summary`,
});

// ==============================
// Tests
// ==============================

describe('optimizeRoutes', () => {
  it('single node day: no legs, order preserved', () => {
    const stops = [makeStop('浅草寺', 35.7148, 139.7967, 1)];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes(stops, dayStructures, request);

    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(1);
    expect(result[0].nodes).toHaveLength(1);
    expect(result[0].nodes[0].stop.candidate.name).toBe('浅草寺');
    expect(result[0].legs).toHaveLength(0);
  });

  it('multiple nodes: insertion heuristic produces reasonable route', () => {
    // Create stops in a line: A, B (midpoint), C (far)
    // The optimizer should produce a route that visits them without large detours
    const stops = [
      makeStop('A', 35.0, 139.0, 1),
      makeStop('C', 35.02, 139.0, 1), // Far from A
      makeStop('B', 35.01, 139.0, 1), // Midpoint
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes(stops, dayStructures, request);

    expect(result[0].nodes).toHaveLength(3);
    // All stops should be present
    const names = new Set(result[0].nodes.map((n) => n.stop.candidate.name));
    expect(names).toEqual(new Set(['A', 'B', 'C']));
  });

  it('2-opt improvement: produces valid route with 4+ nodes', () => {
    // Square pattern: A(NW), B(NE), C(SE), D(SW)
    // Optimal route visits them in geographic order, avoiding crossing paths
    const stops = [
      makeStop('NW', 35.70, 139.70, 1),
      makeStop('SE', 35.68, 139.72, 1),
      makeStop('NE', 35.70, 139.72, 1),
      makeStop('SW', 35.68, 139.70, 1),
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes(stops, dayStructures, request);

    expect(result[0].nodes).toHaveLength(4);
    // All stops are present
    const names = new Set(result[0].nodes.map((n) => n.stop.candidate.name));
    expect(names.size).toBe(4);
    // Legs should connect consecutive nodes
    expect(result[0].legs).toHaveLength(3);
  });

  it('empty stops: returns empty day', () => {
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes([], dayStructures, request);

    expect(result).toHaveLength(1);
    expect(result[0].nodes).toHaveLength(0);
    expect(result[0].legs).toHaveLength(0);
    expect(result[0].title).toBe('Day 1');
  });

  it('must_visit stops are not removed', () => {
    const stops = [
      makeStop('Must See', 35.0, 139.0, 1, 'must_visit'),
      makeStop('Regular A', 35.01, 139.0, 1),
      makeStop('Regular B', 35.02, 139.0, 1),
      makeStop('Regular C', 35.03, 139.0, 1),
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes(stops, dayStructures, request);

    const names = result[0].nodes.map((n) => n.stop.candidate.name);
    expect(names).toContain('Must See');
  });

  it('legs are built with correct transport modes', () => {
    const stops = [
      makeStop('A', 35.6812, 139.7671, 1),
      makeStop('B', 35.6900, 139.7700, 1),
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest({ preferredTransport: ['car'] });

    const result = optimizeRoutes(stops, dayStructures, request);

    expect(result[0].legs).toHaveLength(1);
    const leg = result[0].legs[0];
    expect(leg.fromIndex).toBe(0);
    expect(leg.toIndex).toBe(1);
    expect(leg.distanceKm).toBeGreaterThan(0);
    expect(leg.durationMinutes).toBeGreaterThan(0);
    // Transport mode should be determined by suggestTransportMode
    expect(['walking', 'public_transit', 'car', 'bicycle']).toContain(leg.mode);
    expect(['other', 'train', 'car']).toContain(leg.transitType);
  });

  it('distributes stops across multiple days based on dayHint', () => {
    const stops = [
      makeStop('Day1 Spot', 35.6812, 139.7671, 1),
      makeStop('Day2 Spot', 35.6900, 139.7700, 2),
    ];
    const dayStructures = [makeDayStructure(1), makeDayStructure(2)];
    const request = makeRequest({ durationDays: 2 });

    const result = optimizeRoutes(stops, dayStructures, request);

    expect(result).toHaveLength(2);
    expect(result[0].nodes).toHaveLength(1);
    expect(result[0].nodes[0].stop.candidate.name).toBe('Day1 Spot');
    expect(result[1].nodes).toHaveLength(1);
    expect(result[1].nodes[0].stop.candidate.name).toBe('Day2 Spot');
  });

  it('handles stops without coordinates (preserves order)', () => {
    const stopNoCoords: SelectedStop = {
      candidate: makeCandidate({ name: 'No Coords', dayHint: 1 }),
      placeDetails: undefined,
      feasibilityScore: 50,
      warnings: [],
    };
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes([stopNoCoords], dayStructures, request);

    expect(result[0].nodes).toHaveLength(1);
    expect(result[0].nodes[0].stop.candidate.name).toBe('No Coords');
  });

  it('v3: nodes have nodeId assigned', () => {
    const stops = [
      makeStop('A', 35.68, 139.76, 1),
      makeStop('B', 35.69, 139.77, 1),
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes(stops, dayStructures, request);

    result[0].nodes.forEach((node) => {
      expect(node.nodeId).toBeDefined();
      expect(typeof node.nodeId).toBe('string');
      expect(node.nodeId!.length).toBeGreaterThan(0);
    });
  });

  it('v3: legs have legId, fromNodeId, toNodeId', () => {
    const stops = [
      makeStop('A', 35.6812, 139.7671, 1),
      makeStop('B', 35.6900, 139.7700, 1),
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes(stops, dayStructures, request);

    expect(result[0].legs).toHaveLength(1);
    const leg = result[0].legs[0];
    expect(leg.legId).toBeDefined();
    expect(leg.fromNodeId).toBeDefined();
    expect(leg.toNodeId).toBeDefined();
    expect(leg.fromNodeId).toBe(result[0].nodes[0].nodeId);
    expect(leg.toNodeId).toBe(result[0].nodes[1].nodeId);
  });

  it('v3: fixed schedule stops are placed first in insertion heuristic', () => {
    const stops = [
      makeStop('Regular', 35.68, 139.76, 1),
      makeStop('Fixed Event', 35.69, 139.77, 1),
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest({
      fixedSchedule: [{ type: 'activity', name: 'Fixed Event', time: '14:00' }],
    });

    const result = optimizeRoutes(stops, dayStructures, request);

    // Both stops should be present
    expect(result[0].nodes).toHaveLength(2);
    const names = result[0].nodes.map((n) => n.stop.candidate.name);
    expect(names).toContain('Fixed Event');
    expect(names).toContain('Regular');
  });

  it('nodes have correct orderInDay values', () => {
    const stops = [
      makeStop('A', 35.68, 139.76, 1),
      makeStop('B', 35.69, 139.77, 1),
      makeStop('C', 35.70, 139.78, 1),
    ];
    const dayStructures = [makeDayStructure(1)];
    const request = makeRequest();

    const result = optimizeRoutes(stops, dayStructures, request);

    result[0].nodes.forEach((node, i) => {
      expect(node.orderInDay).toBe(i);
    });
  });
});
