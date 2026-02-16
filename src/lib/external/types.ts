export type ExternalProvider = 'amadeus';

export interface GeoSearchConstraint {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface HotelSearchCriteria {
  cityCode?: string;
  geo?: GeoSearchConstraint;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  priceRange?: { min?: number; max?: number };
  starRating?: number[];
  amenities?: string[];
  sort?: 'price' | 'rating' | 'distance';
  limit: number;
}

export interface FlightSearchCriteria {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabinClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  currencyCode?: string;
  max?: number;
}

export interface ExternalHotelResult {
  id: string;
  provider: ExternalProvider;
  name: string;
  price: number | null;
  currency: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  deeplink: string | null;
  imageUrl: string | null;
  distanceKm: number | null;
  raw: Record<string, unknown>;
}

export interface ExternalFlightResult {
  id: string;
  provider: ExternalProvider;
  summary: string;
  price: number | null;
  currency: string | null;
  deeplink: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  raw: Record<string, unknown>;
}

export interface ExternalSearchProvider {
  provider: ExternalProvider;
  searchHotels(criteria: HotelSearchCriteria): Promise<ExternalHotelResult[]>;
  searchFlights(criteria: FlightSearchCriteria): Promise<ExternalFlightResult[]>;
}
