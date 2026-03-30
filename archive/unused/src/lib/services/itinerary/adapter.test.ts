import { describe, it, expect } from 'vitest';
import { composedToItinerary } from './adapter';
import type {
  ComposedItinerary,
  NarrativeDay,
  NarrativeActivity,
  TimelineNode,
  RouteLeg,
  SelectedStop,
  SemanticCandidate,
  ComposePipelineMetadata,
} from '@/types/itinerary-pipeline';
import type { PlaceDetails } from '@/types/places';
import type { ModelInfo } from '@/types/itinerary';

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
  ...overrides,
});

const makeStop = (
  name: string,
  role: SemanticCandidate['role'] = 'recommended',
  placeDetails?: PlaceDetails
): SelectedStop => ({
  candidate: makeCandidate({ name, role, searchQuery: name }),
  placeDetails,
  feasibilityScore: 70,
  warnings: [],
});

const makeTimelineNode = (
  stop: SelectedStop,
  arrivalTime: string,
  departureTime: string,
  stayMinutes = 60
): TimelineNode => ({
  stop,
  arrivalTime,
  departureTime,
  stayMinutes,
  warnings: [],
});

const makeNarrativeActivity = (
  node: TimelineNode,
  overrides: Partial<NarrativeActivity> = {}
): NarrativeActivity => ({
  node,
  description: `${node.stop.candidate.name}の説明`,
  activityName: node.stop.candidate.name,
  ...overrides,
});

const makeLeg = (overrides: Partial<RouteLeg> = {}): RouteLeg => ({
  fromIndex: 0,
  toIndex: 1,
  distanceKm: 5.0,
  durationMinutes: 20,
  mode: 'public_transit',
  transitType: 'train',
  ...overrides,
});

const makeMetadata = (): ComposePipelineMetadata => ({
  pipelineVersion: 'v2',
  candidateCount: 10,
  resolvedCount: 8,
  filteredCount: 2,
  placeResolveEnabled: true,
  stepTimings: {},
  modelName: 'gemini-2.5-flash',
  modelTier: 'flash',
});

const makeComposed = (days: NarrativeDay[], overrides: Partial<ComposedItinerary> = {}): ComposedItinerary => ({
  destination: '東京',
  description: '東京の観光プラン',
  days,
  warnings: [],
  metadata: makeMetadata(),
  ...overrides,
});

// ==============================
// Tests
// ==============================

describe('composedToItinerary', () => {
  it('basic conversion produces valid Itinerary', () => {
    const stop = makeStop('浅草寺');
    const node = makeTimelineNode(stop, '08:00', '09:00');
    const activity = makeNarrativeActivity(node);

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1: 東京下町散策',
      activities: [activity],
      legs: [],
      overnightLocation: '東京',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    expect(itinerary.id).toBeTruthy();
    expect(itinerary.destination).toBe('東京');
    expect(itinerary.description).toBe('東京の観光プラン');
    expect(itinerary.days).toHaveLength(1);
    expect(itinerary.days[0].day).toBe(1);
    expect(itinerary.days[0].title).toBe('Day 1: 東京下町散策');
    expect(itinerary.completionLevel).toBe('draft_only');
    expect(itinerary.memoryApplied).toBe(false);
    expect(itinerary.verificationSummary).toEqual({
      verifiedActivities: 0,
      partialActivities: 0,
      unknownActivities: 1,
      needsConfirmationCount: 1,
    });
    expect(itinerary.days[0].activities[0].verificationStatus).toBe('unknown');
    expect(itinerary.days[0].activities[0].needsConfirmation).toBe(true);
    expect(itinerary.days[0].blocks).toHaveLength(1);
    expect(itinerary.days[0].blocks?.[0].type).toBe('sightseeing');
  });

  it('day conversion: produces correct activities and timeline items', () => {
    const stop1 = makeStop('金閣寺');
    const stop2 = makeStop('清水寺');
    const node1 = makeTimelineNode(stop1, '08:00', '09:30', 90);
    const node2 = makeTimelineNode(stop2, '10:00', '11:30', 90);

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node1), makeNarrativeActivity(node2)],
      legs: [makeLeg({ fromIndex: 0, toIndex: 1, durationMinutes: 30 })],
      overnightLocation: '京都',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const dayPlan = itinerary.days[0];
    expect(dayPlan.activities).toHaveLength(2);
    expect(dayPlan.activities[0].time).toBe('08:00');
    expect(dayPlan.activities[0].activity).toBe('金閣寺');
    expect(dayPlan.activities[1].time).toBe('10:00');
    expect(dayPlan.activities[1].activity).toBe('清水寺');

    // Timeline items: activity, transit, activity
    expect(dayPlan.timelineItems).toBeDefined();
    expect(dayPlan.timelineItems!).toHaveLength(3);
    expect(dayPlan.timelineItems![0].itemType).toBe('activity');
    expect(dayPlan.timelineItems![1].itemType).toBe('transit');
    expect(dayPlan.timelineItems![2].itemType).toBe('activity');
  });

  it('transit info: leg conversion produces departure/arrival data', () => {
    const place1 = makePlaceDetails({ placeId: 'p1', name: 'Place A' });
    const place2 = makePlaceDetails({ placeId: 'p2', name: 'Place B' });
    const stop1 = makeStop('A', 'recommended', place1);
    const stop2 = makeStop('B', 'recommended', place2);
    const node1 = makeTimelineNode(stop1, '08:00', '09:00');
    const node2 = makeTimelineNode(stop2, '09:30', '10:30');

    const leg = makeLeg({
      distanceKm: 3.5,
      durationMinutes: 15,
      mode: 'walking',
    });

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node1), makeNarrativeActivity(node2)],
      legs: [leg],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const transitItem = itinerary.days[0].timelineItems!.find(
      (item) => item.itemType === 'transit'
    );
    expect(transitItem).toBeDefined();
    if (transitItem?.itemType === 'transit') {
      const transit = transitItem.data;
      expect(transit.type).toBe('walking');
      expect(transit.departure.place).toBe('Place A');
      expect(transit.departure.time).toBe('09:00');
      expect(transit.arrival.place).toBe('Place B');
      expect(transit.arrival.time).toBe('09:30');
      expect(transit.duration).toBe('15min');
      expect(transit.memo).toContain('徒歩');
      expect(transit.memo).toContain('3.5km');
    }
  });

  it('hero image data is passed through', () => {
    const composed = makeComposed([], {
      heroImage: {
        url: 'https://images.unsplash.com/photo-123',
        photographer: 'John Doe',
        photographerUrl: 'https://unsplash.com/@johndoe',
      },
    });

    const itinerary = composedToItinerary(composed);

    expect(itinerary.heroImage).toBe('https://images.unsplash.com/photo-123');
    expect(itinerary.heroImagePhotographer).toBe('John Doe');
    expect(itinerary.heroImagePhotographerUrl).toBe('https://unsplash.com/@johndoe');
  });

  it('hero image undefined when not provided', () => {
    const composed = makeComposed([]);
    const itinerary = composedToItinerary(composed);

    expect(itinerary.heroImage).toBeUndefined();
    expect(itinerary.heroImagePhotographer).toBeUndefined();
    expect(itinerary.heroImagePhotographerUrl).toBeUndefined();
  });

  it('activity types: meal/accommodation/spot role mapping', () => {
    const mealStop = makeStop('ラーメン屋', 'meal');
    const accomStop = makeStop('ホテル', 'accommodation');
    const spotStop = makeStop('浅草寺', 'must_visit');
    const fillerStop = makeStop('カフェ', 'filler');

    const nodes = [
      makeTimelineNode(mealStop, '12:00', '13:00'),
      makeTimelineNode(accomStop, '21:00', '22:00'),
      makeTimelineNode(spotStop, '08:00', '09:00'),
      makeTimelineNode(fillerStop, '15:00', '16:00'),
    ];

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: nodes.map((n) => makeNarrativeActivity(n)),
      legs: [],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const activities = itinerary.days[0].activities;
    expect(activities[0].activityType).toBe('meal');
    expect(activities[1].activityType).toBe('accommodation');
    expect(activities[2].activityType).toBe('spot');
    expect(activities[3].activityType).toBe('spot'); // filler maps to spot
  });

  it('validation data populated from placeDetails', () => {
    const place = makePlaceDetails({
      placeId: 'test-place',
      formattedAddress: '京都市東山区',
      rating: 4.5,
      userRatingsTotal: 1200,
      latitude: 34.9949,
      longitude: 135.7850,
      googleMapsUrl: 'https://maps.google.com/?cid=456',
      openingHours: {
        weekdayText: ['月: 09:00-17:00'],
      },
    });

    const stop = makeStop('清水寺', 'recommended', place);
    const node = makeTimelineNode(stop, '10:00', '11:30');

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node)],
      legs: [],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const activity = itinerary.days[0].activities[0];
    expect(activity.validation).toBeDefined();
    expect(activity.validation!.isVerified).toBe(true);
    expect(activity.validation!.confidence).toBe('high');
    expect(activity.validation!.source).toBe('google_places');
    expect(activity.validation!.placeId).toBe('test-place');
    expect(activity.validation!.details).toBeDefined();
    expect(activity.validation!.details!.address).toBe('京都市東山区');
    expect(activity.validation!.details!.rating).toBe(4.5);
    expect(activity.validation!.details!.reviewCount).toBe(1200);
    expect(activity.validation!.details!.latitude).toBe(34.9949);
    expect(activity.validation!.details!.longitude).toBe(135.7850);
    expect(activity.validation!.details!.googleMapsUrl).toBe('https://maps.google.com/?cid=456');
    expect(activity.validation!.details!.openingHours).toEqual(['月: 09:00-17:00']);
  });

  it('no validation when placeDetails is undefined', () => {
    const stop = makeStop('Unknown Spot');
    const node = makeTimelineNode(stop, '10:00', '11:00');

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node)],
      legs: [],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    expect(itinerary.days[0].activities[0].validation).toBeUndefined();
  });

  it('modelInfo is passed through', () => {
    const modelInfo: ModelInfo = {
      modelName: 'gemini-2.5-pro',
      tier: 'pro',
    };

    const composed = makeComposed([]);
    const itinerary = composedToItinerary(composed, modelInfo);

    expect(itinerary.modelInfo).toEqual(modelInfo);
  });

  it('modelInfo is undefined when not provided', () => {
    const composed = makeComposed([]);
    const itinerary = composedToItinerary(composed);

    expect(itinerary.modelInfo).toBeUndefined();
  });

  it('locationEn from candidate takes priority over placeDetails name', () => {
    const place = makePlaceDetails({ name: 'Kinkaku-ji Temple' });
    const stop: SelectedStop = {
      candidate: makeCandidate({
        name: '金閣寺',
        locationEn: 'Golden Pavilion',
        searchQuery: '金閣寺',
      }),
      placeDetails: place,
      feasibilityScore: 70,
      warnings: [],
    };
    const node = makeTimelineNode(stop, '08:00', '09:00');

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node)],
      legs: [],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    expect(itinerary.days[0].activities[0].locationEn).toBe('Golden Pavilion');
  });

  it('locationEn falls back to placeDetails name when candidate has none', () => {
    const place = makePlaceDetails({ name: 'Kinkaku-ji Temple' });
    const stop: SelectedStop = {
      candidate: makeCandidate({ name: '金閣寺', locationEn: undefined }),
      placeDetails: place,
      feasibilityScore: 70,
      warnings: [],
    };
    const node = makeTimelineNode(stop, '08:00', '09:00');

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node)],
      legs: [],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    expect(itinerary.days[0].activities[0].locationEn).toBe('Kinkaku-ji Temple');
  });


  it('grounds abstract activity names to the canonical place name', () => {
    const place = makePlaceDetails({ name: 'Place des Vosges' });
    const stop: SelectedStop = {
      candidate: makeCandidate({
        name: 'ヴォージュ広場',
        searchQuery: 'Place des Vosges',
        activityLabel: 'Place des Vosgesを歩く',
      }),
      placeDetails: place,
      feasibilityScore: 70,
      warnings: [],
    };
    const node = makeTimelineNode(stop, '09:00', '10:00');

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node, { activityName: 'パリ最古の広場を散策' })],
      legs: [],
      overnightLocation: '',
    };

    const itinerary = composedToItinerary(makeComposed([day]));

    expect(itinerary.days[0].activities[0].activity).toBe('Place des Vosgesを歩く');
  });

  it('transit duration formats correctly for hours and minutes', () => {
    const stop1 = makeStop('A', 'recommended', makePlaceDetails({ name: 'A' }));
    const stop2 = makeStop('B', 'recommended', makePlaceDetails({ name: 'B' }));
    const node1 = makeTimelineNode(stop1, '08:00', '09:00');
    const node2 = makeTimelineNode(stop2, '11:30', '12:30');

    const leg = makeLeg({ durationMinutes: 150, distanceKm: 100 });

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node1), makeNarrativeActivity(node2)],
      legs: [leg],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const transitItem = itinerary.days[0].timelineItems!.find(
      (item) => item.itemType === 'transit'
    );
    if (transitItem?.itemType === 'transit') {
      expect(transitItem.data.duration).toBe('2h 30m');
    }
  });

  it('v3: nodeId and semanticId are stored in activity metadata', () => {
    const stop = makeStop('浅草寺');
    const node: TimelineNode = {
      ...makeTimelineNode(stop, '08:00', '09:00'),
      nodeId: 'node-abc',
      semanticId: 'sem-xyz',
    };

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node)],
      legs: [],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const activity = itinerary.days[0].activities[0];
    expect(activity.metadata).toBeDefined();
    expect(activity.metadata!.nodeId).toBe('node-abc');
    expect(activity.metadata!.semanticId).toBe('sem-xyz');
  });

  it('v3: metadata is empty object when nodeId/semanticId not provided', () => {
    const stop = makeStop('浅草寺');
    const node = makeTimelineNode(stop, '08:00', '09:00');

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node)],
      legs: [],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const activity = itinerary.days[0].activities[0];
    expect(activity.metadata).toEqual({});
  });

  it('transit for car mode has correct transit type', () => {
    const stop1 = makeStop('A', 'recommended', makePlaceDetails({ name: 'A' }));
    const stop2 = makeStop('B', 'recommended', makePlaceDetails({ name: 'B' }));
    const node1 = makeTimelineNode(stop1, '08:00', '09:00');
    const node2 = makeTimelineNode(stop2, '10:00', '11:00');

    const leg = makeLeg({ mode: 'car', durationMinutes: 60 });

    const day: NarrativeDay = {
      day: 1,
      title: 'Day 1',
      activities: [makeNarrativeActivity(node1), makeNarrativeActivity(node2)],
      legs: [leg],
      overnightLocation: '',
    };

    const composed = makeComposed([day]);
    const itinerary = composedToItinerary(composed);

    const transitItem = itinerary.days[0].timelineItems!.find(
      (item) => item.itemType === 'transit'
    );
    if (transitItem?.itemType === 'transit') {
      expect(transitItem.data.type).toBe('car');
      expect(transitItem.data.memo).toContain('車');
    }
  });
});
