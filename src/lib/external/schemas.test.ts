import { describe, expect, it } from 'vitest';

import { FlightSearchConditionSchema, HotelSearchConditionSchema } from '@/lib/external/schemas';

describe('external schemas', () => {
  it('validates hotel condition', () => {
    const parsed = HotelSearchConditionSchema.safeParse({
      cityCode: 'TYO',
      checkInDate: '2026-03-01',
      checkOutDate: '2026-03-03',
      guests: 2,
      limit: 3,
      sort: 'price',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid flight condition', () => {
    const parsed = FlightSearchConditionSchema.safeParse({
      origin: 'NRT',
      destination: 'PAR',
      departureDate: 'bad-date',
    });
    expect(parsed.success).toBe(false);
  });
});
