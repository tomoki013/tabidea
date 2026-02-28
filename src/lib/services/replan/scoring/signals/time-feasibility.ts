/**
 * Time Feasibility シグナル — 残り時間で完了可能か
 *
 * 現在時刻から推定終了時刻を算出し、
 * 利用可能な残り時間に対する実現可能性を 0-1 で評価。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

function parseTime(time: string): number | undefined {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function parseDuration(dur: string): number {
  let mins = 0;
  const h = dur.match(/(\d+)\s*時間/);
  if (h) mins += parseInt(h[1], 10) * 60;
  const m = dur.match(/(\d+)\s*分/);
  if (m) mins += parseInt(m[1], 10);
  return mins;
}

/** 1日の活動可能上限 (22:00 = 1320分) */
const DAY_END_MINUTES = 22 * 60;

export const timeFeasibilitySignal: ScoringSignal = {
  name: "timeFeasibility",
  calculate(input: HumanResolutionInput): number {
    const current = parseTime(input.state.currentTime);
    if (current === undefined) return 0.5;

    const duration = parseDuration(input.option.estimatedDuration);
    if (duration === 0) return 0.5;

    const remaining = DAY_END_MINUTES - current;
    if (remaining <= 0) return 0;

    // duration が残り時間に収まる度合い
    const ratio = remaining / duration;
    if (ratio >= 2) return 1.0; // 十分余裕あり
    if (ratio >= 1) return 0.5 + 0.5 * ((ratio - 1) / 1); // 1-2倍で線形
    return Math.max(0, ratio * 0.5); // 足りない
  },
};
