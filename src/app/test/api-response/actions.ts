'use server';

import { getSupportedDestinations, getCountryCodeByDestination } from '@/lib/travel-info/sources/mofa-api';

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
}

export async function fetchRawData(password: string, source: string, destination: string): Promise<RawDataResult> {
  const isValid = await verifyPassword(password);
  if (!isValid) {
    return { success: false, message: 'Invalid password' };
  }

  if (source === 'mofa') {
    return fetchMofaData(destination);
  }

  return { success: false, message: `Source '${source}' not implemented` };
}

async function fetchMofaData(destination: string): Promise<RawDataResult> {
  const countryCode = getCountryCodeByDestination(destination);
  if (!countryCode) {
    return { success: false, message: `Could not resolve country code for '${destination}'` };
  }

  const url = `https://www.ezairyu.mofa.go.jp/opendata/country/${countryCode}A.xml`;

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
