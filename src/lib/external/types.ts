export type ExternalProvider = 'amadeus';

export interface GeoFilter {
  lat: number;
  lng: number;
  radiusKm?: number;
}

export interface HotelSearchCriteria {
  cityCode?: string;
  geo?: GeoFilter;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
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
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  currencyCode?: string;
  maxPrice?: number;
  sort?: 'price' | 'duration';
  limit: number;
}

export interface NormalizedHotelResult {
  id: string;
  provider: ExternalProvider;
  name: string;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  address: string | null;
  deeplink: string | null;
  raw: unknown;
}

export interface NormalizedFlightResult {
  id: string;
  provider: ExternalProvider;
  carrier: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  duration: string | null;
  price: number | null;
  currency: string | null;
  deeplink: string | null;
  raw: unknown;
}

export interface ExternalProviderClient {
  name: ExternalProvider;
  searchHotels(criteria: HotelSearchCriteria): Promise<NormalizedHotelResult[]>;
  searchFlights(criteria: FlightSearchCriteria): Promise<NormalizedFlightResult[]>;
}
