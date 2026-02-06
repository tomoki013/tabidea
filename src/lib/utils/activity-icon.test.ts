import { describe, it, expect } from 'vitest';
import {
  getActivityCategory,
  getActivityIcon,
  getTimePeriod,
  groupActivitiesByTimePeriod,
} from './activity-icon';

describe('getActivityCategory', () => {
  it('宿泊系キーワードを判定', () => {
    expect(getActivityCategory('ホテルにチェックイン')).toBe('accommodation');
    expect(getActivityCategory('旅館到着')).toBe('accommodation');
    expect(getActivityCategory('チェックアウト')).toBe('accommodation');
  });

  it('食事系キーワードを判定', () => {
    expect(getActivityCategory('朝食')).toBe('meal');
    expect(getActivityCategory('ランチタイム')).toBe('meal');
    expect(getActivityCategory('ディナー')).toBe('meal');
    expect(getActivityCategory('カフェでひとやすみ')).toBe('meal');
  });

  it('移動系キーワードを判定', () => {
    expect(getActivityCategory('新幹線で移動')).toBe('transit');
    expect(getActivityCategory('空港へ出発')).toBe('transit');
    expect(getActivityCategory('レンタカーでドライブ')).toBe('transit');
  });

  it('観光系キーワードを判定', () => {
    expect(getActivityCategory('金閣寺を見学')).toBe('sightseeing');
    expect(getActivityCategory('街を散策')).toBe('sightseeing');
    expect(getActivityCategory('美術館鑑賞')).toBe('sightseeing');
  });

  it('ショッピング系キーワードを判定', () => {
    expect(getActivityCategory('お土産を買い物')).toBe('shopping');
    expect(getActivityCategory('ショッピングモール')).toBe('shopping');
  });

  it('該当なしの場合はotherを返す', () => {
    expect(getActivityCategory('自由時間')).toBe('other');
    expect(getActivityCategory('フリータイム')).toBe('other');
  });
});

describe('getActivityIcon', () => {
  it('種別に応じたアイコンを返す', () => {
    expect(getActivityIcon('ホテル').icon).toBe('🏨');
    expect(getActivityIcon('ランチ').icon).toBe('🍽️');
    expect(getActivityIcon('移動').icon).toBe('🚃');
    expect(getActivityIcon('観光').icon).toBe('📸');
    expect(getActivityIcon('ショッピング').icon).toBe('🛍️');
    expect(getActivityIcon('自由時間').icon).toBe('🎯');
  });
});

describe('getTimePeriod', () => {
  it('朝の時間帯を判定', () => {
    expect(getTimePeriod('07:00').period).toBe('morning');
    expect(getTimePeriod('09:30').period).toBe('morning');
    expect(getTimePeriod('10:59').period).toBe('morning');
  });

  it('昼の時間帯を判定', () => {
    expect(getTimePeriod('11:00').period).toBe('afternoon');
    expect(getTimePeriod('14:30').period).toBe('afternoon');
    expect(getTimePeriod('16:59').period).toBe('afternoon');
  });

  it('夜の時間帯を判定', () => {
    expect(getTimePeriod('17:00').period).toBe('evening');
    expect(getTimePeriod('19:30').period).toBe('evening');
    expect(getTimePeriod('21:00').period).toBe('evening');
  });

  it('不正な時間文字列はmorningを返す', () => {
    expect(getTimePeriod('不明').period).toBe('morning');
  });
});

describe('groupActivitiesByTimePeriod', () => {
  it('アクティビティを時間帯ごとにグループ化', () => {
    const activities = [
      { time: '08:00', name: '朝食' },
      { time: '10:00', name: '散策' },
      { time: '12:00', name: 'ランチ' },
      { time: '14:00', name: '美術館' },
      { time: '18:00', name: 'ディナー' },
    ];

    const groups = groupActivitiesByTimePeriod(activities);
    expect(groups).toHaveLength(3);
    expect(groups[0].period.period).toBe('morning');
    expect(groups[0].activities).toHaveLength(2);
    expect(groups[1].period.period).toBe('afternoon');
    expect(groups[1].activities).toHaveLength(2);
    expect(groups[2].period.period).toBe('evening');
    expect(groups[2].activities).toHaveLength(1);
  });

  it('空配列は空配列を返す', () => {
    const groups = groupActivitiesByTimePeriod([]);
    expect(groups).toHaveLength(0);
  });
});
