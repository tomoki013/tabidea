'use server';

import { getSupportedDestinations, getCountryCodeByDestination } from '@/lib/travel-info/sources/mofa-api';
import { JAPANESE_TO_ENGLISH_COUNTRY } from '@/lib/travel-info/sources/country-api';

export async function verifyPassword(password: string): Promise<boolean> {
  return password === process.env.DEBUG_PAGE_PASSWORD;
}

export async function getDestinationList(): Promise<string[]> {
  return getSupportedDestinations();
}

export interface RawDataResult {
  success: boolean;
  message?: string;
  source?: string;
  destination?: string;
  countryCode?: string;
  url?: string;
  method?: string;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  size?: number;
}

export async function fetchRawData(password: string, source: string, destination: string, feedType?: string): Promise<RawDataResult> {
  const isValid = await verifyPassword(password);
  if (!isValid) {
    return { success: false, message: 'Invalid password' };
  }

  if (source === 'mofa') {
    return fetchMofaData(destination, feedType);
  } else if (source === 'restcountries') {
    return fetchRestCountriesData(destination);
  }

  return { success: false, message: `Source '${source}' not implemented` };
}

async function fetchMofaData(destination: string, feedType: string = 'A'): Promise<RawDataResult> {
  const countryCode = getCountryCodeByDestination(destination);
  if (!countryCode) {
    return { success: false, message: `Could not resolve country code for '${destination}'` };
  }

  // Construct URL based on feed type (A=All, L=Light, Normal=Standard)
  let suffix = 'A';
  if (feedType === 'L') suffix = 'L';
  else if (feedType === 'Normal') suffix = '';

  const url = `https://www.ezairyu.mofa.go.jp/opendata/country/${countryCode}${suffix}.xml`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'AI-Travel-Planner/1.0',
      },
      cache: 'no-store',
    });

    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      success: true,
      source: 'mofa',
      destination,
      countryCode,
      url,
      method: 'GET',
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      size: body.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      url,
      countryCode,
    };
  }
}

async function fetchRestCountriesData(destination: string): Promise<RawDataResult> {
  // First, try to resolve the destination directly to an English name
  let englishName = JAPANESE_TO_ENGLISH_COUNTRY[destination];

  // If not found, it might be a city or variation not in the map.
  // We can try to guess the country using MOFA's country code if available,
  // but for now let's rely on the direct map or return error.
  if (!englishName) {
     // Fallback: If it's a known Japanese destination, maybe we can find the country name from the key itself if it matches?
     // Or, check if the destination IS an English name? (Unlikely given the destination list is Japanese)

     return {
       success: false,
       message: `Could not resolve English country name for '${destination}'. Please add it to JAPANESE_TO_ENGLISH_COUNTRY in country-api.ts.`
     };
  }

  const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(englishName)}?fullText=true`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const body = await response.text(); // Get raw text to show exactly what came back
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      success: true,
      source: 'restcountries',
      destination,
      url,
      method: 'GET',
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      size: body.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      url,
    };
  }
}
