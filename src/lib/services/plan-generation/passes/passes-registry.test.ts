import { describe, it, expect } from 'vitest';
import { getPass } from './index';
import type { PassId } from '@/types/plan-generation';

describe('getPass (pass registry)', () => {
  const registeredPasses: PassId[] = [
    'normalize',
    'draft_generate',
    'rule_score',
    'local_repair',
    'selective_verify',
    'timeline_construct',
    'narrative_polish',
  ];

  for (const passId of registeredPasses) {
    it(`returns a function for "${passId}"`, () => {
      const fn = getPass(passId);
      expect(fn).not.toBeNull();
      expect(typeof fn).toBe('function');
    });
  }

  it('returns null for unregistered pass', () => {
    expect(getPass('unknown_pass' as PassId)).toBeNull();
  });
});
