import type { DayPlan, TimelineItem } from '@/types';

export function extractDuration(dates: string): number {
  // Support "X日間" format (e.g., "3日間")
  const daysMatch = dates.match(/(\d+)日間/);
  if (daysMatch) {
    return parseInt(daysMatch[1], 10);
  }

  // Support "X泊Y日" format (e.g., "2泊3日")
  const nightsDaysMatch = dates.match(/(\d+)泊(\d+)日/);
  if (nightsDaysMatch) {
    return parseInt(nightsDaysMatch[2], 10);
  }

  return 0;
}

export function splitDaysIntoChunks(totalDays: number): { start: number; end: number }[] {
  const chunks: { start: number; end: number }[] = [];
  let currentDay = 1;
  const CHUNK_SIZE = 1;

  while (currentDay <= totalDays) {
    const end = Math.min(currentDay + CHUNK_SIZE - 1, totalDays);
    chunks.push({ start: currentDay, end });
    currentDay = end + 1;
  }

  return chunks;
}

/**
 * ユーザー入力の日付文字列から開始日を抽出
 * "2024年6月15日〜6月17日" → "2024-06-15"
 * "6/15-6/17" → null (年が不明)
 * "2024-06-15" → "2024-06-15"
 */
export function extractStartDate(dates: string): string | null {
  // YYYY年M月D日 形式
  const jpMatch = dates.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (jpMatch) {
    const [, year, month, day] = jpMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY-MM-DD 形式
  const isoMatch = dates.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // YYYY/MM/DD 形式
  const slashMatch = dates.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * 特定の日のチェックイン/チェックアウト日を計算
 * @param startDate 旅行開始日 (YYYY-MM-DD)
 * @param dayNumber 日目 (1-indexed)
 * @returns { checkIn: 'YYYY-MM-DD', checkOut: 'YYYY-MM-DD' }
 */
export function getDayCheckInOutDates(
  startDate: string,
  dayNumber: number
): { checkIn: string; checkOut: string } {
  const base = new Date(startDate + 'T00:00:00');
  const checkIn = new Date(base);
  checkIn.setDate(base.getDate() + (dayNumber - 1));
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 1);

  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { checkIn: format(checkIn), checkOut: format(checkOut) };
}

/**
 * 時刻文字列をソート用の数値に変換
 * "09:00" → 900, "14:30" → 1430, undefined → Infinity (末尾に配置)
 */
export function parseTimeForSort(time?: string): number {
  if (!time) return Infinity;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Infinity;
  return parseInt(match[1], 10) * 100 + parseInt(match[2], 10);
}

/**
 * タイムラインアイテムを時系列でソート
 */
function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
  return items.sort((a, b) => {
    return parseTimeForSort(getTimelineItemTime(a)) - parseTimeForSort(getTimelineItemTime(b));
  });
}

/**
 * DayPlanからタイムラインアイテムの配列を構築
 * AIが生成したtimelineItemsがあればそれを使い、なければtransit + activitiesから構築
 * いずれの場合も時系列順にソートして返す
 */
export function buildTimeline(day: DayPlan): TimelineItem[] {
  if (day.timelineItems && day.timelineItems.length > 0) {
    // AI生成のtimelineItemsを時系列ソート（安全策）
    return sortTimelineItems([...day.timelineItems]);
  }

  const items: TimelineItem[] = [];

  if (day.transit) {
    items.push({
      itemType: 'transit',
      data: day.transit,
      time: day.transit.departure.time,
    });
  }

  for (const activity of day.activities) {
    items.push({ itemType: 'activity', data: activity });
  }

  // 時系列順にソート（transitを先頭固定ではなく、時刻ベースで配置）
  return sortTimelineItems(items);
}

/**
 * タイムラインアイテムの時刻を取得
 */
export function getTimelineItemTime(item: TimelineItem): string | undefined {
  if (item.itemType === 'transit') {
    return item.time || item.data.departure.time;
  }
  return item.data.time;
}
