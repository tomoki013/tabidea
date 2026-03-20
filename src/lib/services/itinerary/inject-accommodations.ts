/**
 * Accommodation Injection
 * アダプター変換後の DayPlan[] に宿泊カードを注入する
 */

import type { DayPlan, Activity, TimelineItem } from '@/types/itinerary';

export interface AccommodationInjectionContext {
  /** 各日の宿泊地 (NarrativeDay.overnightLocation から取得) */
  overnightLocations: string[];
  /** 開始日 (YYYY-MM-DD) */
  startDate?: string;
  /** 旅行先 */
  destination: string;
}

/**
 * 最終日以外の各日の末尾に宿泊カードを追加
 */
export function injectAccommodations(
  days: DayPlan[],
  context: AccommodationInjectionContext
): DayPlan[] {
  return days.map((day, index) => {
    const isLastDay = index === days.length - 1;

    // 最終日は宿泊なし
    if (isLastDay) {
      return day;
    }

    // 宿泊地を取得
    const overnightLocation =
      context.overnightLocations[index] || context.destination;

    if (!overnightLocation) {
      return day;
    }

    // 既にこの日に accommodation アクティビティがあるかチェック
    const hasAccommodation = day.timelineItems?.some(
      (item) =>
        item.itemType === 'activity' && item.data.activityType === 'accommodation'
    ) ?? day.activities.some((a) => a.activityType === 'accommodation');

    if (hasAccommodation) {
      return day;
    }

    // 最後のアクティビティの時間を推定して宿泊時間を決定
    const lastTime = getLastActivityTime(day);
    const accommodationTime = lastTime || '21:00';

    const accommodationActivity: Activity = {
      time: accommodationTime,
      activity: overnightLocation,
      description: '',
      activityType: 'accommodation',
    };

    const accommodationItem: TimelineItem = {
      itemType: 'activity',
      data: accommodationActivity,
    };

    return {
      ...day,
      timelineItems: [...(day.timelineItems ?? []), accommodationItem],
    };
  });
}

/**
 * DayPlan の最後のアクティビティの時間を取得
 */
function getLastActivityTime(day: DayPlan): string | undefined {
  if (day.timelineItems && day.timelineItems.length > 0) {
    for (let i = day.timelineItems.length - 1; i >= 0; i--) {
      const item = day.timelineItems[i];
      if (item.itemType === 'activity' && item.data.time) {
        // 最後のアクティビティの1-2時間後を宿泊時間とする
        return addHours(item.data.time, 2);
      }
      if (item.itemType === 'transit' && item.data.arrival?.time) {
        return addHours(item.data.arrival.time, 1);
      }
    }
  }

  if (day.activities.length > 0) {
    const lastActivity = day.activities[day.activities.length - 1];
    if (lastActivity.time) {
      return addHours(lastActivity.time, 2);
    }
  }

  return undefined;
}

function addHours(timeStr: string, hours: number): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '21:00';

  let h = parseInt(match[1], 10) + hours;
  const m = parseInt(match[2], 10);

  // Cap at 23:00
  if (h > 23) h = 23;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
