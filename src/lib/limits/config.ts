/**
 * 利用制限設定
 *
 * 将来的な変更が容易なように一箇所で管理
 * 課金プラン追加時はここに追記するだけ
 */

export type UserType = 'anonymous' | 'free' | 'pro' | 'premium' | 'admin';
export type ActionType = 'plan_generation' | 'travel_info';
export type PeriodType = 'month' | 'week' | 'day' | 'unlimited';

export interface LimitConfig {
  limit: number; // -1 = 無制限
  period: PeriodType;
}

export interface StorageLimitConfig {
  limit: number; // -1 = 無制限
}

// ============================================
// プラン生成制限
// ============================================
export const PLAN_GENERATION_LIMITS: Record<UserType, LimitConfig> = {
  anonymous: { limit: 1, period: 'month' },
  free: { limit: 3, period: 'month' },
  pro: { limit: 30, period: 'month' },
  premium: { limit: 100, period: 'month' },
  admin: { limit: -1, period: 'unlimited' },
};

// ============================================
// プラン保存制限
// ============================================
export const PLAN_STORAGE_LIMITS: Record<UserType, StorageLimitConfig> = {
  anonymous: { limit: 1 },
  free: { limit: -1 },
  pro: { limit: -1 },
  premium: { limit: -1 },
  admin: { limit: -1 },
};

// ============================================
// チケット有効期限（日数）
// ============================================
export const TICKET_VALIDITY_DAYS = {
  ticket_1: 30,
  ticket_5: 90,
  ticket_10: 180,
} as const;

// ============================================
// 渡航情報取得制限
// ============================================
export const TRAVEL_INFO_LIMITS: Record<UserType, LimitConfig> = {
  anonymous: { limit: 1, period: 'month' },
  free: { limit: 1, period: 'week' },
  pro: { limit: 10, period: 'month' },
  premium: { limit: -1, period: 'unlimited' },
  admin: { limit: -1, period: 'unlimited' },
};

// ============================================
// 渡航情報カテゴリ制限
// ============================================
export const FREE_TRAVEL_INFO_CATEGORIES = [
  'basic', // 基本情報
  'safety', // 安全・医療
  'climate', // 気候・服装
] as const;

export const PREMIUM_TRAVEL_INFO_CATEGORIES = [
  'visa',
  'manner',
  'transport',
  'local_food',
  'souvenir',
  'events',
  'technology',
  'healthcare',
  'restrooms',
  'smoking',
  'alcohol',
] as const;

export const ALL_TRAVEL_INFO_CATEGORIES = [
  ...FREE_TRAVEL_INFO_CATEGORIES,
  ...PREMIUM_TRAVEL_INFO_CATEGORIES,
] as const;

// ============================================
// ヘルパー関数
// ============================================

export function canAccessCategory(
  userType: UserType,
  category: string
): boolean {
  if (userType === 'admin' || userType === 'premium') {
    return true;
  }
  return (FREE_TRAVEL_INFO_CATEGORIES as readonly string[]).includes(category);
}

export function getAccessibleCategories(userType: UserType): string[] {
  if (userType === 'admin' || userType === 'premium') {
    return [...ALL_TRAVEL_INFO_CATEGORIES];
  }
  return [...FREE_TRAVEL_INFO_CATEGORIES];
}

// ============================================
// v3: Places 詳細取得制限 (プランあたり)
// ============================================
export const PLACES_DETAIL_LIMITS_PER_PLAN: Record<UserType, number> = {
  anonymous: 0,
  free: 0,
  pro: 10,
  premium: -1, // 無制限
  admin: -1,
};

// ============================================
// v3: マッププロバイダー
// ============================================
export type MapProviderType = 'static' | 'leaflet' | 'google_maps';

export const MAP_PROVIDER: Record<UserType, MapProviderType> = {
  anonymous: 'static',
  free: 'static',
  pro: 'leaflet',
  premium: 'google_maps',
  admin: 'google_maps',
};

// ============================================
// v3: 航空券・ホテル候補数
// ============================================
export const FLIGHT_HOTEL_CANDIDATE_COUNT: Record<UserType, number> = {
  anonymous: 0,
  free: 0,
  pro: 3,
  premium: 7,
  admin: 7,
};

export function isUnlimited(config: LimitConfig): boolean {
  return config.limit === -1 || config.period === 'unlimited';
}
