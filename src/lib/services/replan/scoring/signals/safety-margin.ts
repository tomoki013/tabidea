/**
 * Safety Margin シグナル — 終電・閉店からの余裕
 *
 * 帰路制約や予約からどれだけ余裕があるかを 0-1 で評価。
 * 余裕が多いほどスコアが高い。
 */

import type { ScoringSignal, HumanResolutionInput } from "../types";

/** 理想的なバッファ (分) */
const IDEAL_BUFFER_MINUTES = 60;

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

export const safetyMarginSignal: ScoringSignal = {
  name: "safetyMargin",
  calculate(input: HumanResolutionInput): number {
    const current = parseTime(input.state.currentTime);
    if (current === undefined) return 0.5; // 不明なら中立

    const duration = parseDuration(input.option.estimatedDuration);
    const estimatedEnd = current + duration;

    // 帰路制約からの余裕
    let minBuffer = Infinity;
    if (input.context.returnConstraint) {
      const match = input.context.returnConstraint.match(/(\d{1,2}:\d{2})/);
      if (match) {
        const deadline = parseTime(match[1]);
        if (deadline !== undefined) {
          minBuffer = Math.min(minBuffer, deadline - estimatedEnd);
        }
      }
    }

    // 予約からの余裕
    for (const booking of input.context.bookings) {
      const bt = parseTime(booking.time);
      if (bt !== undefined && bt > estimatedEnd) {
        minBuffer = Math.min(minBuffer, bt - estimatedEnd);
      }
    }

    if (minBuffer === Infinity) return 0.8; // 制約なし → やや高め
    if (minBuffer <= 0) return 0;

    return Math.min(1, minBuffer / IDEAL_BUFFER_MINUTES);
  },
};
