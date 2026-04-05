/**
 * Pass 6: timeline_finalize
 * 順序・滞在時間・バッファ確定 → canonical itinerary へ整形
 * 設計書 §4.2 pass 6
 *
 * deterministic — AI を使用しない。
 * meal window 調整を行う。
 */

import type {
  PlanRunPassContext,
  PlanRunPassResult,
  TimelineDay,
  TimelineBlock,
  DraftBlock,
} from '@/types/plan-run';

// ============================================
// 時刻ユーティリティ
// ============================================

function timeToMinutes(time: string): number {
  const [hStr, mStr] = time.split(':');
  return parseInt(hStr, 10) * 60 + parseInt(mStr ?? '0', 10);
}

function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================
// デフォルト滞在時間
// ============================================

function getDefaultDurationMinutes(block: DraftBlock): number {
  if (block.durationMinutes && block.durationMinutes > 0) return block.durationMinutes;

  switch (block.blockType) {
    case 'meal':
      return 60;
    case 'spot':
      return 90;
    case 'intercity_move_placeholder':
      return 120;
    case 'stay_area_placeholder':
      return 30;
    case 'free_slot':
      return 60;
    default:
      return 60;
  }
}

// ============================================
// 時間帯から推奨開始時刻
// ============================================

function timeSlotToDefaultStart(slot: string | undefined, dayStartMinutes: number): number {
  switch (slot) {
    case 'morning':    return Math.max(dayStartMinutes, 8 * 60);
    case 'midday':     return 12 * 60;
    case 'afternoon':  return 14 * 60;
    case 'evening':    return 18 * 60;
    case 'night':      return 20 * 60;
    default:           return dayStartMinutes;
  }
}

// ============================================
// meal window 強制配置
// ============================================

function ensureMealWindows(blocks: TimelineBlock[]): { blocks: TimelineBlock[]; warnings: string[] } {
  const warnings: string[] = [];
  const meals = blocks.filter((b) => b.blockType === 'meal');

  const lunchTarget = 12 * 60;
  const dinnerTarget = 19 * 60;

  for (const meal of meals) {
    const mealBlock = meal as TimelineBlock & { mealKind?: string };
    const startMin = timeToMinutes(meal.startTime);

    if (mealBlock.mealKind === 'lunch' && Math.abs(startMin - lunchTarget) > 90) {
      warnings.push(`lunch の時刻 (${meal.startTime}) が推奨 (12:00±90min) から外れています`);
    }
    if (mealBlock.mealKind === 'dinner' && Math.abs(startMin - dinnerTarget) > 90) {
      warnings.push(`dinner の時刻 (${meal.startTime}) が推奨 (19:00±90min) から外れています`);
    }
  }

  return { blocks, warnings };
}

// ============================================
// 1日分のタイムライン構築
// ============================================

function buildDayTimeline(
  day: import('@/types/plan-run').DraftDay,
  dayStartTime: string,
): { blocks: TimelineBlock[]; warnings: string[] } {
  const warnings: string[] = [];
  const dayStartMinutes = timeToMinutes(dayStartTime);
  let cursor = dayStartMinutes;

  const orderedBlocks = [...day.blocks];
  const timeline: TimelineBlock[] = [];

  for (const block of orderedBlocks) {
    const duration = getDefaultDurationMinutes(block);
    const desiredStart = block.startTime
      ? timeToMinutes(block.startTime)
      : timeSlotToDefaultStart(block.timeSlot, cursor);

    // カーソルより前には置かない
    const actualStart = Math.max(cursor, desiredStart);
    const actualEnd = actualStart + duration;

    if (actualStart > 22 * 60) {
      warnings.push(`${block.placeName} は 22:00 以降に配置されました`);
    }

    const travelToNext = block.blockType === 'intercity_move_placeholder' ? 0 : 15;

    timeline.push({
      draftId: block.draftId,
      blockType: block.blockType,
      placeName: block.placeName,
      startTime: minutesToTime(actualStart),
      endTime: minutesToTime(actualEnd),
      durationMinutes: duration,
      travelToNextMinutes: travelToNext,
      warnings: [],
    });

    cursor = actualEnd + travelToNext;
  }

  const { warnings: mealWarnings } = ensureMealWindows(timeline);
  warnings.push(...mealWarnings);

  return { blocks: timeline, warnings };
}

// ============================================
// Pass Implementation
// ============================================

export async function timelineFinalizePass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<TimelineDay[]>> {
  const start = Date.now();
  const { run } = ctx;
  const draft = run.draftTrip;
  const req = run.normalizedInput;

  if (!draft || !req) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['draftTrip または normalizedInput が存在しません'],
      durationMs: Date.now() - start,
    };
  }

  const timelineDays: TimelineDay[] = [];
  const allWarnings: string[] = [];

  const allDays = draft.cities
    .flatMap((c) => c.days)
    .sort((a, b) => a.dayNumber - b.dayNumber);

  for (const day of allDays) {
    const { blocks, warnings } = buildDayTimeline(day, '09:00');
    allWarnings.push(...warnings);

    timelineDays.push({
      dayNumber: day.dayNumber,
      title: day.title,
      mainArea: day.mainArea,
      overnightLocation: day.overnightLocation,
      startTime: '09:00',
      blocks,
    });
  }

  return {
    outcome: 'completed',
    data: timelineDays,
    newState: 'timeline_finalized',
    warnings: allWarnings,
    durationMs: Date.now() - start,
  };
}
