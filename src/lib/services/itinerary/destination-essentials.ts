import type { DayStructure, NormalizedRequest, SemanticCandidate, TimeSlotHint } from '@/types/itinerary-pipeline';

interface DestinationEssentialSeed {
  canonicalDestination: string;
  aliases: string[];
  essentials: Array<{
    name: string;
    locationEn: string;
    areaHint: string;
    categoryHint: string;
    stayDurationMinutes: number;
    timeSlotHint: TimeSlotHint;
    rationale: string;
  }>;
}

export interface DestinationEssentialCandidate extends SemanticCandidate {
  canonicalDestination: string;
}

const DESTINATION_ESSENTIALS: DestinationEssentialSeed[] = [
  {
    canonicalDestination: 'Paris',
    aliases: ['paris', 'パリ'],
    essentials: [
      {
        name: 'エッフェル塔',
        locationEn: 'Eiffel Tower',
        areaHint: '7区・シャン・ド・マルス周辺',
        categoryHint: 'landmark',
        stayDurationMinutes: 120,
        timeSlotHint: 'morning',
        rationale: '初めてのパリ旅行で外しにくい象徴的ランドマーク。',
      },
      {
        name: 'ルーブル美術館',
        locationEn: 'Louvre Museum',
        areaHint: '1区・ルーブル周辺',
        categoryHint: 'museum',
        stayDurationMinutes: 180,
        timeSlotHint: 'morning',
        rationale: 'パリを代表する美術館で、旅の核になりやすい定番。',
      },
      {
        name: '凱旋門',
        locationEn: 'Arc de Triomphe',
        areaHint: '8区・シャルル・ド・ゴール広場周辺',
        categoryHint: 'landmark',
        stayDurationMinutes: 90,
        timeSlotHint: 'afternoon',
        rationale: 'シャンゼリゼ散策と組み合わせやすい都市景観の要所。',
      },
      {
        name: 'ノートルダム大聖堂',
        locationEn: 'Notre-Dame Cathedral',
        areaHint: 'シテ島周辺',
        categoryHint: 'cathedral',
        stayDurationMinutes: 90,
        timeSlotHint: 'afternoon',
        rationale: 'セーヌ河岸と歴史地区の理解に直結する名所。',
      },
      {
        name: 'サクレ・クール寺院',
        locationEn: 'Sacré-Cœur Basilica',
        areaHint: 'モンマルトル周辺',
        categoryHint: 'church',
        stayDurationMinutes: 90,
        timeSlotHint: 'evening',
        rationale: 'モンマルトル散策と街並み鑑賞の軸になる高台スポット。',
      },
    ],
  },
  {
    canonicalDestination: 'London',
    aliases: ['london', 'ロンドン'],
    essentials: [
      {
        name: 'バッキンガム宮殿',
        locationEn: 'Buckingham Palace',
        areaHint: 'ウェストミンスター周辺',
        categoryHint: 'palace',
        stayDurationMinutes: 90,
        timeSlotHint: 'morning',
        rationale: 'ロンドンらしさを象徴する王室関連の定番。',
      },
      {
        name: '大英博物館',
        locationEn: 'The British Museum',
        areaHint: 'ブルームズベリー周辺',
        categoryHint: 'museum',
        stayDurationMinutes: 180,
        timeSlotHint: 'morning',
        rationale: '都市理解の中心になる代表的ミュージアム。',
      },
      {
        name: 'タワー・ブリッジ',
        locationEn: 'Tower Bridge',
        areaHint: 'タワー・ハムレッツ周辺',
        categoryHint: 'bridge',
        stayDurationMinutes: 75,
        timeSlotHint: 'afternoon',
        rationale: 'ロンドンの景観を象徴する橋。',
      },
      {
        name: 'ウェストミンスター寺院',
        locationEn: 'Westminster Abbey',
        areaHint: 'ウェストミンスター周辺',
        categoryHint: 'church',
        stayDurationMinutes: 90,
        timeSlotHint: 'afternoon',
        rationale: '歴史と政治の文脈がまとまる中心スポット。',
      },
    ],
  },
  {
    canonicalDestination: 'Rome',
    aliases: ['rome', 'roma', 'ローマ'],
    essentials: [
      {
        name: 'コロッセオ',
        locationEn: 'Colosseum',
        areaHint: 'コロッセオ周辺',
        categoryHint: 'historic_site',
        stayDurationMinutes: 120,
        timeSlotHint: 'morning',
        rationale: 'ローマ旅行の定番で、都市イメージを決定づける名所。',
      },
      {
        name: 'フォロ・ロマーノ',
        locationEn: 'Roman Forum',
        areaHint: 'コロッセオ周辺',
        categoryHint: 'historic_site',
        stayDurationMinutes: 120,
        timeSlotHint: 'afternoon',
        rationale: '古代ローマの歴史理解を深める主要遺跡。',
      },
      {
        name: 'トレヴィの泉',
        locationEn: 'Trevi Fountain',
        areaHint: 'トレヴィ地区周辺',
        categoryHint: 'landmark',
        stayDurationMinutes: 60,
        timeSlotHint: 'evening',
        rationale: '中心街回遊の象徴として入れやすい名所。',
      },
      {
        name: 'パンテオン',
        locationEn: 'Pantheon',
        areaHint: 'パンテオン周辺',
        categoryHint: 'historic_site',
        stayDurationMinutes: 75,
        timeSlotHint: 'afternoon',
        rationale: '市内中心部で他名所とつなぎやすい必見建築。',
      },
    ],
  },
];

function normalizeDestination(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s,./\\()（）・]+/g, '');
}

function resolveSeed(destinations: string[]): DestinationEssentialSeed | null {
  const normalizedDestinations = destinations.map(normalizeDestination);

  return (
    DESTINATION_ESSENTIALS.find((seed) =>
      seed.aliases.some((alias) => normalizedDestinations.includes(normalizeDestination(alias)))
    ) ?? null
  );
}

function getEssentialCount(durationDays: number): number {
  if (durationDays <= 1) return 2;
  if (durationDays === 2) return 3;
  if (durationDays <= 4) return 4;
  return 5;
}

function assignDayHint(
  essential: DestinationEssentialSeed['essentials'][number],
  index: number,
  durationDays: number,
  dayStructure?: DayStructure[]
): number {
  if (dayStructure && dayStructure.length > 0) {
    const normalizedArea = normalizeDestination(essential.areaHint);
    const matchedDay = dayStructure.find((day) => {
      const haystack = normalizeDestination(`${day.mainArea} ${day.title} ${day.summary}`);
      return haystack.includes(normalizedArea) || normalizedArea.includes(normalizeDestination(day.mainArea));
    });

    if (matchedDay) {
      return matchedDay.day;
    }
  }

  return Math.min((index % Math.max(durationDays, 1)) + 1, durationDays);
}

function assignRole(index: number, durationDays: number): SemanticCandidate['role'] {
  if (durationDays <= 2) {
    return index < 3 ? 'must_visit' : 'recommended';
  }

  return index < 2 ? 'must_visit' : 'recommended';
}

export function getDestinationEssentialCandidates(input: {
  request: Pick<NormalizedRequest, 'destinations' | 'durationDays'>;
  dayStructure?: DayStructure[];
}): DestinationEssentialCandidate[] {
  const seed = resolveSeed(input.request.destinations);
  if (!seed) {
    return [];
  }

  return seed.essentials
    .slice(0, getEssentialCount(input.request.durationDays))
    .map((essential, index) => ({
      name: essential.name,
      searchQuery: essential.locationEn,
      locationEn: essential.locationEn,
      role: assignRole(index, input.request.durationDays),
      priority: index < 3 ? 10 : 9,
      dayHint: assignDayHint(essential, index, input.request.durationDays, input.dayStructure),
      timeSlotHint: essential.timeSlotHint,
      stayDurationMinutes: essential.stayDurationMinutes,
      categoryHint: essential.categoryHint,
      rationale: essential.rationale,
      areaHint: essential.areaHint,
      tags: ['destination-essential'],
      semanticId: `essential:${seed.canonicalDestination}:${essential.locationEn}`,
      canonicalDestination: seed.canonicalDestination,
    }));
}

export function mergeDestinationEssentialCandidates(input: {
  request: Pick<NormalizedRequest, 'destinations' | 'durationDays'>;
  candidates: SemanticCandidate[];
  dayStructure?: DayStructure[];
  existingCandidates?: SemanticCandidate[];
  day?: number;
}): SemanticCandidate[] {
  const essentials = getDestinationEssentialCandidates({
    request: input.request,
    dayStructure: input.dayStructure,
  }).filter((candidate) => (input.day ? candidate.dayHint === input.day : true));

  if (essentials.length === 0) {
    return input.candidates;
  }

  const seen = new Set(
    [...(input.existingCandidates ?? []), ...input.candidates].flatMap((candidate) => [
      normalizeDestination(candidate.searchQuery),
      normalizeDestination(candidate.name),
      normalizeDestination(candidate.locationEn ?? ''),
    ])
  );

  const additions = essentials.filter((candidate) => {
    const keys = [candidate.searchQuery, candidate.name, candidate.locationEn ?? ''].map(normalizeDestination);
    return keys.every((key) => key.length === 0 || !seen.has(key));
  });

  if (additions.length === 0) {
    return input.candidates;
  }

  return [...additions, ...input.candidates];
}

export function buildDestinationEssentialsPrompt(request: Pick<NormalizedRequest, 'destinations' | 'durationDays'>): string {
  const essentials = getDestinationEssentialCandidates({ request });
  if (essentials.length === 0) {
    return '';
  }

  return [
    '目的地の定番アンカー（初回訪問なら優先的に検討すべき代表スポット）:',
    ...essentials.map((candidate) => `- ${candidate.name} / ${candidate.locationEn} (${candidate.areaHint})`),
  ].join('\n');
}
