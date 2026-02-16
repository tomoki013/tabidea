import type { ExternalSearchProvider, NormalizedExternalResult } from '@/lib/external/types';
import type { FlightSearchCondition, HotelSearchCondition } from '@/lib/external/schemas';

const AMADEUS_BASE = process.env.AMADEUS_BASE_URL ?? 'https://test.api.amadeus.com';

async function fetchAmadeusToken(): Promise<string | null> {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

function mapHotelResult(item: Record<string, unknown>): NormalizedExternalResult {
  const offer = item.offers?.[0];
  const hotel = item.hotel ?? {};
  return {
    externalId: String(hotel.hotelId ?? item.id),
    provider: 'amadeus',
    name: hotel.name ?? 'Unknown Hotel',
    description: hotel.description?.text ?? undefined,
    price: offer?.price?.total ? Number(offer.price.total) : null,
    currency: offer?.price?.currency ?? null,
    latitude: hotel.latitude ? Number(hotel.latitude) : null,
    longitude: hotel.longitude ? Number(hotel.longitude) : null,
    rating: hotel.rating ? Number(hotel.rating) : null,
    imageUrl: null,
    deeplink: offer?.self ?? null,
    metadata: item,
  };
}

function mapFlightResult(item: Record<string, unknown>): NormalizedExternalResult {
  const price = item.price;
  const itinerary = item.itineraries?.[0];
  const firstSeg = itinerary?.segments?.[0];
  const lastSeg = itinerary?.segments?.[itinerary?.segments?.length - 1];
  const routeLabel = firstSeg && lastSeg
    ? `${firstSeg.departure?.iataCode} → ${lastSeg.arrival?.iataCode}`
    : 'Flight Offer';

  return {
    externalId: String(item.id),
    provider: 'amadeus',
    name: routeLabel,
    description: `${item.validatingAirlineCodes?.join(', ') ?? 'Airline unknown'} / ${itinerary?.duration ?? ''}`.trim(),
    price: price?.total ? Number(price.total) : null,
    currency: price?.currency ?? null,
    rating: null,
    imageUrl: null,
    deeplink: item?.links?.flightOffers ?? null,
    metadata: item,
  };
}

async function searchAmadeusHotels(input: HotelSearchCondition): Promise<NormalizedExternalResult[]> {
  const token = await fetchAmadeusToken();
  if (!token) {
    return [];
  }

  const params = new URLSearchParams({
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    adults: String(input.guests),
    bestRateOnly: 'true',
  });

  if (input.cityCode) params.set('cityCode', input.cityCode);
  if (input.geo) params.set('latitude', String(input.geo.lat));
  if (input.geo) params.set('longitude', String(input.geo.lng));
  if (input.geo) params.set('radius', String(input.geo.radius));
  if (input.priceRange?.max) params.set('priceRange', `0-${Math.round(input.priceRange.max)}`);
  if (input.limit) params.set('hotelSource', 'ALL');

  const res = await fetch(`${AMADEUS_BASE}/v3/shopping/hotel-offers?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Hotel search failed (${res.status})`);
  }

  const data = await res.json();
  return (data.data ?? []).slice(0, input.limit).map(mapHotelResult);
}

async function searchAmadeusFlights(input: FlightSearchCondition): Promise<NormalizedExternalResult[]> {
  const token = await fetchAmadeusToken();
  if (!token) return [];

  const params = new URLSearchParams({
    originLocationCode: input.origin,
    destinationLocationCode: input.destination,
    departureDate: input.departureDate,
    adults: String(input.adults),
    max: String(input.limit),
    currencyCode: input.currencyCode,
    travelClass: input.travelClass,
    nonStop: input.maxStops === 0 ? 'true' : 'false',
  });
  if (input.returnDate) params.set('returnDate', input.returnDate);

  const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Flight search failed (${res.status})`);
  }

  const data = await res.json();
  return (data.data ?? []).slice(0, input.limit).map(mapFlightResult);
}

export const amadeusProvider: ExternalSearchProvider = {
  provider: 'amadeus',
  searchHotels: searchAmadeusHotels,
  searchFlights: searchAmadeusFlights,
};

export function resolveExternalProvider(provider?: string): ExternalSearchProvider {
  if (!provider || provider === 'amadeus') return amadeusProvider;
  return amadeusProvider;
}
