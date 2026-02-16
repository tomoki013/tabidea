import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const hotelSearchCriteriaSchema = z.object({
  cityCode: z.string().length(3).optional(),
  geo: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusKm: z.number().min(1).max(50),
  }).optional(),
  checkInDate: dateString,
  checkOutDate: dateString,
  guests: z.number().int().min(1).max(8),
  priceRange: z.object({
    min: z.number().int().min(0).optional(),
    max: z.number().int().min(0).optional(),
  }).optional(),
  starRating: z.array(z.number().int().min(1).max(5)).max(5).optional(),
  amenities: z.array(z.string().min(1).max(40)).max(10).optional(),
  sort: z.enum(['price', 'rating', 'distance']).optional(),
  limit: z.number().int().min(1).max(5),
}).refine((value) => !!value.cityCode || !!value.geo, {
  message: 'cityCode or geo is required',
  path: ['cityCode'],
});

export const flightSearchCriteriaSchema = z.object({
  originLocationCode: z.string().length(3),
  destinationLocationCode: z.string().length(3),
  departureDate: dateString,
  returnDate: dateString.optional(),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(9).optional(),
  infants: z.number().int().min(0).max(9).optional(),
  cabinClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
  nonStop: z.boolean().optional(),
  currencyCode: z.string().length(3).optional(),
  max: z.number().int().min(1).max(5).optional(),
});

export const externalHotelsSearchBodySchema = z.object({
  planId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  provider: z.enum(['amadeus']).default('amadeus'),
  criteria: hotelSearchCriteriaSchema,
});

export const externalFlightsSearchBodySchema = z.object({
  planId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  provider: z.enum(['amadeus']).default('amadeus'),
  criteria: flightSearchCriteriaSchema,
});
