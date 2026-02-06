import { describe, it, expect } from 'vitest';
import { classifyActivity, shouldSkipPlacesSearch } from './activity-classifier';

describe('classifyActivity', () => {
  it('should skip transit activities with Japanese keywords', () => {
    const result = classifyActivity('アスワン出発、砂漠を越えてアブシンベルへ');
    expect(result.decision).toBe('skip');
    expect(result.category).toBe('transport');
  });

  it('should skip activities with transport emoji prefix', () => {
    const result = classifyActivity('🚃 アスワン出発、砂漠を越えてアブシンベルへ');
    expect(result.decision).toBe('skip');
    expect(result.category).toBe('transport');
  });

  it('should skip check-in activities', () => {
    const result = classifyActivity('ホテルチェックイン');
    expect(result.decision).toBe('skip');
    expect(result.category).toBe('hotel');
  });

  it('should skip check-out activities', () => {
    const result = classifyActivity('チェックアウト・出発準備');
    expect(result.decision).toBe('skip');
    expect(result.category).toBe('hotel');
  });

  it('should skip free time activities', () => {
    const result = classifyActivity('自由時間');
    expect(result.decision).toBe('skip');
    expect(result.category).toBe('free_time');
  });

  it('should search for sightseeing spots', () => {
    const result = classifyActivity('アブシンベル神殿');
    expect(result.decision).toBe('search');
    expect(result.category).toBe('sightseeing');
  });

  it('should search for restaurants', () => {
    const result = classifyActivity('地元のレストランでランチ');
    expect(result.decision).toBe('search');
  });

  it('should respect AI activityType when set', () => {
    const transitResult = classifyActivity('アブシンベルへ移動', '', 'transit');
    expect(transitResult.decision).toBe('skip');

    const spotResult = classifyActivity('移動しながら楽しむ展望台', '', 'spot');
    expect(spotResult.decision).toBe('search');
  });

  it('should skip activities with movement pattern "から〜へ"', () => {
    const result = classifyActivity('カイロからルクソールへ移動');
    expect(result.decision).toBe('skip');
  });

  it('should skip departure activities in English', () => {
    const result = classifyActivity('Departure from Aswan');
    expect(result.decision).toBe('skip');
  });
});

describe('shouldSkipPlacesSearch', () => {
  it('returns true for transit', () => {
    expect(shouldSkipPlacesSearch('出発')).toBe(true);
  });

  it('returns false for sightseeing', () => {
    expect(shouldSkipPlacesSearch('ピラミッド見学')).toBe(false);
  });
});
