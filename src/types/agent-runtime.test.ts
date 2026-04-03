import { describe, expect, it } from 'vitest';
import {
  isWeatherFallbackReplanScope,
  normalizeTripReplanScope,
} from './agent-runtime';

describe('agent-runtime contracts', () => {
  it('normalizes legacy block scope names to canonical replan scopes', () => {
    expect(normalizeTripReplanScope({
      type: 'block',
      dayIndex: 1,
      blockId: 'blk_123',
    })).toEqual({
      type: 'block_replan',
      dayIndex: 1,
      blockId: 'blk_123',
    });
  });

  it('preserves canonical scope names as-is', () => {
    expect(normalizeTripReplanScope({
      type: 'style_replan',
    })).toEqual({
      type: 'style_replan',
    });
  });

  it('detects weather fallback scopes across legacy and canonical names', () => {
    expect(isWeatherFallbackReplanScope({ type: 'weather_fallback' })).toBe(true);
    expect(isWeatherFallbackReplanScope({ type: 'weather_fallback_replan' })).toBe(true);
    expect(isWeatherFallbackReplanScope({ type: 'style_replan' })).toBe(false);
  });
});
