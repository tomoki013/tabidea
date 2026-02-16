export type ExternalProvider = 'amadeus';

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface GeoQuery {
  lat: number;
  lng: number;
  radiusKm?: number;
}

export interface HotelSearchCriteria {
  provider?: ExternalProvider;
  cityCode?: string;
  geo?: GeoQuery;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms?: number;
  priceRange?: PriceRange;
  starRatings?: number[];
  amenities?: string[];
  sort?: 'price' | 'rating' | 'distance';
  limit?: number;
  planId: string;
  itemId?: string;
}

export interface FlightSearchCriteria {
  provider?: ExternalProvider;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  maxPrice?: number;
  nonstop?: boolean;
  sort?: 'price' | 'duration';
  limit?: number;
  planId: string;
  itemId?: string;
}

export interface ExternalCandidate {
  id: string;
  provider: ExternalProvider;
  name: string;
  price: number | null;
  currency: string | null;
  rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  deeplink?: string | null;
  locationLabel?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ExternalSearchProvider {
  searchHotels(criteria: HotelSearchCriteria): Promise<ExternalCandidate[]>;
  searchFlights(criteria: FlightSearchCriteria): Promise<ExternalCandidate[]>;
}
