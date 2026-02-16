import type { FlightSearchCondition, HotelSearchCondition } from '@/lib/external/schemas';

export type ExternalProvider = 'amadeus' | string;

export interface NormalizedExternalResult {
  externalId: string;
  provider: ExternalProvider;
  name: string;
  description?: string;
  price: number | null;
  currency: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  imageUrl?: string | null;
  deeplink?: string | null;
  metadata: Record<string, unknown>;
}

export interface ExternalSearchProvider {
  provider: ExternalProvider;
  searchHotels(input: HotelSearchCondition): Promise<NormalizedExternalResult[]>;
  searchFlights(input: FlightSearchCondition): Promise<NormalizedExternalResult[]>;
}
