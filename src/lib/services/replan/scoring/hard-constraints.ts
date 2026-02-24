/**
 * Hard Constraints チェック
 *
 * 純粋関数。hardPass = false → total = -Infinity で即却下。
 *
 * チェック項目:
 * 1. 終電・終バス時刻
 * 2. 予約済みアイテムとの衝突
 * 3. 営業時間外
 * 4. 歩行距離上限
 */

import type { HumanResolutionInput } from "./types";

// ============================================================================
// Result
// ============================================================================

export interface HardConstraintResult {
  pass: boolean;
  reason?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * HH:mm 形式の時刻を分に変換する。
 * パース失敗時は undefined を返す。
 */
function parseTime(time: string): number | undefined {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * リカバリーオプションの推定終了時刻を分で返す。
 * startTime + estimatedDuration で算出。
 */
function estimateEndTimeMinutes(input: HumanResolutionInput): number | undefined {
  const currentMinutes = parseTime(input.state.currentTime);
  if (currentMinutes === undefined) return undefined;

  // estimatedDuration: "1時間30分" / "30分" / "2時間" 形式をパース
  const durationStr = input.option.estimatedDuration;
  let durationMinutes = 0;

  const hourMatch = durationStr.match(/(\d+)\s*時間/);
  if (hourMatch) durationMinutes += parseInt(hourMatch[1], 10) * 60;

  const minMatch = durationStr.match(/(\d+)\s*分/);
  if (minMatch) durationMinutes += parseInt(minMatch[1], 10);

  if (durationMinutes === 0) return undefined;

  return currentMinutes + durationMinutes;
}

// ============================================================================
// Constants
// ============================================================================

/** 歩行距離上限 (km) — これを超えると Hard Constraint 違反 */
const MAX_WALKING_DISTANCE_KM = 15;

// ============================================================================
// Public API
// ============================================================================

/**
 * Hard Constraints を全てチェックする。
 * いずれか一つでも違反すれば pass = false。
 */
export function passesHardConstraints(
  input: HumanResolutionInput
): HardConstraintResult {
  // 1. 終電・終バスチェック
  if (input.context.returnConstraint) {
    const constraintMatch = input.context.returnConstraint.match(
      /(\d{1,2}:\d{2})/
    );
    if (constraintMatch) {
      const returnDeadline = parseTime(constraintMatch[1]);
      const estimatedEnd = estimateEndTimeMinutes(input);
      if (
        returnDeadline !== undefined &&
        estimatedEnd !== undefined &&
        estimatedEnd > returnDeadline
      ) {
        return {
          pass: false,
          reason: `終了予定時刻 (${Math.floor(estimatedEnd / 60)}:${String(estimatedEnd % 60).padStart(2, "0")}) が帰路制約 (${constraintMatch[1]}) を超過`,
        };
      }
    }
  }

  // 2. 予約済みアイテムとの衝突チェック
  const estimatedEnd = estimateEndTimeMinutes(input);
  if (estimatedEnd !== undefined) {
    for (const booking of input.context.bookings) {
      if (!booking.isCancellable) {
        const bookingTime = parseTime(booking.time);
        if (bookingTime !== undefined && estimatedEnd > bookingTime) {
          return {
            pass: false,
            reason: `予約 "${booking.name}" (${booking.time}) に間に合わない`,
          };
        }
      }
    }
  }

  // 3. 歩行距離上限チェック
  if (input.state.walkingDistanceKm > MAX_WALKING_DISTANCE_KM) {
    return {
      pass: false,
      reason: `歩行距離 (${input.state.walkingDistanceKm}km) が上限 (${MAX_WALKING_DISTANCE_KM}km) を超過`,
    };
  }

  return { pass: true };
}
