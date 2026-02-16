import { z } from 'zod';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const hotelSearchSchema = z.object({
  cityCode: z.string().trim().length(3).optional(),
  geo: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusKm: z.number().min(1).max(30).optional(),
  }).optional(),
  checkInDate: z.string().regex(isoDate),
  checkOutDate: z.string().regex(isoDate),
  guests: z.number().int().min(1).max(8),
  priceRange: z.object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
    currency: z.string().length(3).optional(),
  }).optional(),
  starRating: z.array(z.number().int().min(1).max(5)).max(5).optional(),
  amenities: z.array(z.string().min(2).max(40)).max(12).optional(),
  sort: z.enum(['price', 'rating', 'distance']).optional(),
  limit: z.number().int().min(1).max(5),
}).refine((value) => Boolean(value.cityCode || value.geo), {
  message: 'cityCode または geo が必要です',
  path: ['cityCode'],
});

export const flightSearchSchema = z.object({
  originLocationCode: z.string().trim().length(3),
  destinationLocationCode: z.string().trim().length(3),
  departureDate: z.string().regex(isoDate),
  returnDate: z.string().regex(isoDate).optional(),
  adults: z.number().int().min(1).max(8),
  travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
  nonStop: z.boolean().optional(),
  currencyCode: z.string().trim().length(3).optional(),
  maxPrice: z.number().int().min(1).max(1000000).optional(),
  sort: z.enum(['price', 'duration']).optional(),
  limit: z.number().int().min(1).max(5),
});
