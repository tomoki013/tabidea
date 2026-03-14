import type { NormalizedRequest, SemanticPlan } from '@/types/itinerary-pipeline';

const DESTINATION_FALLBACK_CANDIDATES: Record<string, Array<{
  name: string;
  role: 'recommended' | 'meal';
  timeSlotHint: 'morning' | 'midday' | 'afternoon' | 'evening';
  stayDurationMinutes: number;
  searchQuery: string;
  areaHint: string;
}>> = {
  東京: [
    { name: '浅草寺', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '浅草寺', areaHint: '浅草' },
    { name: '東京スカイツリー', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 120, searchQuery: '東京スカイツリー', areaHint: '押上' },
    { name: 'すみだ北斎美術館', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 75, searchQuery: 'すみだ北斎美術館', areaHint: '両国' },
    { name: '築地場外市場で海鮮ランチ', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 75, searchQuery: '築地場外市場 海鮮', areaHint: '築地' },
    { name: '渋谷スクランブルスクエア展望台', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 75, searchQuery: '渋谷スカイ', areaHint: '渋谷' },
  ],
  京都: [
    { name: '清水寺', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '清水寺', areaHint: '東山' },
    { name: '伏見稲荷大社', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '伏見稲荷大社', areaHint: '伏見' },
    { name: '錦市場で京グルメ食べ歩き', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 60, searchQuery: '錦市場', areaHint: '四条河原町' },
    { name: '嵐山竹林の小径', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 75, searchQuery: '嵐山竹林の小径', areaHint: '嵐山' },
    { name: '祇園白川の夜散策', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 60, searchQuery: '祇園白川', areaHint: '祇園' },
  ],
  大阪: [
    { name: '大阪城天守閣', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '大阪城天守閣', areaHint: '大阪城公園' },
    { name: '黒門市場で食べ歩き', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 75, searchQuery: '黒門市場', areaHint: '日本橋' },
    { name: '新世界・通天閣エリア散策', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 90, searchQuery: '通天閣', areaHint: '新世界' },
    { name: '道頓堀リバーサイド散策', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 60, searchQuery: '道頓堀', areaHint: 'ミナミ' },
    { name: '梅田スカイビル空中庭園展望台', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 60, searchQuery: '梅田スカイビル', areaHint: '梅田' },
  ],
  札幌: [
    { name: '大通公園', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 60, searchQuery: '大通公園', areaHint: '大通' },
    { name: '札幌市時計台', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 45, searchQuery: '札幌市時計台', areaHint: '大通' },
    { name: '二条市場で海鮮丼ランチ', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 60, searchQuery: '二条市場 海鮮丼', areaHint: '狸小路' },
    { name: '白い恋人パーク', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 90, searchQuery: '白い恋人パーク', areaHint: '宮の沢' },
    { name: '藻岩山ロープウェイ夜景', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 90, searchQuery: '藻岩山ロープウェイ', areaHint: '藻岩山' },
  ],
};

export function buildDeterministicSemanticPlan(request: NormalizedRequest): SemanticPlan {
  const destination = request.destinations[0] ?? (request.region === 'domestic' ? '日本' : '海外');
  const baseThemes = request.themes.length > 0 ? request.themes : ['観光'];

  const dayStructure = Array.from({ length: request.durationDays }, (_, idx) => ({
    day: idx + 1,
    title: `${idx + 1}日目の${destination}散策`,
    mainArea: destination,
    overnightLocation: destination,
    summary: `${destination}を無理なく巡るプラン`,
  }));

  const mustVisits = request.mustVisitPlaces.map((place, index) => ({
    name: place,
    role: 'must_visit' as const,
    priority: 10,
    dayHint: Math.min(index + 1, request.durationDays),
    timeSlotHint: 'flexible' as const,
    stayDurationMinutes: 75,
    searchQuery: place,
    semanticId: crypto.randomUUID(),
    areaHint: destination,
  }));

  const destinationSeeds = Object.entries(DESTINATION_FALLBACK_CANDIDATES)
    .find(([key]) => destination.includes(key))?.[1];
  const fallbackSeeds = destinationSeeds ?? [
    { name: `${destination}駅周辺の主要スポット`, role: 'recommended' as const, timeSlotHint: 'morning' as const, stayDurationMinutes: 75, searchQuery: `${destination} 駅 観光名所`, areaHint: `${destination}駅周辺` },
    { name: `${destination}のローカル市場ランチ`, role: 'meal' as const, timeSlotHint: 'midday' as const, stayDurationMinutes: 60, searchQuery: `${destination} 市場 ランチ`, areaHint: destination },
    { name: `${destination}中心街の文化スポット`, role: 'recommended' as const, timeSlotHint: 'afternoon' as const, stayDurationMinutes: 90, searchQuery: `${destination} 文化施設`, areaHint: destination },
    { name: `${destination}の夜景スポット`, role: 'recommended' as const, timeSlotHint: 'evening' as const, stayDurationMinutes: 75, searchQuery: `${destination} 展望台 夜景`, areaHint: destination },
  ];

  const fillerCandidates = dayStructure.flatMap((day) =>
    fallbackSeeds.slice(0, 3).map((seed, index) => ({
      name: request.durationDays > 1 ? `${seed.name}（${day.day}日目）` : seed.name,
      role: seed.role,
      priority: Math.max(5, 7 - index),
      dayHint: day.day,
      timeSlotHint: seed.timeSlotHint,
      stayDurationMinutes: seed.stayDurationMinutes,
      searchQuery: seed.searchQuery,
      semanticId: crypto.randomUUID(),
      areaHint: seed.areaHint,
      rationale: '時間制限時の代替候補として、検索しやすい具体スポットを優先',
    }))
  );

  const candidates = [...mustVisits, ...fillerCandidates];

  return {
    destination,
    description: `${destination}の${request.durationDays}日間プラン`,
    candidates,
    dayStructure,
    themes: baseThemes,
    tripIntentSummary: `${destination}を無理なく楽しむ`,
    orderingPreferences: ['午前に主要スポット', '昼食を挟んでエリア内を回遊'],
    fallbackHints: ['主要エリア優先', '移動時間を短く保つ'],
  };
}
