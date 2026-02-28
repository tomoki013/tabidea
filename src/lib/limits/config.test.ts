import { describe, it, expect } from 'vitest';
import {
  type UserType,
  PLAN_GENERATION_LIMITS,
  PLAN_STORAGE_LIMITS,
  TRAVEL_INFO_LIMITS,
  PLACES_DETAIL_LIMITS_PER_PLAN,
  MAP_PROVIDER,
  FLIGHT_HOTEL_CANDIDATE_COUNT,
  canAccessCategory,
  getAccessibleCategories,
  isUnlimited,
  FREE_TRAVEL_INFO_CATEGORIES,
  ALL_TRAVEL_INFO_CATEGORIES,
} from './config';

const ALL_USER_TYPES: UserType[] = ['anonymous', 'free', 'pro', 'premium', 'admin'];

describe('5-tier config: PLAN_GENERATION_LIMITS', () => {
  it('should have entries for all 5 user types', () => {
    for (const tier of ALL_USER_TYPES) {
      expect(PLAN_GENERATION_LIMITS[tier]).toBeDefined();
    }
  });

  it('anonymous: 1/month', () => {
    expect(PLAN_GENERATION_LIMITS.anonymous).toEqual({ limit: 1, period: 'month' });
  });

  it('free: 3/month', () => {
    expect(PLAN_GENERATION_LIMITS.free).toEqual({ limit: 3, period: 'month' });
  });

  it('pro: 30/month', () => {
    expect(PLAN_GENERATION_LIMITS.pro).toEqual({ limit: 30, period: 'month' });
  });

  it('premium: 100/month', () => {
    expect(PLAN_GENERATION_LIMITS.premium).toEqual({ limit: 100, period: 'month' });
  });

  it('admin: unlimited', () => {
    expect(PLAN_GENERATION_LIMITS.admin).toEqual({ limit: -1, period: 'unlimited' });
    expect(isUnlimited(PLAN_GENERATION_LIMITS.admin)).toBe(true);
  });

  it('limits should increase with tier level', () => {
    expect(PLAN_GENERATION_LIMITS.anonymous.limit).toBeLessThan(PLAN_GENERATION_LIMITS.free.limit);
    expect(PLAN_GENERATION_LIMITS.free.limit).toBeLessThan(PLAN_GENERATION_LIMITS.pro.limit);
    expect(PLAN_GENERATION_LIMITS.pro.limit).toBeLessThan(PLAN_GENERATION_LIMITS.premium.limit);
  });
});

describe('5-tier config: PLAN_STORAGE_LIMITS', () => {
  it('should have entries for all 5 user types', () => {
    for (const tier of ALL_USER_TYPES) {
      expect(PLAN_STORAGE_LIMITS[tier]).toBeDefined();
    }
  });

  it('anonymous: 1', () => {
    expect(PLAN_STORAGE_LIMITS.anonymous).toEqual({ limit: 1 });
  });

  it('free: unlimited', () => {
    expect(PLAN_STORAGE_LIMITS.free).toEqual({ limit: -1 });
  });

  it('pro: unlimited', () => {
    expect(PLAN_STORAGE_LIMITS.pro).toEqual({ limit: -1 });
  });

  it('premium: unlimited', () => {
    expect(PLAN_STORAGE_LIMITS.premium).toEqual({ limit: -1 });
  });

  it('admin: unlimited', () => {
    expect(PLAN_STORAGE_LIMITS.admin).toEqual({ limit: -1 });
  });
});

describe('5-tier config: TRAVEL_INFO_LIMITS', () => {
  it('should have entries for all 5 user types', () => {
    for (const tier of ALL_USER_TYPES) {
      expect(TRAVEL_INFO_LIMITS[tier]).toBeDefined();
    }
  });

  it('anonymous: 1/month', () => {
    expect(TRAVEL_INFO_LIMITS.anonymous).toEqual({ limit: 1, period: 'month' });
  });

  it('free: 1/week', () => {
    expect(TRAVEL_INFO_LIMITS.free).toEqual({ limit: 1, period: 'week' });
  });

  it('pro: 10/month', () => {
    expect(TRAVEL_INFO_LIMITS.pro).toEqual({ limit: 10, period: 'month' });
  });

  it('premium: unlimited', () => {
    expect(TRAVEL_INFO_LIMITS.premium).toEqual({ limit: -1, period: 'unlimited' });
    expect(isUnlimited(TRAVEL_INFO_LIMITS.premium)).toBe(true);
  });

  it('admin: unlimited', () => {
    expect(TRAVEL_INFO_LIMITS.admin).toEqual({ limit: -1, period: 'unlimited' });
  });
});

describe('5-tier config: PLACES_DETAIL_LIMITS_PER_PLAN', () => {
  it('should have entries for all 5 user types', () => {
    for (const tier of ALL_USER_TYPES) {
      expect(PLACES_DETAIL_LIMITS_PER_PLAN[tier]).toBeDefined();
    }
  });

  it('anonymous/free: 0', () => {
    expect(PLACES_DETAIL_LIMITS_PER_PLAN.anonymous).toBe(0);
    expect(PLACES_DETAIL_LIMITS_PER_PLAN.free).toBe(0);
  });

  it('pro: 10', () => {
    expect(PLACES_DETAIL_LIMITS_PER_PLAN.pro).toBe(10);
  });

  it('premium/admin: unlimited (-1)', () => {
    expect(PLACES_DETAIL_LIMITS_PER_PLAN.premium).toBe(-1);
    expect(PLACES_DETAIL_LIMITS_PER_PLAN.admin).toBe(-1);
  });
});

describe('5-tier config: MAP_PROVIDER', () => {
  it('should have entries for all 5 user types', () => {
    for (const tier of ALL_USER_TYPES) {
      expect(MAP_PROVIDER[tier]).toBeDefined();
    }
  });

  it('anonymous/free: static', () => {
    expect(MAP_PROVIDER.anonymous).toBe('static');
    expect(MAP_PROVIDER.free).toBe('static');
  });

  it('pro: leaflet', () => {
    expect(MAP_PROVIDER.pro).toBe('leaflet');
  });

  it('premium/admin: google_maps', () => {
    expect(MAP_PROVIDER.premium).toBe('google_maps');
    expect(MAP_PROVIDER.admin).toBe('google_maps');
  });
});

describe('5-tier config: FLIGHT_HOTEL_CANDIDATE_COUNT', () => {
  it('should have entries for all 5 user types', () => {
    for (const tier of ALL_USER_TYPES) {
      expect(FLIGHT_HOTEL_CANDIDATE_COUNT[tier]).toBeDefined();
    }
  });

  it('anonymous/free: 0', () => {
    expect(FLIGHT_HOTEL_CANDIDATE_COUNT.anonymous).toBe(0);
    expect(FLIGHT_HOTEL_CANDIDATE_COUNT.free).toBe(0);
  });

  it('pro: 3', () => {
    expect(FLIGHT_HOTEL_CANDIDATE_COUNT.pro).toBe(3);
  });

  it('premium/admin: 7', () => {
    expect(FLIGHT_HOTEL_CANDIDATE_COUNT.premium).toBe(7);
    expect(FLIGHT_HOTEL_CANDIDATE_COUNT.admin).toBe(7);
  });
});

describe('canAccessCategory', () => {
  it('admin can access all categories', () => {
    for (const cat of ALL_TRAVEL_INFO_CATEGORIES) {
      expect(canAccessCategory('admin', cat)).toBe(true);
    }
  });

  it('premium can access all categories', () => {
    for (const cat of ALL_TRAVEL_INFO_CATEGORIES) {
      expect(canAccessCategory('premium', cat)).toBe(true);
    }
  });

  it('pro can only access free categories', () => {
    for (const cat of FREE_TRAVEL_INFO_CATEGORIES) {
      expect(canAccessCategory('pro', cat)).toBe(true);
    }
    expect(canAccessCategory('pro', 'visa')).toBe(false);
    expect(canAccessCategory('pro', 'transport')).toBe(false);
  });

  it('free can only access free categories', () => {
    for (const cat of FREE_TRAVEL_INFO_CATEGORIES) {
      expect(canAccessCategory('free', cat)).toBe(true);
    }
    expect(canAccessCategory('free', 'visa')).toBe(false);
  });

  it('anonymous can only access free categories', () => {
    for (const cat of FREE_TRAVEL_INFO_CATEGORIES) {
      expect(canAccessCategory('anonymous', cat)).toBe(true);
    }
    expect(canAccessCategory('anonymous', 'events')).toBe(false);
  });
});

describe('getAccessibleCategories', () => {
  it('admin gets all categories', () => {
    const cats = getAccessibleCategories('admin');
    expect(cats).toEqual([...ALL_TRAVEL_INFO_CATEGORIES]);
  });

  it('premium gets all categories', () => {
    const cats = getAccessibleCategories('premium');
    expect(cats).toEqual([...ALL_TRAVEL_INFO_CATEGORIES]);
  });

  it('pro gets only free categories', () => {
    const cats = getAccessibleCategories('pro');
    expect(cats).toEqual([...FREE_TRAVEL_INFO_CATEGORIES]);
  });

  it('free gets only free categories', () => {
    const cats = getAccessibleCategories('free');
    expect(cats).toEqual([...FREE_TRAVEL_INFO_CATEGORIES]);
  });

  it('anonymous gets only free categories', () => {
    const cats = getAccessibleCategories('anonymous');
    expect(cats).toEqual([...FREE_TRAVEL_INFO_CATEGORIES]);
  });
});

describe('isUnlimited', () => {
  it('returns true for limit=-1', () => {
    expect(isUnlimited({ limit: -1, period: 'month' })).toBe(true);
  });

  it('returns true for period=unlimited', () => {
    expect(isUnlimited({ limit: 100, period: 'unlimited' })).toBe(true);
  });

  it('returns false for normal limits', () => {
    expect(isUnlimited({ limit: 3, period: 'month' })).toBe(false);
  });
});
