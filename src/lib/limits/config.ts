/**
 * 利用制限設定
 *
 * 将来的な変更が容易なように一箇所で管理
 * 課金プラン追加時はここに追記するだけ
 */

export type UserType = 'anonymous' | 'free' | 'premium' | 'admin';
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
  premium: { limit: -1, period: 'unlimited' }, // 課金実装時に調整
  admin: { limit: -1, period: 'unlimited' },
};

// ============================================
// プラン保存制限
// ============================================
export const PLAN_STORAGE_LIMITS: Record<UserType, StorageLimitConfig> = {
  anonymous: { limit: 1 },
  free: { limit: 2 },
  premium: { limit: -1 }, // 課金実装時に調整
  admin: { limit: -1 },
};

// ============================================
// 渡航情報取得制限
// ============================================
export const TRAVEL_INFO_LIMITS: Record<UserType, LimitConfig> = {
  anonymous: { limit: 1, period: 'month' },
  free: { limit: 1, period: 'week' },
  premium: { limit: -1, period: 'unlimited' }, // 課金実装時に調整
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
  return FREE_TRAVEL_INFO_CATEGORIES.includes(category as any);
}

export function getAccessibleCategories(userType: UserType): string[] {
  if (userType === 'admin' || userType === 'premium') {
    return [...ALL_TRAVEL_INFO_CATEGORIES];
  }
  return [...FREE_TRAVEL_INFO_CATEGORIES];
}

export function isUnlimited(config: LimitConfig): boolean {
  return config.limit === -1 || config.period === 'unlimited';
}
