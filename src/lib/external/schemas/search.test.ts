import { describe, expect, it } from 'vitest';

import { externalHotelsSearchBodySchema } from '@/lib/external/schemas/search';

describe('externalHotelsSearchBodySchema', () => {
  it('accepts valid criteria json', () => {
    const parsed = externalHotelsSearchBodySchema.safeParse({
      planId: '11111111-1111-1111-1111-111111111111',
      provider: 'amadeus',
      criteria: {
        cityCode: 'TYO',
        checkInDate: '2026-03-01',
        checkOutDate: '2026-03-03',
        guests: 2,
        limit: 3,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid limits', () => {
    const parsed = externalHotelsSearchBodySchema.safeParse({
      planId: '11111111-1111-1111-1111-111111111111',
      provider: 'amadeus',
      criteria: {
        cityCode: 'TYO',
        checkInDate: '2026-03-01',
        checkOutDate: '2026-03-03',
        guests: 2,
        limit: 9,
      },
    });

    expect(parsed.success).toBe(false);
  });
});
