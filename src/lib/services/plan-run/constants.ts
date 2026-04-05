/**
 * Plan Run Pipeline 定数
 */

/** Netlify 無料プランの制限 (ms) */
export const NETLIFY_FREE_LIMIT_MS = 30_000;

/** SSE 終了のための確保時間 (ms) */
export const STREAM_FINALIZE_RESERVE_MS = 2_000;

/** ストリームクローズのための確保時間 (ms) */
export const STREAM_CLOSE_RESERVE_MS = 500;

/** frame build 向け AI タイムアウト (ms) */
export const FRAME_BUILD_TIMEOUT_MS = 8_000;

/** draft generate 1日分の AI タイムアウト (ms) */
export const DRAFT_DAY_TIMEOUT_MS = 20_000;

/** draft generate テキスト fallback のタイムアウト (ms) */
export const DRAFT_DAY_TEXT_FALLBACK_TIMEOUT_MS = 12_000;

/** 同一日の最大リトライ回数 */
export const MAX_DAY_RETRIES = 3;

/** リトライごとの temperature 増分 */
export const RETRY_TEMPERATURE_INCREMENT = 0.15;

/** draft repair 1回の AI タイムアウト (ms) */
export const REPAIR_TIMEOUT_MS = 8_000;

/** 修復の最大反復回数 */
export const MAX_REPAIR_ITERATIONS = 2;

/** 1日あたりの推奨スポット数 (meal 除く) */
export const RECOMMENDED_SPOTS_PER_DAY = 4;

/** 1日の最小 meal block 数 */
export const MIN_MEALS_PER_DAY = 1;

/** 1日の最大ブロック数 */
export const MAX_BLOCKS_PER_DAY = 10;

/** ランタイムプロファイル名 */
export const RUNTIME_PROFILE_NETLIFY_FREE = 'netlify_free_30s';
