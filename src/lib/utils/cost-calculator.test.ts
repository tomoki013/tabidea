import { describe, it, expect } from 'vitest';
import { calculateTravelCost, formatCurrency, formatCostRange } from './cost-calculator';

describe('calculateTravelCost', () => {
  it('国内旅行のコストを計算', () => {
    const result = calculateTravelCost({
      destination: '京都',
      days: 3,
      budget: '中程度',
      companions: '2人',
    });

    expect(result.isDomestic).toBe(true);
    expect(result.days).toBe(3);
    expect(result.nights).toBe(2);
    expect(result.budgetLevel).toBe('standard');
    expect(result.total.min).toBeGreaterThan(0);
    expect(result.total.max).toBeGreaterThan(result.total.min);
    expect(result.breakdown.accommodation.min).toBeGreaterThan(0);
    expect(result.savingTips.length).toBeGreaterThan(0);
  });

  it('海外旅行のコストを計算', () => {
    const result = calculateTravelCost({
      destination: 'パリ',
      days: 5,
      budget: '高め',
      companions: 'カップル',
    });

    expect(result.isDomestic).toBe(false);
    expect(result.days).toBe(5);
    expect(result.nights).toBe(4);
    expect(result.budgetLevel).toBe('high');
    expect(result.regionMultiplier).toBe(1.5);
    expect(result.total.min).toBeGreaterThan(0);
  });

  it('1日旅行は宿泊費0', () => {
    const result = calculateTravelCost({
      destination: '東京',
      days: 1,
      budget: '中程度',
      companions: '1人',
    });

    expect(result.nights).toBe(0);
    expect(result.breakdown.accommodation.min).toBe(0);
    expect(result.breakdown.accommodation.max).toBe(0);
  });

  it('安めの予算レベルを判定', () => {
    const result = calculateTravelCost({
      destination: '大阪',
      days: 2,
      budget: '安め',
      companions: 'ソロ',
    });

    expect(result.budgetLevel).toBe('saving');
  });
});

describe('formatCurrency', () => {
  it('JPYフォーマット', () => {
    expect(formatCurrency(50000)).toBe('¥50,000');
    expect(formatCurrency(100000)).toBe('¥100,000');
  });
});

describe('formatCostRange', () => {
  it('範囲をフォーマット', () => {
    const result = formatCostRange(50000, 70000);
    expect(result).toBe('¥50,000 〜 ¥70,000');
  });
});
