import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const hotelSearchSchema = z.object({
  provider: z.literal('amadeus').optional().default('amadeus'),
  cityCode: z.string().length(3).optional(),
  geo: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusKm: z.number().min(1).max(60).optional(),
  }).optional(),
  checkInDate: dateString,
  checkOutDate: dateString,
  guests: z.number().int().min(1).max(9),
  rooms: z.number().int().min(1).max(4).optional(),
  priceRange: z.object({
    min: z.number().min(0).max(1000000).optional(),
    max: z.number().min(0).max(1000000).optional(),
  }).optional(),
  starRatings: z.array(z.number().int().min(1).max(5)).max(5).optional(),
  amenities: z.array(z.string().min(1).max(40)).max(10).optional(),
  sort: z.enum(['price', 'rating', 'distance']).optional(),
  limit: z.number().int().min(1).max(5).optional().default(3),
  planId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  if (!value.cityCode && !value.geo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'cityCode or geo is required' });
  }
  if (value.priceRange?.min && value.priceRange?.max && value.priceRange.min > value.priceRange.max) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'priceRange.min must be <= priceRange.max' });
  }
});

export const flightSearchSchema = z.object({
  provider: z.literal('amadeus').optional().default('amadeus'),
  origin: z.string().length(3),
  destination: z.string().length(3),
  departureDate: dateString,
  returnDate: dateString.optional(),
  adults: z.number().int().min(1).max(9),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
  maxPrice: z.number().int().min(1).max(1000000).optional(),
  nonstop: z.boolean().optional(),
  sort: z.enum(['price', 'duration']).optional(),
  limit: z.number().int().min(1).max(5).optional().default(3),
  planId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
});

export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;
export type FlightSearchInput = z.infer<typeof flightSearchSchema>;
