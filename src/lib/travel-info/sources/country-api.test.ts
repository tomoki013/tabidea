import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCountryApiSource, CountryApiSource } from './country-api';

describe('CountryApiSource', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should fetch country data successfully', async () => {
    const source = createCountryApiSource();
    const mockResponseData = [{
      name: { common: 'Japan', official: 'Japan' },
      currencies: { JPY: { name: 'Japanese yen', symbol: '¥' } },
      languages: { jpn: 'Japanese' },
      timezones: ['Asia/Tokyo'],
      region: 'Asia',
      subregion: 'Eastern Asia'
    }];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });

    const result = await source.fetch('Japan');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://restcountries.com/v3.1/name/Japan'
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency.code).toBe('JPY');
      expect(result.data.timezone).toBe('Asia/Tokyo');
    }
  });

  it('should handle 404 Not Found', async () => {
    const source = createCountryApiSource();

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await source.fetch('NonExistentCountry');

    expect(mockFetch).toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('国情報が見つかりませんでした');
    }
  });

  it('should handle API errors (non-404)', async () => {
    const source = createCountryApiSource();

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await source.fetch('Japan');

    expect(mockFetch).toHaveBeenCalled();
    expect(result.success).toBe(false);
    // The current implementation of fetch catches errors.
    // My implementation of fetchCountryData should throw on non-404 errors,
    // which source.fetch will catch.
    if (!result.success) {
      expect(result.error).toBe('Internal Server Error');
    }
  });

  it('should handle network errors', async () => {
    const source = createCountryApiSource();

    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await source.fetch('Japan');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Network error');
    }
  });
});
