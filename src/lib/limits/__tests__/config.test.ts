import { describe, it, expect } from 'vitest';
import {
  canAccessCategory,
  getAccessibleCategories,
  isUnlimited,
  FREE_TRAVEL_INFO_CATEGORIES,
  ALL_TRAVEL_INFO_CATEGORIES,
  PLAN_GENERATION_LIMITS,
  type LimitConfig,
} from '../config';

describe('canAccessCategory', () => {
  it('anonymousユーザーは基本3カテゴリのみアクセス可能', () => {
    expect(canAccessCategory('anonymous', 'basic')).toBe(true);
    expect(canAccessCategory('anonymous', 'safety')).toBe(true);
    expect(canAccessCategory('anonymous', 'climate')).toBe(true);
    expect(canAccessCategory('anonymous', 'visa')).toBe(false);
    expect(canAccessCategory('anonymous', 'local_food')).toBe(false);
  });

  it('freeユーザーは基本3カテゴリのみアクセス可能', () => {
    expect(canAccessCategory('free', 'basic')).toBe(true);
    expect(canAccessCategory('free', 'safety')).toBe(true);
    expect(canAccessCategory('free', 'visa')).toBe(false);
  });

  it('premiumユーザーは全カテゴリアクセス可能', () => {
    ALL_TRAVEL_INFO_CATEGORIES.forEach((category) => {
      expect(canAccessCategory('premium', category)).toBe(true);
    });
  });

  it('adminユーザーは全カテゴリアクセス可能', () => {
    ALL_TRAVEL_INFO_CATEGORIES.forEach((category) => {
      expect(canAccessCategory('admin', category)).toBe(true);
    });
  });
});

describe('getAccessibleCategories', () => {
  it('anonymousは3カテゴリ', () => {
    const categories = getAccessibleCategories('anonymous');
    expect(categories).toHaveLength(3);
    expect(categories).toEqual(
      expect.arrayContaining(['basic', 'safety', 'climate'])
    );
  });

  it('freeは3カテゴリ', () => {
    const categories = getAccessibleCategories('free');
    expect(categories).toHaveLength(3);
    expect(categories).toEqual(
      expect.arrayContaining(['basic', 'safety', 'climate'])
    );
  });

  it('adminは全カテゴリ', () => {
    const categories = getAccessibleCategories('admin');
    expect(categories).toHaveLength(ALL_TRAVEL_INFO_CATEGORIES.length);
  });

  it('premiumは全カテゴリ', () => {
    const categories = getAccessibleCategories('premium');
    expect(categories).toHaveLength(ALL_TRAVEL_INFO_CATEGORIES.length);
  });
});

describe('isUnlimited', () => {
  it('limit=-1は無制限', () => {
    const config: LimitConfig = { limit: -1, period: 'month' };
    expect(isUnlimited(config)).toBe(true);
  });

  it('period=unlimitedは無制限', () => {
    const config: LimitConfig = { limit: 10, period: 'unlimited' };
    expect(isUnlimited(config)).toBe(true);
  });

  it('通常の制限はfalse', () => {
    const config: LimitConfig = { limit: 3, period: 'month' };
    expect(isUnlimited(config)).toBe(false);
  });
});

describe('PLAN_GENERATION_LIMITS', () => {
  it('anonymousは月1回', () => {
    const limit = PLAN_GENERATION_LIMITS.anonymous;
    expect(limit.limit).toBe(1);
    expect(limit.period).toBe('month');
  });

  it('freeは月3回', () => {
    const limit = PLAN_GENERATION_LIMITS.free;
    expect(limit.limit).toBe(3);
    expect(limit.period).toBe('month');
  });

  it('adminは無制限', () => {
    const limit = PLAN_GENERATION_LIMITS.admin;
    expect(isUnlimited(limit)).toBe(true);
  });

  it('premiumは無制限', () => {
    const limit = PLAN_GENERATION_LIMITS.premium;
    expect(isUnlimited(limit)).toBe(true);
  });
});
