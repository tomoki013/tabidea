/**
 * Google Places API Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GooglePlacesService, resetGooglePlacesService } from './places';
import { PlacesApiError } from '@/types/places';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GooglePlacesService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    resetGooglePlacesService();
    process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error when API key is not provided', () => {
      delete process.env.GOOGLE_MAPS_API_KEY;
      expect(() => new GooglePlacesService()).toThrow(PlacesApiError);
    });

    it('should create instance with provided API key', () => {
      const service = new GooglePlacesService('custom-key');
      expect(service).toBeInstanceOf(GooglePlacesService);
    });

    it('should create instance with env API key', () => {
      const service = new GooglePlacesService();
      expect(service).toBeInstanceOf(GooglePlacesService);
    });
  });

  describe('searchPlace', () => {
    it('should return found=true when place is found', async () => {
      const mockResponse = {
        places: [
          {
            id: 'ChIJ123',
            displayName: { text: '東京スカイツリー', languageCode: 'ja' },
            formattedAddress: '東京都墨田区押上1-1-2',
            location: { latitude: 35.7101, longitude: 139.8107 },
            rating: 4.5,
            userRatingCount: 1000,
            regularOpeningHours: {
              openNow: true,
              weekdayDescriptions: ['月曜日: 10:00 - 21:00'],
            },
            googleMapsUri: 'https://maps.google.com/?cid=12345',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new GooglePlacesService();
      const result = await service.searchPlace({ query: '東京スカイツリー' });

      expect(result.found).toBe(true);
      expect(result.place).toBeDefined();
      expect(result.place?.placeId).toBe('ChIJ123');
      expect(result.place?.name).toBe('東京スカイツリー');
      expect(result.place?.formattedAddress).toBe('東京都墨田区押上1-1-2');
      expect(result.place?.rating).toBe(4.5);
    });

    it('should return found=false when no places found', async () => {
      // Mock all fallback attempts to return empty
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      });

      const service = new GooglePlacesService();
      const result = await service.searchPlace({ query: '存在しない場所' });

      expect(result.found).toBe(false);
      expect(result.place).toBeUndefined();
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      const service = new GooglePlacesService();
      const result = await service.searchPlace({ query: 'test' });

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include location in search query', async () => {
      // Mock all fallback attempts to return empty
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      });

      const service = new GooglePlacesService();
      await service.searchPlace({ query: '温泉', near: '箱根' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      // Location is appended directly (not with "near" keyword)
      expect(body.textQuery).toBe('温泉 箱根');
    });

    it('should retry without location if the first search fails', async () => {
      const placeResult = {
        places: [
          {
            id: 'ChIJ123',
            displayName: { text: 'Target Place', languageCode: 'ja' },
            formattedAddress: 'Address',
            location: { latitude: 35.0, longitude: 139.0 },
          },
        ],
      };

      // First call: Returns empty (with location)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      });

      // Second call: Returns result (without location - Step 2 fallback)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(placeResult),
      });

      const service = new GooglePlacesService();
      const result = await service.searchPlace({ query: 'Target Place', near: 'Strict Location' });

      // Expect successful result due to fallback
      expect(result.found).toBe(true);
      expect(result.place?.name).toBe('Target Place');

      // Verify fetch was called twice (Step 1 + Step 2)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call with location appended
      const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstCallBody.textQuery).toContain('Strict Location');

      // Second call without location (just the query)
      const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondCallBody.textQuery).toBe('Target Place');
    });
  });

  describe('cleanSearchQuery', () => {
    it('should extract place name from "〜で〜" pattern', () => {
      const service = new GooglePlacesService();
      expect(service.cleanSearchQuery('金閣寺で抹茶体験')).toBe('金閣寺');
      expect(service.cleanSearchQuery('錦市場で食べ歩き')).toBe('錦市場');
      expect(service.cleanSearchQuery('嵐山で散策')).toBe('嵐山');
    });

    it('should extract place name from "〜を〜" pattern', () => {
      const service = new GooglePlacesService();
      expect(service.cleanSearchQuery('伏見稲荷大社を参拝')).toBe('伏見稲荷大社');
      expect(service.cleanSearchQuery('清水寺を見学')).toBe('清水寺');
    });

    it('should remove trailing action words', () => {
      const service = new GooglePlacesService();
      expect(service.cleanSearchQuery('嵐山竹林散策')).toBe('嵐山竹林');
      expect(service.cleanSearchQuery('祇園探訪')).toBe('祇園');
    });

    it('should remove parenthetical content', () => {
      const service = new GooglePlacesService();
      expect(service.cleanSearchQuery('金閣寺 (Kinkaku-ji)')).toBe('金閣寺');
      expect(service.cleanSearchQuery('東京スカイツリー（展望台）')).toBe('東京スカイツリー');
    });

    it('should remove leading emojis', () => {
      const service = new GooglePlacesService();
      expect(service.cleanSearchQuery('🏯 大阪城')).toBe('大阪城');
    });

    it('should return original query if cleaning results in too short string', () => {
      const service = new GooglePlacesService();
      expect(service.cleanSearchQuery('A')).toBe('A');
    });

    it('should not modify simple place names', () => {
      const service = new GooglePlacesService();
      expect(service.cleanSearchQuery('東京スカイツリー')).toBe('東京スカイツリー');
      expect(service.cleanSearchQuery('浅草寺')).toBe('浅草寺');
    });
  });

  describe('validateSpot', () => {
    it('should return high confidence for exact match', async () => {
      const mockResponse = {
        places: [
          {
            id: 'ChIJ123',
            displayName: { text: '浅草寺', languageCode: 'ja' },
            formattedAddress: '東京都台東区浅草2-3-1',
            location: { latitude: 35.7148, longitude: 139.7967 },
            rating: 4.6,
            googleMapsUri: 'https://maps.google.com/?cid=12345',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const service = new GooglePlacesService();
      const result = await service.validateSpot('浅草寺', '東京');

      expect(result.isVerified).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('google_places');
      expect(result.placeId).toBe('ChIJ123');
    });

    it('should return unverified when place not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      });

      const service = new GooglePlacesService();
      const result = await service.validateSpot('架空の場所');

      expect(result.isVerified).toBe(false);
      expect(result.confidence).toBe('unverified');
    });
  });

  describe('getPhotoUrl', () => {
    it('should generate correct photo URL', () => {
      const service = new GooglePlacesService();
      const url = service.getPhotoUrl('places/photo-ref/photos/123', 800);

      expect(url).toContain('places/photo-ref/photos/123');
      expect(url).toContain('maxWidthPx=800');
      expect(url).toContain('key=test-api-key');
    });
  });

  describe('validateSpots (batch)', () => {
    it('should validate multiple spots', async () => {
      // First call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            places: [
              {
                id: 'ChIJ1',
                displayName: { text: '清水寺', languageCode: 'ja' },
                formattedAddress: '京都市東山区',
                location: { latitude: 34.99, longitude: 135.78 },
                googleMapsUri: 'https://maps.google.com/?cid=1',
              },
            ],
          }),
      });

      // Second call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            places: [
              {
                id: 'ChIJ2',
                displayName: { text: '金閣寺', languageCode: 'ja' },
                formattedAddress: '京都市北区',
                location: { latitude: 35.03, longitude: 135.72 },
                googleMapsUri: 'https://maps.google.com/?cid=2',
              },
            ],
          }),
      });

      const service = new GooglePlacesService();
      const results = await service.validateSpots([
        { name: '清水寺', location: '京都' },
        { name: '金閣寺', location: '京都' },
      ]);

      expect(results.size).toBe(2);
      expect(results.get('清水寺')?.placeId).toBe('ChIJ1');
      expect(results.get('金閣寺')?.placeId).toBe('ChIJ2');
    });
  });
});
