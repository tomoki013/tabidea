import { randomUUID } from 'crypto';
import type {
  DraftPlan,
  DraftStop,
  PlannerDraft,
  PlannerDraftDay,
  PlannerDraftStop,
} from '@/types/plan-generation';
import type { IndoorOutdoor, NormalizedRequest } from '@/types/itinerary-pipeline';

const ORDERING_PREFERENCE_PATTERN = /朝|午前|昼|午後|夕方|夜|初日|最終日|到着|出発|ゆっくり|早め|遅め/i;
const GENERIC_NAME_PATTERN = /散策|観光|自由時間|フリータイム|free time|stroll|walk|sightseeing/i;

function takeTop<T>(items: readonly T[], limit: number): T[] {
  return items.slice(0, limit);
}

function resolveDraftDestination(normalized: NormalizedRequest): string {
  return normalized.destinations[0] ?? normalized.region ?? 'Unknown destination';
}

function isEnglishOutput(normalized: NormalizedRequest): boolean {
  return normalized.outputLanguage === 'en';
}

function resolveDraftThemes(normalized: NormalizedRequest): string[] {
  return takeTop(normalized.themes, 10);
}

function resolveOrderingPreferences(normalized: NormalizedRequest): string[] {
  const seen = new Set<string>();
  const preferences: string[] = [];
  const candidates = [
    ...normalized.hardConstraints.summaryLines,
    ...normalized.softPreferences.rankedRequests,
    ...normalized.hardConstraints.freeTextDirectives,
  ];

  for (const raw of candidates) {
    const value = raw.trim();
    if (!value || seen.has(value) || !ORDERING_PREFERENCE_PATTERN.test(value)) {
      continue;
    }

    seen.add(value);
    preferences.push(value);
    if (preferences.length >= 6) {
      break;
    }
  }

  return preferences;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function inferCategoryHint(stop: PlannerDraftStop): string {
  const text = normalizeText(`${stop.name} ${stop.searchQuery}`);

  if (stop.role === 'meal') {
    if (/cafe|coffee|tea|喫茶|カフェ|ベーカリー|パン/.test(text)) {
      return 'cafe';
    }
    return 'restaurant';
  }

  if (stop.role === 'accommodation') {
    if (/旅館|ryokan/.test(text)) {
      return 'ryokan';
    }
    return 'hotel';
  }

  if (/museum|gallery|美術館|博物館|資料館|記念館/.test(text)) return 'museum';
  if (/temple|寺/.test(text)) return 'temple';
  if (/shrine|神社/.test(text)) return 'shrine';
  if (/garden|park|庭園|公園/.test(text)) return 'park';
  if (/castle|城/.test(text)) return 'castle';
  if (/market|市場|マーケット/.test(text)) return 'market';
  if (/street|通り|商店街|shopping|mall|ショップ/.test(text)) return 'shopping';
  if (/onsen|spa|温泉/.test(text)) return 'onsen';
  if (/station|駅|airport|空港/.test(text)) return 'transport';
  if (/hotel|宿|inn/.test(text)) return 'hotel';

  return stop.role === 'must_visit' ? 'landmark' : 'sightseeing';
}

function inferIndoorOutdoor(categoryHint: string): IndoorOutdoor {
  switch (categoryHint) {
    case 'museum':
    case 'restaurant':
    case 'cafe':
    case 'hotel':
    case 'ryokan':
    case 'onsen':
      return 'indoor';
    case 'park':
    case 'temple':
    case 'shrine':
      return 'outdoor';
    case 'castle':
    case 'market':
    case 'shopping':
    case 'landmark':
    case 'sightseeing':
    case 'transport':
    default:
      return 'both';
  }
}

function inferStayDurationMinutes(
  stop: PlannerDraftStop,
  categoryHint: string,
  normalized: NormalizedRequest,
): number {
  if (stop.role === 'meal') {
    return categoryHint === 'cafe' ? 45 : 60;
  }
  if (stop.role === 'accommodation') {
    return 45;
  }
  if (stop.role === 'filler') {
    return 30;
  }

  const relaxed = normalized.pace === 'relaxed';

  switch (categoryHint) {
    case 'museum':
    case 'castle':
    case 'onsen':
      return relaxed ? 90 : 75;
    case 'park':
    case 'temple':
    case 'shrine':
    case 'market':
    case 'shopping':
    case 'landmark':
      return relaxed ? 75 : 60;
    case 'transport':
      return 30;
    default:
      return relaxed ? 75 : 60;
  }
}

function inferAiConfidence(stop: PlannerDraftStop): DraftStop['aiConfidence'] {
  if (GENERIC_NAME_PATTERN.test(stop.name)) {
    return 'low';
  }
  if (stop.role === 'must_visit' || stop.role === 'meal' || stop.role === 'accommodation') {
    return 'high';
  }
  return stop.role === 'filler' ? 'low' : 'medium';
}

function inferActivityLabel(stop: PlannerDraftStop): string {
  switch (stop.role) {
    case 'meal':
      return `${stop.name}で食事`;
    case 'accommodation':
      return `${stop.name}に滞在`;
    case 'must_visit':
      return `${stop.name}を訪問`;
    case 'filler':
      return `${stop.name}に立ち寄る`;
    case 'recommended':
    default:
      return `${stop.name}を巡る`;
  }
}

function resolveCompanionLabel(normalized: NormalizedRequest): string {
  const companions = normalized.companions.trim();
  const lower = companions.toLowerCase();
  const english = isEnglishOutput(normalized);

  const dictionary: Array<{ match: string[]; ja: string; en: string }> = [
    { match: ['mother', 'mom', '母'], ja: '母', en: 'mother' },
    { match: ['father', 'dad', '父'], ja: '父', en: 'father' },
    { match: ['parents', '両親'], ja: '両親', en: 'parents' },
    { match: ['solo', '一人', 'ひとり'], ja: '一人で', en: 'solo' },
    { match: ['couple', 'カップル', '夫婦'], ja: '二人で', en: 'as a couple' },
    { match: ['friends', '友人', '友達'], ja: '友人と', en: 'with friends' },
    { match: ['family', '家族'], ja: '家族で', en: 'with family' },
  ];

  for (const entry of dictionary) {
    if (entry.match.some((value) => lower.includes(value.toLowerCase()))) {
      return english ? entry.en : entry.ja;
    }
  }

  return companions;
}

function inferRationale(
  stop: PlannerDraftStop,
  daySummary: string,
  mainArea: string,
  normalized: NormalizedRequest,
): string {
  const english = isEnglishOutput(normalized);
  const slotLabel = stop.timeSlotHint === 'morning'
    ? '朝'
    : stop.timeSlotHint === 'midday'
      ? '昼'
      : stop.timeSlotHint === 'afternoon'
        ? '午後'
        : stop.timeSlotHint === 'evening'
          ? '夕方'
          : stop.timeSlotHint === 'night'
            ? '夜'
            : '流れの中で';

  if (english) {
    switch (stop.role) {
      case 'meal':
        return `Fits naturally as a meal stop around ${mainArea}.`;
      case 'accommodation':
        return `A practical overnight base for the day's flow around ${mainArea}.`;
      case 'must_visit':
        return `One of the highest-priority stops and easy to place within the ${mainArea} area.`;
      case 'filler':
        return `A short add-on stop that works smoothly around ${mainArea}.`;
      case 'recommended':
      default:
        return `A natural stop that supports the day's flow in ${mainArea}.`;
    }
  }

  switch (stop.role) {
    case 'meal':
      return `${mainArea}周辺で${slotLabel}に組み込みやすい食事スポット。`;
    case 'accommodation':
      return `${daySummary}に合わせて動線を切りやすい滞在拠点。`;
    case 'must_visit':
      return `この旅で優先度が高く、${mainArea}中心の流れに組み込みやすい。`;
    case 'filler':
      return `${mainArea}周辺で短く立ち寄りやすい。`;
    case 'recommended':
    default:
      return `${daySummary}に沿って無理なく立ち寄れる。`;
  }
}

function inferTags(
  normalized: NormalizedRequest,
  stop: PlannerDraftStop,
  categoryHint: string,
): string[] | undefined {
  const tags = new Set<string>();

  if (stop.role === 'meal' && normalized.themes.includes('local_food')) {
    tags.add('local_food');
  }
  if (categoryHint === 'museum' && normalized.themes.includes('art')) {
    tags.add('art');
  }
  if ((categoryHint === 'park' || categoryHint === 'onsen') && normalized.themes.includes('nature')) {
    tags.add('nature');
  }
  if (
    (categoryHint === 'temple' || categoryHint === 'shrine' || categoryHint === 'castle')
    && normalized.themes.includes('history')
  ) {
    tags.add('history');
  }
  if (categoryHint === 'shopping' || categoryHint === 'market') {
    tags.add('shopping');
  }

  const values = [...tags].slice(0, 5);
  return values.length > 0 ? values : undefined;
}

function buildDayTitle(day: PlannerDraftDay, totalDays: number): string {
  if (totalDays > 1 && day.day === 1) {
    return `到着後は${day.mainArea}周辺へ`;
  }
  if (totalDays > 1 && day.day === totalDays) {
    return `${day.mainArea}を回って出発`;
  }
  return `${day.mainArea}を巡る`;
}

function buildDayTitleLocalized(
  day: PlannerDraftDay,
  totalDays: number,
  normalized: NormalizedRequest,
): string {
  if (!isEnglishOutput(normalized)) {
    return buildDayTitle(day, totalDays);
  }

  if (totalDays > 1 && day.day === 1) {
    return `Start around ${day.mainArea}`;
  }
  if (totalDays > 1 && day.day === totalDays) {
    return `Wrap up around ${day.mainArea}`;
  }
  return `Explore ${day.mainArea}`;
}

function buildPlanDescription(
  normalized: NormalizedRequest,
  destination: string,
): string {
  const themes = takeTop(normalized.themes, 2);
  const themeText = themes.length > 0 ? themes.join(' / ') : normalized.travelVibe ?? '定番スポット';

  if (isEnglishOutput(normalized)) {
    return `${destination} ${normalized.durationDays}-day plan built for a ${normalized.pace} pace with a focus on ${themeText}.`;
  }

  return `${destination}で${normalized.durationDays}日間、${normalized.pace === 'relaxed' ? '無理なく' : 'テンポよく'}${themeText}を楽しむプラン。`;
}

function buildTripIntentSummary(
  normalized: NormalizedRequest,
  destination: string,
): string {
  const companions = resolveCompanionLabel(normalized);

  if (isEnglishOutput(normalized)) {
    return `${companions} trip through ${destination} with a balanced, area-focused flow.`;
  }

  return `${companions}${destination}をエリアを絞って巡る、まとまりのある旅。`;
}

function buildDaySummary(
  day: PlannerDraftDay,
  totalDays: number,
  normalized: NormalizedRequest,
): string {
  const stopCount = day.stops.length;
  const firstOrLast = totalDays > 1 && day.day === 1
    ? 'arrival'
    : totalDays > 1 && day.day === totalDays
      ? 'departure'
      : 'middle';

  if (isEnglishOutput(normalized)) {
    if (firstOrLast === 'arrival') {
      return `Settle into ${day.mainArea} with ${stopCount} compact stops after arrival.`;
    }
    if (firstOrLast === 'departure') {
      return `Stay around ${day.mainArea} with ${stopCount} manageable stops before departure.`;
    }
    return `Focus on ${day.mainArea} with ${stopCount} stops that keep transfers reasonable.`;
  }

  if (firstOrLast === 'arrival') {
    return `到着後は${day.mainArea}を中心に、${stopCount}件前後で無理なく回る流れ。`;
  }
  if (firstOrLast === 'departure') {
    return `出発しやすさを意識して、${day.mainArea}周辺で${stopCount}件前後に絞った流れ。`;
  }
  return `${day.mainArea}を中心に、移動負担を抑えながら${stopCount}件前後を巡る流れ。`;
}

function formatStop(
  stop: PlannerDraftStop,
  day: PlannerDraftDay,
  daySummary: string,
  normalized: NormalizedRequest,
): DraftStop {
  const categoryHint = inferCategoryHint(stop);
  const english = isEnglishOutput(normalized);

  return {
    draftId: randomUUID(),
    name: stop.name,
    searchQuery: stop.searchQuery,
    role: stop.role,
    timeSlotHint: stop.timeSlotHint,
    stayDurationMinutes: inferStayDurationMinutes(stop, categoryHint, normalized),
    areaHint: stop.areaHint,
    rationale: inferRationale(stop, daySummary, day.mainArea, normalized),
    aiConfidence: inferAiConfidence(stop),
    categoryHint,
    activityLabel: english ? stop.name : inferActivityLabel(stop),
    indoorOutdoor: inferIndoorOutdoor(categoryHint),
    tags: inferTags(normalized, stop, categoryHint),
  };
}

export function formatPlannerDraft(
  plannerDraft: PlannerDraft,
  normalized: NormalizedRequest,
): DraftPlan {
  const destination = resolveDraftDestination(normalized);
  const days = plannerDraft.days.map((day) => {
    const summary = buildDaySummary(day, plannerDraft.days.length, normalized);
    return {
      day: day.day,
      title: buildDayTitleLocalized(day, plannerDraft.days.length, normalized),
      mainArea: day.mainArea,
      overnightLocation: day.overnightLocation,
      summary,
      stops: day.stops.map((stop) => formatStop(stop, day, summary, normalized)),
    };
  });

  return {
    destination,
    description: buildPlanDescription(normalized, destination),
    tripIntentSummary: buildTripIntentSummary(normalized, destination),
    themes: resolveDraftThemes(normalized),
    orderingPreferences: resolveOrderingPreferences(normalized),
    days,
  };
}
