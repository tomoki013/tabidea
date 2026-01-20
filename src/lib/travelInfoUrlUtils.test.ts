
import { describe, it, expect } from 'vitest';
import {
  encodeTravelInfoUrl,
  decodeTravelInfoUrl,
  parseCategoriesParam,
  parseDatesParam,
} from './travelInfoUrlUtils';
import { ALL_TRAVEL_INFO_CATEGORIES } from '@/types';

describe('travelInfoUrlUtils', () => {
  describe('encodeTravelInfoUrl', () => {
    it('should encode URL with destination only', () => {
      const url = encodeTravelInfoUrl('Paris', []);
      expect(url).toBe('/travel-info/Paris');
    });

    it('should encode URL with categories', () => {
      const url = encodeTravelInfoUrl('Paris', ['basic', 'local_food']);
      expect(url).toContain('/travel-info/Paris');
      expect(url).toContain('categories=basic%2Clocal_food');
    });

    it('should encode URL with dates', () => {
      const url = encodeTravelInfoUrl('Paris', [], { start: '2024-01-01', end: '2024-01-05' });
      expect(url).toContain('/travel-info/Paris');
      expect(url).toContain('dates=2024-01-01%2C2024-01-05');
    });
  });

  describe('decodeTravelInfoUrl', () => {
    it('should decode URL with destination only and return default categories', () => {
      const params = new URLSearchParams();
      const result = decodeTravelInfoUrl('Paris', params);
      expect(result.destination).toBe('Paris');
      expect(result.categories).toEqual(['basic', 'safety']);
      expect(result.dates).toBeUndefined();
    });

    it('should decode URL with valid categories including new ones', () => {
      const params = new URLSearchParams('categories=basic,local_food,events');
      const result = decodeTravelInfoUrl('Paris', params);
      expect(result.categories).toEqual(['basic', 'local_food', 'events']);
    });

    it('should filter out invalid categories', () => {
      const params = new URLSearchParams('categories=basic,invalid_cat,events');
      const result = decodeTravelInfoUrl('Paris', params);
      expect(result.categories).toEqual(['basic', 'events']);
    });
  });

  describe('parseCategoriesParam', () => {
    it('should return default categories when param is null', () => {
      expect(parseCategoriesParam(null)).toEqual(['basic', 'safety']);
    });

    it('should return valid categories including new ones', () => {
      expect(parseCategoriesParam('basic,local_food,events')).toEqual(['basic', 'local_food', 'events']);
    });

    it('should filter invalid categories', () => {
      expect(parseCategoriesParam('basic,invalid,events')).toEqual(['basic', 'events']);
    });
  });
});
