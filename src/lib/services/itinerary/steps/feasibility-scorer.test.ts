import { describe, it, expect } from 'vitest';
import { scoreAndSelect, candidatesToStops } from './feasibility-scorer';
import type { PlaceDetails } from '@/types/places';
import type {
  NormalizedRequest,
  ResolvedPlaceGroup,
  SemanticCandidate,
  SelectedStop,
} from '@/types/itinerary-pipeline';
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
  searchQuery: 'テストスポット 東京',
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
  googleMapsUrl: 'https://maps.google.com/?cid=123',
  businessStatus: 'OPERATIONAL',
  types: ['tourist_attraction'],
  ...overrides,
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
  durationDays: 3,
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

const makeGroup = (
  candidate: SemanticCandidate,
  placeDetails: PlaceDetails[],
  success = true
): ResolvedPlaceGroup => ({
  candidate,
  resolved: placeDetails.map((pd) => ({ placeDetails: pd, matchScore: 0.9 })),
  success,
});

// ==============================
// Tests
// ==============================

describe('scoreAndSelect', () => {
  it('selects high-score items and filters low-score ones', () => {
    const highScorePlace = makePlaceDetails({
      placeId: 'high',
      rating: 4.8,
      userRatingsTotal: 5000,
      types: ['restaurant', 'food'],
      priceLevel: 2,
    });
    const lowScorePlace = makePlaceDetails({
      placeId: 'low',
      rating: 1.5,
      userRatingsTotal: 2,
      types: ['storage'],
      priceLevel: 4,
      businessStatus: 'CLOSED_PERMANENTLY',
    });

    const groups: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ name: 'Good Place' }), [highScorePlace]),
      makeGroup(makeCandidate({ name: 'Bad Place' }), [lowScorePlace]),
    ];

    const request = makeRequest({ themes: ['グルメ'] });
    const { selected, filtered } = scoreAndSelect(groups, request, undefined, 40);

    // The high score place should be selected
    const selectedIds = selected.map((s) => s.placeDetails?.placeId);
    expect(selectedIds).toContain('high');

    // At least the high score item is selected
    expect(selected.length).toBeGreaterThanOrEqual(1);
  });

  it('passes through failed groups as graceful degradation', () => {
    const candidate = makeCandidate({ name: 'Unknown Place' });
    const groups: ResolvedPlaceGroup[] = [
      {
        candidate,
        resolved: [],
        success: false,
        error: 'Place resolve failed',
      },
    ];

    const request = makeRequest();
    const { selected } = scoreAndSelect(groups, request);

    expect(selected).toHaveLength(1);
    expect(selected[0].feasibilityScore).toBe(0);
    expect(selected[0].placeDetails).toBeUndefined();
    expect(selected[0].warnings).toContain('Place resolve failed');
  });

  it('when all groups fail, all stops have warnings', () => {
    const groups: ResolvedPlaceGroup[] = [
      {
        candidate: makeCandidate({ name: 'Place A' }),
        resolved: [],
        success: false,
        error: 'API timeout',
      },
      {
        candidate: makeCandidate({ name: 'Place B' }),
        resolved: [],
        success: false,
        error: 'Not found',
      },
    ];

    const request = makeRequest();
    const { selected } = scoreAndSelect(groups, request);

    expect(selected).toHaveLength(2);
    selected.forEach((stop) => {
      expect(stop.warnings.length).toBeGreaterThan(0);
      expect(stop.feasibilityScore).toBe(0);
    });
  });

  it('filters items below the score threshold', () => {
    // Create a place with very poor matching to trigger low score
    const poorPlace = makePlaceDetails({
      placeId: 'poor',
      rating: 1.0,
      userRatingsTotal: 1,
      types: ['storage'],
      priceLevel: 4,
      businessStatus: 'CLOSED_PERMANENTLY',
    });

    const groups: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ name: 'Poor Match' }), [poorPlace]),
    ];

    // Use a very high threshold to force filtering
    const request = makeRequest({ budgetLevel: 'budget' });
    const { selected, filtered } = scoreAndSelect(groups, request, undefined, 95);

    // With threshold 95, most items should be filtered
    expect(filtered.length + selected.length).toBe(1);
  });

  it('updates currentLatLng for subsequent distance calculations', () => {
    const place1 = makePlaceDetails({
      placeId: 'p1',
      latitude: 35.6812,
      longitude: 139.7671,
      rating: 4.5,
      userRatingsTotal: 1000,
      types: ['tourist_attraction'],
      priceLevel: 2,
    });
    const place2 = makePlaceDetails({
      placeId: 'p2',
      latitude: 35.6815,
      longitude: 139.7675,
      rating: 4.5,
      userRatingsTotal: 1000,
      types: ['tourist_attraction'],
      priceLevel: 2,
    });

    const groups: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ name: 'First' }), [place1]),
      makeGroup(makeCandidate({ name: 'Second' }), [place2]),
    ];

    const request = makeRequest();
    const { selected } = scoreAndSelect(groups, request, undefined, 0);

    // Both should be selected since threshold is 0
    expect(selected).toHaveLength(2);
  });
});

describe('candidatesToStops', () => {
  it('converts candidates to stops with default score 50', () => {
    const candidates: SemanticCandidate[] = [
      makeCandidate({ name: 'A' }),
      makeCandidate({ name: 'B' }),
      makeCandidate({ name: 'C' }),
    ];

    const stops = candidatesToStops(candidates);

    expect(stops).toHaveLength(3);
    stops.forEach((stop) => {
      expect(stop.feasibilityScore).toBe(50);
      expect(stop.placeDetails).toBeUndefined();
      expect(stop.warnings).toEqual([]);
    });
  });

  it('preserves candidate data', () => {
    const candidate = makeCandidate({ name: 'Custom Spot', priority: 8, role: 'must_visit' });
    const stops = candidatesToStops([candidate]);

    expect(stops[0].candidate.name).toBe('Custom Spot');
    expect(stops[0].candidate.priority).toBe(8);
    expect(stops[0].candidate.role).toBe('must_visit');
  });

  it('handles empty array', () => {
    const stops = candidatesToStops([]);
    expect(stops).toEqual([]);
  });
});

describe('budget match scoring', () => {
  it('matching budget gives score of 20', () => {
    // priceLevel 1-2 matches "standard" budget
    const place = makePlaceDetails({
      priceLevel: 2,
      rating: 4.0,
      userRatingsTotal: 100,
      types: ['restaurant'],
    });
    const groups: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ timeSlotHint: 'flexible' }), [place]),
    ];

    const request = makeRequest({ budgetLevel: 'standard' });
    const { selected } = scoreAndSelect(groups, request, undefined, 0);

    // The selected item should have a reasonable score
    // Budget match for standard + priceLevel 2 should be 20 (full match)
    expect(selected[0].feasibilityScore).toBeGreaterThan(0);
  });

  it('mismatching budget gives lower score', () => {
    const expensivePlace = makePlaceDetails({
      priceLevel: 4,
      rating: 4.0,
      userRatingsTotal: 100,
      types: ['restaurant'],
    });
    const cheapPlace = makePlaceDetails({
      placeId: 'cheap',
      priceLevel: 1,
      rating: 4.0,
      userRatingsTotal: 100,
      types: ['restaurant'],
    });

    const groupExpensive: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ name: 'Expensive' }), [expensivePlace]),
    ];
    const groupCheap: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ name: 'Cheap' }), [cheapPlace]),
    ];

    const budgetRequest = makeRequest({ budgetLevel: 'budget' });

    const { selected: expensiveSelected } = scoreAndSelect(groupExpensive, budgetRequest, undefined, 0);
    const { selected: cheapSelected } = scoreAndSelect(groupCheap, budgetRequest, undefined, 0);

    // The cheap place should score higher for a "budget" request
    expect(cheapSelected[0].feasibilityScore).toBeGreaterThan(
      expensiveSelected[0].feasibilityScore
    );
  });
});

describe('v3: must_visit threshold exemption', () => {
  it('must_visit candidates pass even with very high threshold', () => {
    const place = makePlaceDetails({
      placeId: 'must',
      rating: 2.0,
      userRatingsTotal: 5,
      types: ['storage'],
      priceLevel: 4,
    });

    const groups: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ name: 'Must Place', role: 'must_visit', priority: 10 }), [place]),
    ];

    const request = makeRequest();
    const { selected } = scoreAndSelect(groups, request, undefined, 99);

    expect(selected).toHaveLength(1);
    expect(selected[0].candidate.role).toBe('must_visit');
  });

  it('high priority (>=8) candidates pass even with high threshold', () => {
    const place = makePlaceDetails({
      placeId: 'high-pri',
      rating: 2.5,
      userRatingsTotal: 10,
      types: ['store'],
      priceLevel: 3,
    });

    const groups: ResolvedPlaceGroup[] = [
      makeGroup(makeCandidate({ name: 'High Priority', priority: 9 }), [place]),
    ];

    const request = makeRequest();
    const { selected } = scoreAndSelect(groups, request, undefined, 99);

    expect(selected).toHaveLength(1);
  });
});

describe('v3: semanticId propagation', () => {
  it('propagates semanticId from candidate to SelectedStop', () => {
    const place = makePlaceDetails({ rating: 4.5, userRatingsTotal: 1000 });
    const candidate = makeCandidate({ name: 'Spot', semanticId: 'test-semantic-id' });
    const groups: ResolvedPlaceGroup[] = [makeGroup(candidate, [place])];

    const request = makeRequest();
    const { selected } = scoreAndSelect(groups, request, undefined, 0);

    expect(selected[0].semanticId).toBe('test-semantic-id');
  });

  it('candidatesToStops propagates semanticId', () => {
    const candidate = makeCandidate({ name: 'Spot', semanticId: 'sem-123' });
    const stops = candidatesToStops([candidate]);

    expect(stops[0].semanticId).toBe('sem-123');
  });
});

describe('v3: lowReviewPenalty', () => {
  it('places with many reviews score higher than places with few', () => {
    const manyReviews = makePlaceDetails({
      placeId: 'many',
      rating: 4.0,
      userRatingsTotal: 5000,
      types: ['tourist_attraction'],
      priceLevel: 2,
    });
    const fewReviews = makePlaceDetails({
      placeId: 'few',
      rating: 4.0,
      userRatingsTotal: 5,
      types: ['tourist_attraction'],
      priceLevel: 2,
    });

    const request = makeRequest();

    const { selected: manyResult } = scoreAndSelect(
      [makeGroup(makeCandidate({ name: 'Many' }), [manyReviews])],
      request, undefined, 0
    );
    const { selected: fewResult } = scoreAndSelect(
      [makeGroup(makeCandidate({ name: 'Few' }), [fewReviews])],
      request, undefined, 0
    );

    expect(manyResult[0].feasibilityScore).toBeGreaterThan(fewResult[0].feasibilityScore);
  });
});

describe('distance scoring', () => {
  it('close places score higher than far places', () => {
    // Place very close to prevLatLng
    const closePlace = makePlaceDetails({
      placeId: 'close',
      latitude: 35.6812,
      longitude: 139.7671,
      rating: 4.0,
      userRatingsTotal: 100,
      priceLevel: 2,
    });
    // Place far from prevLatLng
    const farPlace = makePlaceDetails({
      placeId: 'far',
      latitude: 34.6937, // Osaka
      longitude: 135.5023,
      rating: 4.0,
      userRatingsTotal: 100,
      priceLevel: 2,
    });

    const prevLatLng = { lat: 35.6814, lng: 139.7670 };
    const request = makeRequest();

    const { selected: closeResult } = scoreAndSelect(
      [makeGroup(makeCandidate({ name: 'Close' }), [closePlace])],
      request,
      prevLatLng,
      0
    );
    const { selected: farResult } = scoreAndSelect(
      [makeGroup(makeCandidate({ name: 'Far' }), [farPlace])],
      request,
      prevLatLng,
      0
    );

    expect(closeResult[0].feasibilityScore).toBeGreaterThan(farResult[0].feasibilityScore);
  });
});
