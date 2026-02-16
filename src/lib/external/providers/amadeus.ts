import type {
  ExternalFlightResult,
  ExternalHotelResult,
  ExternalSearchProvider,
  FlightSearchCriteria,
  HotelSearchCriteria,
} from '@/lib/external/types';

class AmadeusProvider implements ExternalSearchProvider {
  provider = 'amadeus' as const;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) {
      return this.tokenCache.token;
    }

    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Amadeus credentials are not configured');
    }

    const base = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
    const response = await fetch(`${base}/v1/security/oauth2/token`, {
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
      throw new Error(`Amadeus auth failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.tokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in * 1000),
    };
    return data.access_token;
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<ExternalHotelResult[]> {
    const token = await this.getAccessToken();
    const base = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
    const query = new URLSearchParams({
      checkInDate: criteria.checkInDate,
      checkOutDate: criteria.checkOutDate,
      adults: String(criteria.guests),
      roomQuantity: '1',
      bestRateOnly: 'true',
      currency: 'JPY',
    });

    if (criteria.cityCode) {
      query.set('cityCode', criteria.cityCode.toUpperCase());
    }

    if (criteria.limit) {
      query.set('hotelSource', 'ALL');
    }

    const response = await fetch(`${base}/v3/shopping/hotel-offers?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Hotel search failed: ${response.status}`);
    }

    const data = await response.json() as { data?: Array<Record<string, unknown>> };
    return (data.data ?? []).slice(0, criteria.limit).map((offer) => {
      const hotel = (offer.hotel as Record<string, unknown>) || {};
      const first = Array.isArray(offer.offers) ? (offer.offers[0] as Record<string, unknown>) : null;
      const priceData = (first?.price as Record<string, unknown>) || null;
      const geoCode = (hotel.geoCode as Record<string, unknown>) || null;

      return {
        id: String(offer.id ?? hotel.hotelId ?? crypto.randomUUID()),
        provider: this.provider,
        name: String(hotel.name ?? 'Unknown Hotel'),
        price: priceData?.total ? Number(priceData.total) : null,
        currency: priceData?.currency ? String(priceData.currency) : null,
        rating: hotel.rating ? Number(hotel.rating) : null,
        latitude: geoCode?.latitude ? Number(geoCode.latitude) : null,
        longitude: geoCode?.longitude ? Number(geoCode.longitude) : null,
        deeplink: first?.self ? String(first.self) : null,
        imageUrl: null,
        distanceKm: null,
        raw: offer,
      };
    });
  }

  async searchFlights(criteria: FlightSearchCriteria): Promise<ExternalFlightResult[]> {
    const token = await this.getAccessToken();
    const base = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
    const query = new URLSearchParams({
      originLocationCode: criteria.originLocationCode.toUpperCase(),
      destinationLocationCode: criteria.destinationLocationCode.toUpperCase(),
      departureDate: criteria.departureDate,
      adults: String(criteria.adults),
      max: String(criteria.max ?? 5),
    });

    if (criteria.returnDate) query.set('returnDate', criteria.returnDate);
    if (criteria.cabinClass) query.set('travelClass', criteria.cabinClass);
    if (criteria.nonStop !== undefined) query.set('nonStop', String(criteria.nonStop));
    if (criteria.currencyCode) query.set('currencyCode', criteria.currencyCode.toUpperCase());

    const response = await fetch(`${base}/v2/shopping/flight-offers?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Flight search failed: ${response.status}`);
    }

    const data = await response.json() as { data?: Array<Record<string, unknown>> };
    return (data.data ?? []).slice(0, criteria.max ?? 5).map((offer) => {
      const itineraries = Array.isArray(offer.itineraries) ? offer.itineraries : [];
      const firstItinerary = itineraries[0] as Record<string, unknown> | undefined;
      const segments = Array.isArray(firstItinerary?.segments) ? firstItinerary.segments : [];
      const firstSegment = segments[0] as Record<string, unknown> | undefined;
      const lastSegment = segments[segments.length - 1] as Record<string, unknown> | undefined;
      const departure = (firstSegment?.departure as Record<string, unknown>) || {};
      const arrival = (lastSegment?.arrival as Record<string, unknown>) || {};
      const price = (offer.price as Record<string, unknown>) || {};

      return {
        id: String(offer.id ?? crypto.randomUUID()),
        provider: this.provider,
        summary: `${criteria.originLocationCode.toUpperCase()} → ${criteria.destinationLocationCode.toUpperCase()}`,
        price: price.total ? Number(price.total) : null,
        currency: price.currency ? String(price.currency) : null,
        deeplink: null,
        departureAt: departure.at ? String(departure.at) : null,
        arrivalAt: arrival.at ? String(arrival.at) : null,
        raw: offer,
      };
    });
  }
}

export const amadeusProvider = new AmadeusProvider();
