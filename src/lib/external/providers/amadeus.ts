import type {
  ExternalProviderClient,
  FlightSearchCriteria,
  HotelSearchCriteria,
  NormalizedFlightResult,
  NormalizedHotelResult,
} from '@/lib/external/types';

interface AmadeusTokenResponse {
  access_token: string;
}

export class AmadeusProvider implements ExternalProviderClient {
  name = 'amadeus' as const;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  private get baseUrl() {
    return process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
  }

  private async getToken() {
    const now = Date.now();
    if (this.token && this.tokenExpiresAt > now + 60_000) return this.token;

    const key = process.env.AMADEUS_CLIENT_ID;
    const secret = process.env.AMADEUS_CLIENT_SECRET;
    if (!key || !secret) {
      throw new Error('Amadeus credentials are not configured');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    });

    const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to obtain Amadeus token');
    }

    const data = await response.json() as AmadeusTokenResponse & { expires_in?: number };
    this.token = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in ?? 1800) * 1000;
    return this.token;
  }

  private async request<T>(path: string, params: Record<string, string | number | boolean | undefined>) {
    const token = await this.getToken();
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') continue;
      query.set(key, String(value));
    }

    const response = await fetch(`${this.baseUrl}${path}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Amadeus API error: ${response.status} ${body.slice(0, 120)}`);
    }

    return response.json() as Promise<T>;
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<NormalizedHotelResult[]> {
    const payload = await this.request<{ data?: Array<Record<string, unknown>> }>(
      '/v1/reference-data/locations/hotels/by-city',
      {
        cityCode: criteria.cityCode,
        radius: criteria.geo?.radiusKm,
        radiusUnit: criteria.geo ? 'KM' : undefined,
        hotelSource: 'ALL',
      }
    );

    const hotels = (payload.data ?? []).slice(0, criteria.limit);

    return hotels.map((hotel, index) => ({
      id: String(hotel.hotelId ?? hotel.id ?? `hotel-${index}`),
      provider: this.name,
      name: String(hotel.name ?? 'Hotel'),
      rating: Number(hotel.rating ?? null) || null,
      latitude: Number((hotel.geoCode as { latitude?: number } | undefined)?.latitude ?? null) || null,
      longitude: Number((hotel.geoCode as { longitude?: number } | undefined)?.longitude ?? null) || null,
      price: criteria.priceRange?.max ?? null,
      currency: criteria.priceRange?.currency ?? null,
      imageUrl: null,
      address: (hotel.address as { lines?: string[] } | undefined)?.lines?.[0] ?? null,
      deeplink: null,
      raw: hotel,
    }));
  }

  async searchFlights(criteria: FlightSearchCriteria): Promise<NormalizedFlightResult[]> {
    const payload = await this.request<{ data?: Array<Record<string, unknown>> }>(
      '/v2/shopping/flight-offers',
      {
        originLocationCode: criteria.originLocationCode,
        destinationLocationCode: criteria.destinationLocationCode,
        departureDate: criteria.departureDate,
        returnDate: criteria.returnDate,
        adults: criteria.adults,
        travelClass: criteria.travelClass,
        nonStop: criteria.nonStop,
        currencyCode: criteria.currencyCode,
        maxPrice: criteria.maxPrice,
        max: criteria.limit,
      }
    );

    return (payload.data ?? []).slice(0, criteria.limit).map((offer, index) => {
      const firstItinerary = (offer.itineraries as Array<Record<string, unknown>> | undefined)?.[0];
      const firstSegment = (firstItinerary?.segments as Array<Record<string, unknown>> | undefined)?.[0];
      const lastSegment = (firstItinerary?.segments as Array<Record<string, unknown>> | undefined)?.slice(-1)[0];
      const priceObj = offer.price as { total?: string; currency?: string } | undefined;

      return {
        id: String(offer.id ?? `flight-${index}`),
        provider: this.name,
        carrier: (firstSegment?.carrierCode as string | undefined) ?? null,
        departureAt: (firstSegment?.departure as { at?: string } | undefined)?.at ?? null,
        arrivalAt: (lastSegment?.arrival as { at?: string } | undefined)?.at ?? null,
        duration: (firstItinerary?.duration as string | undefined) ?? null,
        price: priceObj?.total ? Number(priceObj.total) : null,
        currency: priceObj?.currency ?? null,
        deeplink: null,
        raw: offer,
      };
    });
  }
}
