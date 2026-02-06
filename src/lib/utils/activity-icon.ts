/**
 * アクティビティ種別判定ユーティリティ
 * アクティビティ名から種別アイコンと時間帯を自動判定
 */

// ============================================
// Types
// ============================================

export type ActivityCategory =
  | 'accommodation'
  | 'meal'
  | 'transit'
  | 'sightseeing'
  | 'shopping'
  | 'other';

export type TimePeriod = 'morning' | 'afternoon' | 'evening';

export interface ActivityIconInfo {
  category: ActivityCategory;
  icon: string;
  label: string;
}

export interface TimePeriodInfo {
  period: TimePeriod;
  icon: string;
  label: string;
}

// ============================================
// Keyword Maps
// ============================================

const ACCOMMODATION_KEYWORDS = [
  'チェックイン', 'チェックアウト', 'ホテル', '旅館', '宿',
  '民泊', 'ゲストハウス', 'ペンション', 'リゾート', '温泉宿',
  '宿泊', 'hotel', 'check-in', 'check-out', 'inn', 'hostel',
];

const MEAL_KEYWORDS = [
  '朝食', '昼食', '夕食', 'ランチ', 'ディナー', 'カフェ',
  'レストラン', '食事', 'モーニング', 'ブランチ', 'グルメ',
  '居酒屋', 'バー', '食堂', 'ラーメン', '寿司', 'すし',
  'うどん', 'そば', '焼肉', 'breakfast', 'lunch', 'dinner',
  'cafe', 'restaurant', '市場', 'マーケット', '屋台',
  'フードコート', 'ビストロ', 'トラットリア', 'パブ',
];

const TRANSIT_KEYWORDS = [
  '移動', '出発', '到着', 'バス', '電車', '新幹線',
  'フライト', '飛行機', 'タクシー', 'レンタカー', '船',
  'フェリー', '空港', '駅', 'ドライブ', '乗車', '搭乗',
  'transit', 'transfer', 'departure', 'arrival', 'train',
  'bus', 'flight', 'taxi', 'drive',
];

const SIGHTSEEING_KEYWORDS = [
  '散策', '見学', '鑑賞', '観光', '参拝', '巡り',
  '体験', 'ツアー', '美術館', '博物館', '神社', '寺',
  '城', '公園', '庭園', '展望', 'ビーチ', '山',
  'ハイキング', 'クルーズ', 'サファリ', 'ダイビング',
  'シュノーケリング', '写真', 'フォト', '遊覧',
  'tour', 'visit', 'explore', 'museum', 'temple', 'shrine',
  'park', 'beach', 'mountain', 'viewing',
];

const SHOPPING_KEYWORDS = [
  '買い物', 'ショッピング', 'お土産', 'おみやげ', 'スーベニア',
  'マーケット', 'モール', 'アウトレット', 'デパート', '百貨店',
  '免税', 'shopping', 'souvenir', 'market', 'mall', 'outlet',
];

// ============================================
// Functions
// ============================================

/**
 * アクティビティ名から種別を判定
 */
export function getActivityCategory(activityName: string): ActivityCategory {
  const normalized = activityName.toLowerCase();

  if (ACCOMMODATION_KEYWORDS.some((k) => normalized.includes(k.toLowerCase()))) {
    return 'accommodation';
  }
  if (MEAL_KEYWORDS.some((k) => normalized.includes(k.toLowerCase()))) {
    return 'meal';
  }
  if (TRANSIT_KEYWORDS.some((k) => normalized.includes(k.toLowerCase()))) {
    return 'transit';
  }
  if (SHOPPING_KEYWORDS.some((k) => normalized.includes(k.toLowerCase()))) {
    return 'shopping';
  }
  if (SIGHTSEEING_KEYWORDS.some((k) => normalized.includes(k.toLowerCase()))) {
    return 'sightseeing';
  }

  return 'other';
}

/**
 * アクティビティ種別からアイコン情報を取得
 */
export function getActivityIcon(activityName: string): ActivityIconInfo {
  const category = getActivityCategory(activityName);

  switch (category) {
    case 'accommodation':
      return { category, icon: '🏨', label: '宿泊' };
    case 'meal':
      return { category, icon: '🍽️', label: '食事' };
    case 'transit':
      return { category, icon: '🚃', label: '移動' };
    case 'sightseeing':
      return { category, icon: '📸', label: '観光' };
    case 'shopping':
      return { category, icon: '🛍️', label: 'ショッピング' };
    default:
      return { category, icon: '🎯', label: 'アクティビティ' };
  }
}

/**
 * 時間文字列から時間帯を判定
 * @param timeStr 例: "09:00", "14:30", "18:00"
 */
export function getTimePeriod(timeStr: string): TimePeriodInfo {
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?/);
  if (!match) {
    return { period: 'morning', icon: '🌅', label: '朝' };
  }

  const hour = parseInt(match[1], 10);

  if (hour < 11) {
    return { period: 'morning', icon: '🌅', label: '朝' };
  }
  if (hour < 17) {
    return { period: 'afternoon', icon: '☀️', label: '昼' };
  }
  return { period: 'evening', icon: '🌙', label: '夜' };
}

/**
 * アクティビティ配列を時間帯ごとにグループ化
 */
export function groupActivitiesByTimePeriod<T extends { time: string }>(
  activities: T[]
): { period: TimePeriodInfo; activities: T[] }[] {
  const groups: Map<TimePeriod, { period: TimePeriodInfo; activities: T[] }> = new Map();

  for (const activity of activities) {
    const periodInfo = getTimePeriod(activity.time);
    const existing = groups.get(periodInfo.period);
    if (existing) {
      existing.activities.push(activity);
    } else {
      groups.set(periodInfo.period, {
        period: periodInfo,
        activities: [activity],
      });
    }
  }

  // 時間帯順（朝→昼→夜）に並べ替え
  const order: TimePeriod[] = ['morning', 'afternoon', 'evening'];
  return order
    .filter((p) => groups.has(p))
    .map((p) => groups.get(p)!);
}
