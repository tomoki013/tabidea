import { z } from 'zod';

const IATACodeSchema = z.string().regex(/^[A-Z]{3}$/).optional();

export const HotelSearchConditionSchema = z.object({
  cityCode: IATACodeSchema,
  geo: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radius: z.number().min(1).max(50).default(10),
  }).optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(10).default(2),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    currency: z.string().length(3).default('JPY'),
  }).optional(),
  starRating: z.array(z.number().int().min(1).max(5)).max(5).optional(),
  amenities: z.array(z.string().min(1).max(50)).max(12).optional(),
  sort: z.enum(['price', 'distance', 'rating']).default('price'),
  limit: z.number().int().min(1).max(5).default(3),
  keyword: z.string().max(120).optional(),
}).refine((value) => Boolean(value.cityCode || value.geo), {
  message: 'cityCode または geo のいずれかを指定してください。',
});

export const FlightSearchConditionSchema = z.object({
  origin: z.string().regex(/^[A-Z]{3}$/),
  destination: z.string().regex(/^[A-Z]{3}$/),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(9).default(1),
  maxStops: z.number().int().min(0).max(3).default(1),
  travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
  currencyCode: z.string().length(3).default('JPY'),
  sort: z.enum(['price', 'duration']).default('price'),
  limit: z.number().int().min(1).max(5).default(3),
});

export const ExternalSelectionSchema = z.object({
  itemId: z.string().uuid(),
  provider: z.string().min(2).max(64),
  externalId: z.string().min(1).max(200),
  deeplink: z.string().url().nullable().optional(),
  priceSnapshot: z.number().min(0).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const AIConditionRequestSchema = z.object({
  type: z.enum(['hotel', 'flight']),
  prompt: z.string().min(10).max(2000),
  context: z.record(z.unknown()).optional(),
});

export type HotelSearchCondition = z.infer<typeof HotelSearchConditionSchema>;
export type FlightSearchCondition = z.infer<typeof FlightSearchConditionSchema>;
