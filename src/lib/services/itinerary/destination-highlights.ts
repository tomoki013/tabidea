import type {
  DayStructure,
  DestinationHighlight,
  NormalizedRequest,
  SemanticCandidate,
} from '@/types/itinerary-pipeline';

const GENERIC_NAME_PATTERNS = [
  /の人気.+店$/,
  /の人気.+スポット$/,
  /のおすすめ/,
  /^おすすめ.+$/,
  /^人気.+$/,
  /の代表スポット$/,
  /の夜景スポット$/,
  /の有名.+店$/,
  /周辺の.+スポット$/,
  /popular\s+(lunch|dinner|restaurant|spot)/i,
  /recommended\s+(restaurant|cafe|spot)/i,
];

function normalizePlaceKey(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s,./\\()（）・'-]+/g, '');
}

function isConcreteHighlight(highlight: DestinationHighlight): boolean {
  return !GENERIC_NAME_PATTERNS.some(
    (pattern) => pattern.test(highlight.name) || pattern.test(highlight.searchQuery ?? '')
  );
}

export function sanitizeDestinationHighlights(
  highlights: DestinationHighlight[] | undefined,
  durationDays: number
): DestinationHighlight[] {
  if (!highlights || highlights.length === 0) {
    return [];
  }

  const seen = new Set<string>();

  return highlights
    .filter(isConcreteHighlight)
    .map((highlight) => ({
      ...highlight,
      dayHint: Math.min(Math.max(highlight.dayHint, 1), Math.max(durationDays, 1)),
      searchQuery: highlight.searchQuery?.trim() || highlight.locationEn?.trim() || highlight.name.trim(),
      stayDurationMinutes: highlight.stayDurationMinutes ?? 90,
      timeSlotHint: highlight.timeSlotHint ?? 'flexible',
    }))
    .filter((highlight) => {
      const key = normalizePlaceKey(highlight.searchQuery || highlight.name);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function mergeDestinationHighlightCandidates(input: {
  request: Pick<NormalizedRequest, 'durationDays'>;
  destinationHighlights?: DestinationHighlight[];
  candidates: SemanticCandidate[];
  existingCandidates?: SemanticCandidate[];
  day?: number;
}): SemanticCandidate[] {
  const highlights = sanitizeDestinationHighlights(
    input.destinationHighlights,
    input.request.durationDays
  ).filter((highlight) => (typeof input.day === 'number' ? highlight.dayHint === input.day : true));

  if (highlights.length === 0) {
    return input.candidates;
  }

  const seen = new Set(
    [...(input.existingCandidates ?? []), ...input.candidates].flatMap((candidate) => [
      normalizePlaceKey(candidate.searchQuery),
      normalizePlaceKey(candidate.name),
      normalizePlaceKey(candidate.locationEn ?? ''),
    ])
  );

  const additions: SemanticCandidate[] = [];

  for (const [index, highlight] of highlights.entries()) {
    const keys = [highlight.searchQuery, highlight.name, highlight.locationEn ?? '']
      .filter(Boolean)
      .map((value) => normalizePlaceKey(value));

    if (keys.some((key) => seen.has(key))) {
      continue;
    }

    keys.forEach((key) => seen.add(key));

    additions.push({
      name: highlight.name,
      searchQuery: highlight.searchQuery || highlight.name,
      locationEn: highlight.locationEn,
      role: index < 2 ? 'must_visit' : 'recommended',
      priority: index < 2 ? 10 : 9,
      dayHint: highlight.dayHint,
      timeSlotHint: highlight.timeSlotHint ?? 'flexible',
      stayDurationMinutes: highlight.stayDurationMinutes ?? 90,
      areaHint: highlight.areaHint,
      rationale: highlight.rationale,
      tags: ['destination-highlight'],
      semanticId: crypto.randomUUID(),
    });
  }

  return additions.length > 0 ? [...additions, ...input.candidates] : input.candidates;
}

export function buildDestinationHighlightPromptSections(input: {
  destinationHighlights?: DestinationHighlight[];
  durationDays: number;
  day?: number;
  existingCandidates?: SemanticCandidate[];
}): {
  allHighlightsSection: string;
  remainingHighlightsSection: string;
} {
  const highlights = sanitizeDestinationHighlights(input.destinationHighlights, input.durationDays);

  if (highlights.length === 0) {
    return {
      allHighlightsSection: '- まだありません',
      remainingHighlightsSection: '- まだありません',
    };
  }

  const existing = new Set(
    (input.existingCandidates ?? []).map((candidate) => normalizePlaceKey(candidate.searchQuery))
  );

  const relevantHighlights = typeof input.day === 'number'
    ? highlights.filter((highlight) => highlight.dayHint === input.day)
    : highlights;

  const remainingHighlights = relevantHighlights.filter(
    (highlight) => !existing.has(normalizePlaceKey(highlight.searchQuery || highlight.name))
  );

  return {
    allHighlightsSection: relevantHighlights
      .map(
        (highlight) =>
          `- ${highlight.name} (${highlight.areaHint}, ${highlight.dayHint}日目候補)`
      )
      .join('\n'),
    remainingHighlightsSection:
      remainingHighlights.length > 0
        ? remainingHighlights
            .map(
              (highlight) =>
                `- ${highlight.name} (${highlight.areaHint}, ${highlight.dayHint}日目候補)`
            )
            .join('\n')
        : '- 主要スポットはこの日の候補に入っています',
  };
}

export function assignHighlightDaysFromAreas(
  highlights: DestinationHighlight[] | undefined,
  dayStructure: DayStructure[]
): DestinationHighlight[] {
  const sanitized = sanitizeDestinationHighlights(highlights, dayStructure.length || 1);

  return sanitized.map((highlight, index) => {
    const normalizedArea = normalizePlaceKey(highlight.areaHint);
    const matchedDay = dayStructure.find((day) => {
      const haystack = normalizePlaceKey(`${day.mainArea} ${day.title} ${day.summary}`);
      return haystack.includes(normalizedArea) || normalizedArea.includes(normalizePlaceKey(day.mainArea));
    });

    return {
      ...highlight,
      dayHint: matchedDay?.day ?? highlight.dayHint ?? ((index % Math.max(dayStructure.length, 1)) + 1),
    };
  });
}
