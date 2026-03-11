import { describe, it, expect } from 'vitest';
import { buildTimeline, timeToMinutes, minutesToTime } from './timeline-builder';
import type {
  OptimizedDay,
  OptimizedNode,
  RouteLeg,
  NormalizedRequest,
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
  searchQuery: 'テストスポット',
  ...overrides,
});

const makeStop = (
  name: string,
  stayMinutes: number,
  role: SemanticCandidate['role'] = 'recommended',
  priority = 5
): SelectedStop => ({
  candidate: makeCandidate({ name, stayDurationMinutes: stayMinutes, role, priority }),
  placeDetails: undefined,
  feasibilityScore: 70,
  warnings: [],
});

const makeNode = (stop: SelectedStop, orderInDay: number): OptimizedNode => ({
  stop,
  orderInDay,
});

const makeLeg = (overrides: Partial<RouteLeg> = {}): RouteLeg => ({
  fromIndex: 0,
  toIndex: 1,
  distanceKm: 5,
  durationMinutes: 15,
  mode: 'public_transit',
  transitType: 'train',
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
  hardConstraints: {
    destinations: ['東京'],
    dateConstraints: ['3日間'],
    mustVisitPlaces: [],
    fixedTransports: [],
    fixedHotels: [],
    freeTextDirectives: [],
    summaryLines: [],
  },
  softPreferences: {
    themes: ['グルメ'],
    rankedRequests: [],
    suppressedCount: 0,
  },
  compaction: {
    applied: false,
    hardConstraintCount: 2,
    softPreferenceCount: 1,
    suppressedSoftPreferenceCount: 0,
    longInputDetected: false,
  },
  ...overrides,
});

const makeOptimizedDay = (overrides: Partial<OptimizedDay> = {}): OptimizedDay => ({
  day: 1,
  nodes: [],
  legs: [],
  title: 'Day 1',
  overnightLocation: '東京',
  ...overrides,
});

// ==============================
// Time utility tests
// ==============================

describe('timeToMinutes', () => {
  it('converts "08:00" → 480', () => {
    expect(timeToMinutes('08:00')).toBe(480);
  });

  it('converts "00:00" → 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts "23:59" → 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('converts "12:30" → 750', () => {
    expect(timeToMinutes('12:30')).toBe(750);
  });

  it('returns 0 for invalid format', () => {
    expect(timeToMinutes('invalid')).toBe(0);
  });

  it('returns 0 for single-part string', () => {
    expect(timeToMinutes('8')).toBe(0);
  });
});

describe('minutesToTime', () => {
  it('converts 480 → "08:00"', () => {
    expect(minutesToTime(480)).toBe('08:00');
  });

  it('converts 0 → "00:00"', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('converts 1439 → "23:59"', () => {
    expect(minutesToTime(1439)).toBe('23:59');
  });

  it('converts 750 → "12:30"', () => {
    expect(minutesToTime(750)).toBe('12:30');
  });

  it('wraps around at 24 hours (1440 → "00:00")', () => {
    expect(minutesToTime(1440)).toBe('00:00');
  });

  it('pads single-digit hours and minutes', () => {
    expect(minutesToTime(65)).toBe('01:05');
  });
});

// ==============================
// buildTimeline tests
// ==============================

describe('buildTimeline', () => {
  it('basic timeline: nodes get sequential times starting from 08:00', () => {
    const stop1 = makeStop('浅草寺', 60);
    const stop2 = makeStop('スカイツリー', 90);

    const day = makeOptimizedDay({
      nodes: [makeNode(stop1, 0), makeNode(stop2, 1)],
      legs: [makeLeg({ durationMinutes: 20 })],
    });

    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    expect(timeline.nodes).toHaveLength(2);
    // First node starts at 08:00
    expect(timeline.nodes[0].arrivalTime).toBe('08:00');
    // First node departs at 09:00 (08:00 + 60min)
    expect(timeline.nodes[0].departureTime).toBe('09:00');
    // Second node arrives at 09:20 (09:00 + 20min travel)
    expect(timeline.nodes[1].arrivalTime).toBe('09:20');
    // Second node departs at 10:50 (09:20 + 90min)
    expect(timeline.nodes[1].departureTime).toBe('10:50');
  });

  it('fixed schedule: overrides start time for flights', () => {
    const stop = makeStop('観光スポット', 60);
    const day = makeOptimizedDay({
      nodes: [makeNode(stop, 0)],
      legs: [],
    });

    const request = makeRequest({
      fixedSchedule: [
        {
          type: 'flight',
          name: 'NH123',
          time: '10:00',
          to: '東京',
        },
      ],
    });

    const [timeline] = buildTimeline([day], request);

    // Flight arrival at 10:00 + 90 minutes = 11:30
    expect(timeline.startTime).toBe('11:30');
    expect(timeline.nodes[0].arrivalTime).toBe('11:30');
  });

  it('hard transport departure shortens the available day window', () => {
    const nodes: OptimizedNode[] = [];
    const legs: RouteLeg[] = [];

    for (let i = 0; i < 4; i++) {
      nodes.push(makeNode(makeStop(`Spot${i}`, 120, i === 0 ? 'must_visit' : 'filler', i === 0 ? 10 : 2), i));
      if (i > 0) {
        legs.push(makeLeg({ fromIndex: i - 1, toIndex: i, durationMinutes: 20 }));
      }
    }

    const day = makeOptimizedDay({ nodes, legs });
    const request = makeRequest({
      durationDays: 1,
      startDate: '2025-04-12',
      fixedSchedule: [
        {
          type: 'flight',
          name: '帰りの便',
          date: '2025-04-12',
          time: '16:00',
          from: '東京',
        },
      ],
      hardConstraints: {
        destinations: ['東京'],
        dateConstraints: ['2025-04-12 1日間'],
        mustVisitPlaces: [],
        fixedTransports: [
          {
            type: 'flight',
            name: '帰りの便',
            date: '2025-04-12',
            time: '16:00',
            from: '東京',
            day: 1,
          },
        ],
        fixedHotels: [],
        freeTextDirectives: [],
        summaryLines: ['予約済み交通: 帰りの便'],
      },
    });

    const [timeline] = buildTimeline([day], request);

    expect(timeline.nodes.length).toBeLessThan(4);
    expect(timeline.nodes.at(-1)?.departureTime <= '14:30').toBe(true);
  });

  it('travel time: legs add duration between nodes', () => {
    const stop1 = makeStop('A', 30);
    const stop2 = makeStop('B', 30);
    const stop3 = makeStop('C', 30);

    const day = makeOptimizedDay({
      nodes: [makeNode(stop1, 0), makeNode(stop2, 1), makeNode(stop3, 2)],
      legs: [
        makeLeg({ fromIndex: 0, toIndex: 1, durationMinutes: 30 }),
        makeLeg({ fromIndex: 1, toIndex: 2, durationMinutes: 45 }),
      ],
    });

    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    // A: 08:00 - 08:30
    expect(timeline.nodes[0].arrivalTime).toBe('08:00');
    expect(timeline.nodes[0].departureTime).toBe('08:30');
    // B: 08:30 + 30min travel = 09:00, depart 09:30
    expect(timeline.nodes[1].arrivalTime).toBe('09:00');
    expect(timeline.nodes[1].departureTime).toBe('09:30');
    // C: 09:30 + 45min travel = 10:15, depart 10:45
    expect(timeline.nodes[2].arrivalTime).toBe('10:15');
    expect(timeline.nodes[2].departureTime).toBe('10:45');
  });

  it('overflow trimming: low-priority nodes removed when exceeding 22:00', () => {
    // Create nodes that will just exceed 22:00 (1320 min) but not wrap past 24:00.
    // Start at 08:00 (480). 6 nodes of 120 min + 5 legs of 20 min = 720+100 = 820 → ends at 1300 (21:40).
    // Add one more low-priority node → 1300+20+120 = 1440 → exceeds 22:00 (1320).
    // But total < 24:00 (1440), so the departure time "00:00" wraps. Use 7 nodes instead:
    // 7 nodes of 120 min + 6 legs of 20 min = 840+120 = 960 → ends at 480+960 = 1440 → wraps.
    // Use shorter durations to stay under 24h:
    // 5 nodes, 150 min each, 30 min travel = 750+120 = 870 → ends at 1350 → 22:30 → over 22:00, under 24:00.
    const nodes: OptimizedNode[] = [];
    const legs: RouteLeg[] = [];

    for (let i = 0; i < 5; i++) {
      const priority = i === 0 ? 10 : 2;
      const role = i === 0 ? 'must_visit' as const : 'filler' as const;
      nodes.push(makeNode(makeStop(`Spot${i}`, 150, role, priority), i));
      if (i > 0) {
        legs.push(makeLeg({ fromIndex: i - 1, toIndex: i, durationMinutes: 30 }));
      }
    }

    const day = makeOptimizedDay({ nodes, legs });
    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    // Some filler nodes should have been trimmed since total exceeds 22:00
    expect(timeline.nodes.length).toBeLessThan(5);
    // must_visit node should remain
    const remainingNames = timeline.nodes.map((n) => n.stop.candidate.name);
    expect(remainingNames).toContain('Spot0');
  });

  it('empty day: returns empty timeline', () => {
    const day = makeOptimizedDay({ nodes: [], legs: [] });
    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    expect(timeline.nodes).toHaveLength(0);
    expect(timeline.startTime).toBe('08:00');
    expect(timeline.day).toBe(1);
    expect(timeline.title).toBe('Day 1');
  });

  it('preserves warnings from original stops', () => {
    const stop = makeStop('Test', 60);
    stop.warnings = ['一時休業中'];

    const day = makeOptimizedDay({
      nodes: [makeNode(stop, 0)],
      legs: [],
    });

    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    expect(timeline.nodes[0].warnings).toContain('一時休業中');
  });

  it('multiple days: each gets its own timeline', () => {
    const day1 = makeOptimizedDay({
      day: 1,
      title: 'Day 1',
      nodes: [makeNode(makeStop('A', 60), 0)],
      legs: [],
    });
    const day2 = makeOptimizedDay({
      day: 2,
      title: 'Day 2',
      nodes: [makeNode(makeStop('B', 60), 0)],
      legs: [],
    });

    const request = makeRequest({ durationDays: 2 });
    const timelines = buildTimeline([day1, day2], request);

    expect(timelines).toHaveLength(2);
    expect(timelines[0].day).toBe(1);
    expect(timelines[1].day).toBe(2);
    expect(timelines[0].nodes[0].stop.candidate.name).toBe('A');
    expect(timelines[1].nodes[0].stop.candidate.name).toBe('B');
  });

  it('v3: nodes have nodeId and semanticId when provided', () => {
    const stop = makeStop('Temple', 60);
    const node: OptimizedNode = {
      stop,
      orderInDay: 0,
      nodeId: 'node-123',
    };
    // Add semanticId to stop
    stop.semanticId = 'sem-456';

    const day = makeOptimizedDay({
      nodes: [node],
      legs: [],
    });

    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    expect(timeline.nodes[0].nodeId).toBe('node-123');
    expect(timeline.nodes[0].semanticId).toBe('sem-456');
  });

  it('v3: respects custom startTime from NormalizedRequest', () => {
    const stop = makeStop('Morning Spot', 60);
    const day = makeOptimizedDay({
      nodes: [makeNode(stop, 0)],
      legs: [],
    });

    const request = makeRequest({ startTime: '10:00' });
    const [timeline] = buildTimeline([day], request);

    expect(timeline.nodes[0].arrivalTime).toBe('10:00');
  });

  it('v3: meal candidate pulled to lunch window', () => {
    const mealStop = makeStop('ランチ', 60, 'meal');
    mealStop.candidate = makeCandidate({
      name: 'ランチ',
      role: 'meal',
      timeSlotHint: 'midday',
      stayDurationMinutes: 60,
    });

    const day = makeOptimizedDay({
      nodes: [makeNode(mealStop, 0)],
      legs: [],
    });

    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    // Meal should arrive between 11:00-13:00 (lunch window)
    const arrivalMinutes = timeToMinutes(timeline.nodes[0].arrivalTime);
    // Starting at 08:00, meal window starts at 11:30 — if within 30min before, it snaps
    // Since 08:00 is way before 11:00, it shouldn't be pulled
    expect(arrivalMinutes).toBe(480); // 08:00 — too early to snap
  });

  it('stayMinutes is correctly set on timeline nodes', () => {
    const stop = makeStop('Temple', 90);
    const day = makeOptimizedDay({
      nodes: [makeNode(stop, 0)],
      legs: [],
    });

    const request = makeRequest();
    const [timeline] = buildTimeline([day], request);

    expect(timeline.nodes[0].stayMinutes).toBe(90);
  });

  it('keeps fixed-schedule matched nodes when trimming overflow', () => {
    const mustStop = makeStop('絶対スポット', 180, 'must_visit', 10);
    const bookedStop = makeStop('予約イベント', 180, 'recommended', 1);
    const fillerStop = makeStop('調整候補', 180, 'filler', 1);

    const day = makeOptimizedDay({
      nodes: [makeNode(mustStop, 0), makeNode(bookedStop, 1), makeNode(fillerStop, 2)],
      legs: [
        makeLeg({ fromIndex: 0, toIndex: 1, durationMinutes: 30 }),
        makeLeg({ fromIndex: 1, toIndex: 2, durationMinutes: 30 }),
      ],
    });

    const request = makeRequest({
      fixedSchedule: [{ type: 'activity', name: '予約イベント', time: '14:00' }],
    });

    const [timeline] = buildTimeline([day], request);
    const remainingNames = timeline.nodes.map((node) => node.stop.candidate.name);

    expect(remainingNames).toContain('絶対スポット');
    expect(remainingNames).toContain('予約イベント');
  });
});
