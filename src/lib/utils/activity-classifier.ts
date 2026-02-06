/**
 * アクティビティ分類ユーティリティ
 * Places API 検索の要否を判定するためのロジック
 */

// ============================================
// Types
// ============================================

export type PlacesSearchDecision = 'search' | 'skip';

export interface ClassificationResult {
  decision: PlacesSearchDecision;
  reason: string;
  category: 'sightseeing' | 'restaurant' | 'transport' | 'hotel' | 'free_time' | 'other';
}

// ============================================
// Keywords for skip detection (transport/logistics)
// ============================================

const SKIP_KEYWORDS_JA = [
  // 移動系
  '出発', '到着', '移動', '向かう', '乗車', '搭乗', '下車',
  '乗り換え', '乗り継ぎ', 'ドライブ', '車で', 'タクシーで',
  'バスで', '電車で', '新幹線で', '飛行機で', 'フェリーで',
  '船で', '空港へ', '駅へ', '港へ',
  // チェックイン/アウト系
  'チェックイン', 'チェックアウト',
  // 休憩・自由時間系
  '自由時間', '休憩', 'フリータイム', '各自', '自由行動',
  // 帰路系
  '帰路', '帰国', '帰宅', '戻る',
];

const SKIP_KEYWORDS_EN = [
  // Transport
  'departure', 'arrival', 'transit', 'transfer', 'drive to',
  'take a bus', 'take a train', 'take a taxi', 'take a flight',
  'head to', 'travel to', 'move to', 'commute',
  // Check-in/out
  'check-in', 'check-out', 'checkin', 'checkout',
  // Free time
  'free time', 'rest', 'leisure', 'at your own pace',
  // Return
  'return home', 'head back', 'fly back', 'depart for home',
];

/**
 * 移動・ロジスティクスアクティビティかを判定するパターン
 * タイトルの先頭やパターンで判定
 */
const TRANSPORT_PATTERNS = [
  // 「〜出発」「〜に出発」「〜へ出発」
  /出発/,
  /到着/,
  // 「〜から〜へ移動」
  /から.{1,20}へ/,
  // 「〜へ向かう」「〜に向かう」
  /へ向かう|に向かう/,
  // 「〜を越えて〜へ」
  /を越えて.{1,20}へ/,
  // 「〜経由で」
  /経由で/,
  // 🚃, ✈️, 🚌, 🚗 etc transport emojis at start
  /^[🚃✈️🚌🚗🚕🚂🛳️🚢🚁🏎️⛴🛫🛬🚆🚇🚈🚊🚝🚞🚋🚍🚎🏍🛵🛺]/,
];

// ============================================
// Classification Logic
// ============================================

/**
 * アクティビティが Places API 検索をすべきかを判定
 *
 * @param activityName - アクティビティ名
 * @param description - アクティビティ説明
 * @param activityType - AI が設定した種類（あれば優先）
 * @returns 分類結果
 */
export function classifyActivity(
  activityName: string,
  description: string = '',
  activityType?: string
): ClassificationResult {
  // 1. AI が明示的に activityType を設定している場合、それを優先
  if (activityType) {
    switch (activityType) {
      case 'transit':
        return { decision: 'skip', reason: 'AI classified as transit', category: 'transport' };
      case 'accommodation':
        return { decision: 'skip', reason: 'AI classified as accommodation', category: 'hotel' };
      case 'spot':
        return { decision: 'search', reason: 'AI classified as spot', category: 'sightseeing' };
      case 'meal':
        return { decision: 'search', reason: 'AI classified as meal', category: 'restaurant' };
    }
  }

  const titleLower = activityName.toLowerCase();

  // 2. ホテル系キーワードを最優先チェック（チェックイン/アウトは移動パターンより優先）
  const hotelKeywords = ['チェックイン', 'チェックアウト', 'check-in', 'check-out', 'checkin', 'checkout'];
  for (const keyword of hotelKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return { decision: 'skip', reason: `Matched hotel keyword: ${keyword}`, category: 'hotel' };
    }
  }

  // 3. 自由時間系キーワード
  const freeTimeKeywords = ['自由時間', '休憩', 'フリータイム', '各自', '自由行動', 'free time', 'rest', 'leisure'];
  for (const keyword of freeTimeKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return { decision: 'skip', reason: `Matched free time keyword: ${keyword}`, category: 'free_time' };
    }
  }

  // 4. 移動パターンのチェック（タイトルのみ）
  for (const pattern of TRANSPORT_PATTERNS) {
    if (pattern.test(activityName)) {
      return { decision: 'skip', reason: `Matched transport pattern: ${pattern}`, category: 'transport' };
    }
  }

  // 5. その他スキップキーワードのチェック
  for (const keyword of SKIP_KEYWORDS_JA) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return { decision: 'skip', reason: `Matched transport keyword: ${keyword}`, category: 'transport' };
    }
  }

  for (const keyword of SKIP_KEYWORDS_EN) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return { decision: 'skip', reason: `Matched transport keyword: ${keyword}`, category: 'transport' };
    }
  }

  // 4. デフォルト: 検索する（観光スポットやレストラン等）
  return { decision: 'search', reason: 'No skip keywords found', category: 'sightseeing' };
}

/**
 * Places API 検索をスキップすべきかどうかのシンプルなヘルパー
 */
export function shouldSkipPlacesSearch(
  activityName: string,
  description: string = '',
  activityType?: string
): boolean {
  return classifyActivity(activityName, description, activityType).decision === 'skip';
}

/**
 * ホテル検索用の絞り込み地域名を抽出
 * 広い地域名（例: 「エジプト」）ではなく、具体的なエリア（例: 「アスワン」）を返す
 *
 * @param description - アクティビティの説明文
 * @param dayTitle - その日のタイトル
 * @param destination - 全体の目的地
 * @returns 絞り込まれた地域名
 */
export function extractNarrowLocation(
  description: string,
  dayTitle: string = '',
  destination: string = ''
): string {
  // 説明文やタイトルからより具体的な地名を探す
  // 日本語の地名パターン: 「〜のホテル」「〜エリア」「〜地区」「〜市内」
  const locationPatterns = [
    /([ぁ-んァ-ヶー\w]{2,10})(?:の(?:ホテル|宿|旅館|リゾート))/,
    /([ぁ-んァ-ヶー\w]{2,10})(?:エリア|地区|市内|中心部|周辺)/,
    /(?:in|near|at)\s+([A-Za-z\s]{2,30})/i,
  ];

  const combined = `${dayTitle} ${description}`;
  for (const pattern of locationPatterns) {
    const match = combined.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  // フォールバック: destination をそのまま返す
  return destination;
}
