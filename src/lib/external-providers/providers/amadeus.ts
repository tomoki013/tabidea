import type {
  ExternalCandidate,
  ExternalSearchProvider,
  FlightSearchCriteria,
  HotelSearchCriteria,
} from '@/lib/external-providers/types';

interface AmadeusTokenResponse {
  access_token: string;
}

export class AmadeusProvider implements ExternalSearchProvider {
  private baseUrl = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';

  private async getAccessToken(): Promise<string> {
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('amadeus_credentials_missing');
    }

    const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`amadeus_token_failed:${response.status}`);
    }

    const data = (await response.json()) as AmadeusTokenResponse;
    return data.access_token;
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<ExternalCandidate[]> {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      radius: String(criteria.geo?.radiusKm ?? 10),
      radiusUnit: 'KM',
      hotelSource: 'ALL',
    });

    if (criteria.cityCode) params.set('cityCode', criteria.cityCode);
    if (criteria.geo?.lat != null && criteria.geo.lng != null) {
      params.set('latitude', String(criteria.geo.lat));
      params.set('longitude', String(criteria.geo.lng));
    }

    const listResponse = await fetch(`${this.baseUrl}/v1/reference-data/locations/hotels/by-geocode?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!listResponse.ok) {
      throw new Error(`amadeus_hotels_failed:${listResponse.status}`);
    }

    const listData = await listResponse.json() as { data?: Array<Record<string, unknown>> };
    const hotelIds = (listData.data ?? []).slice(0, criteria.limit ?? 3).map((hotel) => String(hotel.hotelId)).filter(Boolean);
    if (hotelIds.length === 0) return [];

    const offerParams = new URLSearchParams({
      hotelIds: hotelIds.join(','),
      checkInDate: criteria.checkInDate,
      checkOutDate: criteria.checkOutDate,
      adults: String(criteria.guests),
      roomQuantity: String(criteria.rooms ?? 1),
      bestRateOnly: 'true',
      currency: 'JPY',
    });

    const offerResponse = await fetch(`${this.baseUrl}/v3/shopping/hotel-offers?${offerParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!offerResponse.ok) {
      throw new Error(`amadeus_hotel_offers_failed:${offerResponse.status}`);
    }

    const offerData = await offerResponse.json() as { data?: Array<Record<string, unknown>> };

    return (offerData.data ?? []).slice(0, criteria.limit ?? 3).map((offer) => {
      const hotel = offer.hotel as { hotelId?: string; name?: string; rating?: string | number; latitude?: string | number; longitude?: string | number; address?: { lines?: string[] }; amenities?: string[] } | undefined;
      const offers = offer.offers as Array<{ price?: { total?: string; currency?: string }; self?: string }> | undefined;
      const firstOffer = offers?.[0];
      return {
        id: String(hotel?.hotelId ?? offer.hotelId),
        provider: 'amadeus',
        name: String(hotel?.name ?? 'Hotel'),
        price: firstOffer?.price?.total ? Number(firstOffer.price.total) : null,
        currency: firstOffer?.price?.currency ?? null,
        rating: hotel?.rating ? Number(hotel.rating) : null,
        latitude: hotel?.latitude ? Number(hotel.latitude) : null,
        longitude: hotel?.longitude ? Number(hotel.longitude) : null,
        locationLabel: hotel?.address?.lines?.join(' ') ?? null,
        deeplink: firstOffer?.self ?? null,
        metadata: {
          amenities: hotel?.amenities ?? [],
          type: 'hotel',
        },
      } as ExternalCandidate;
    });
  }

  async searchFlights(criteria: FlightSearchCriteria): Promise<ExternalCandidate[]> {
    const token = await this.getAccessToken();
    const params = new URLSearchParams({
      originLocationCode: criteria.origin,
      destinationLocationCode: criteria.destination,
      departureDate: criteria.departureDate,
      adults: String(criteria.adults),
      max: String(criteria.limit ?? 3),
      currencyCode: 'JPY',
    });

    if (criteria.returnDate) params.set('returnDate', criteria.returnDate);
    if (criteria.nonstop != null) params.set('nonStop', String(criteria.nonstop));
    if (criteria.maxPrice) params.set('maxPrice', String(criteria.maxPrice));
    if (criteria.cabinClass) params.set('travelClass', criteria.cabinClass);

    const response = await fetch(`${this.baseUrl}/v2/shopping/flight-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`amadeus_flights_failed:${response.status}`);
    }

    const data = await response.json() as { data?: Array<Record<string, unknown>> };

    return (data.data ?? []).slice(0, criteria.limit ?? 3).map((offer) => {
      const price = offer.price as { total?: string; currency?: string } | undefined;
      const validatingAirlineCodes = (offer.validatingAirlineCodes as string[] | undefined) ?? [];
      return ({
      id: String(offer.id),
      provider: 'amadeus',
      name: `${criteria.origin} → ${criteria.destination}`,
      price: price?.total ? Number(price.total) : null,
      currency: price?.currency ?? null,
      deeplink: typeof offer.self === 'string' ? offer.self : null,
      metadata: {
        type: 'flight',
        oneWay: !criteria.returnDate,
        validatingAirlineCodes,
      },
    });
  });
  }
}
