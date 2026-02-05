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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      });

      const service = new GooglePlacesService();
      const result = await service.searchPlace({ query: '存在しない場所' });

      expect(result.found).toBe(false);
      expect(result.place).toBeUndefined();
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      const service = new GooglePlacesService();
      const result = await service.searchPlace({ query: 'test' });

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include near parameter in search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ places: [] }),
      });

      const service = new GooglePlacesService();
      await service.searchPlace({ query: '温泉', near: '箱根' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.textQuery).toBe('温泉 near 箱根');
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
      mockFetch.mockResolvedValueOnce({
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
