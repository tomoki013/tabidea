import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryMapper, createCategoryMapper, createDefaultCategoryMapper } from './category-mapper';
import type { ITravelInfoSource } from '../interfaces';
import type { TravelInfoCategory } from '@/types';

// Mock the source creators
vi.mock('../sources/country-api', () => ({
  createCountryApiSource: () => createMockSource('country-api', ['basic'], 0.8),
}));

vi.mock('../sources/exchange-api', () => ({
  createExchangeApiSource: () => createMockSource('exchange-api', ['basic'], 0.7),
}));

vi.mock('../sources/gemini-fallback', () => ({
  createGeminiFallbackSource: () => createMockSource('gemini-fallback', ['basic', 'safety', 'climate'], 0.5),
}));

vi.mock('../sources/mofa-api', () => ({
  createMofaApiSource: () => createMockSource('mofa-api', ['safety', 'visa'], 0.9),
}));

vi.mock('../sources/weather-api', () => ({
  createWeatherApiSource: () => createMockSource('weather-api', ['climate'], 0.85),
}));

function createMockSource(
  name: string,
  categories: TravelInfoCategory[],
  reliability: number
): ITravelInfoSource {
  return {
    sourceId: `mock_${name.replace(/-/g, '_')}`,
    sourceName: name,
    sourceType: 'official_api' as const,
    supportedCategories: categories,
    reliabilityScore: reliability,
    fetch: vi.fn().mockResolvedValue({ success: true, data: {} }),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe('CategoryMapper', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('registerSource', () => {
    it('should register a source and make it available for its categories', () => {
      const mapper = new CategoryMapper();
      const source = createMockSource('test-source', ['basic', 'safety'], 0.8);

      mapper.registerSource(source);

      expect(mapper.hasSourcesForCategory('basic')).toBe(true);
      expect(mapper.hasSourcesForCategory('safety')).toBe(true);
      expect(mapper.hasSourcesForCategory('climate')).toBe(false);
    });

    it('should log registration message', () => {
      const mapper = new CategoryMapper();
      const source = createMockSource('test-source', ['basic'], 0.8);

      mapper.registerSource(source);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registered source: test-source')
      );
    });
  });

  describe('unregisterSource', () => {
    it('should remove a registered source', () => {
      const mapper = new CategoryMapper();
      const source = createMockSource('test-source', ['basic'], 0.8);

      mapper.registerSource(source);
      expect(mapper.hasSourcesForCategory('basic')).toBe(true);

      const result = mapper.unregisterSource('test-source');

      expect(result).toBe(true);
      expect(mapper.hasSourcesForCategory('basic')).toBe(false);
    });

    it('should return false when source does not exist', () => {
      const mapper = new CategoryMapper();

      const result = mapper.unregisterSource('non-existent');

      expect(result).toBe(false);
    });

    it('should log unregistration message', () => {
      const mapper = new CategoryMapper();
      const source = createMockSource('test-source', ['basic'], 0.8);
      mapper.registerSource(source);

      mapper.unregisterSource('test-source');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unregistered source: test-source')
      );
    });
  });

  describe('getSourcesForCategory', () => {
    it('should return sources sorted by reliability score (descending)', () => {
      const mapper = new CategoryMapper();
      const lowReliability = createMockSource('low', ['basic'], 0.5);
      const highReliability = createMockSource('high', ['basic'], 0.9);
      const medReliability = createMockSource('med', ['basic'], 0.7);

      mapper.registerSource(lowReliability);
      mapper.registerSource(highReliability);
      mapper.registerSource(medReliability);

      const sources = mapper.getSourcesForCategory('Tokyo', 'basic');

      expect(sources[0].sourceName).toBe('high');
      expect(sources[1].sourceName).toBe('med');
      expect(sources[2].sourceName).toBe('low');
    });

    it('should return empty array for unsupported category', () => {
      const mapper = new CategoryMapper();

      const sources = mapper.getSourcesForCategory('Tokyo', 'climate');

      expect(sources).toEqual([]);
    });
  });

  describe('getAllSources', () => {
    it('should return all registered sources', () => {
      const mapper = new CategoryMapper();
      const source1 = createMockSource('source1', ['basic'], 0.8);
      const source2 = createMockSource('source2', ['safety'], 0.7);

      mapper.registerSource(source1);
      mapper.registerSource(source2);

      const sources = mapper.getAllSources();

      expect(sources).toHaveLength(2);
      expect(sources.map(s => s.sourceName)).toContain('source1');
      expect(sources.map(s => s.sourceName)).toContain('source2');
    });

    it('should return a copy of the sources array', () => {
      const mapper = new CategoryMapper();
      const source = createMockSource('source', ['basic'], 0.8);
      mapper.registerSource(source);

      const sources1 = mapper.getAllSources();
      const sources2 = mapper.getAllSources();

      expect(sources1).not.toBe(sources2);
    });
  });

  describe('hasSourcesForCategory', () => {
    it('should return true when sources exist for category', () => {
      const mapper = new CategoryMapper();
      mapper.registerSource(createMockSource('source', ['basic'], 0.8));

      expect(mapper.hasSourcesForCategory('basic')).toBe(true);
    });

    it('should return false when no sources exist for category', () => {
      const mapper = new CategoryMapper();

      expect(mapper.hasSourcesForCategory('basic')).toBe(false);
    });
  });

  describe('getRegisteredCategories', () => {
    it('should return all categories with registered sources', () => {
      const mapper = new CategoryMapper();
      mapper.registerSource(createMockSource('source1', ['basic', 'safety'], 0.8));
      mapper.registerSource(createMockSource('source2', ['climate'], 0.7));

      const categories = mapper.getRegisteredCategories();

      expect(categories).toContain('basic');
      expect(categories).toContain('safety');
      expect(categories).toContain('climate');
      expect(categories).not.toContain('visa');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const mapper = new CategoryMapper();
      mapper.registerSource(createMockSource('source1', ['basic', 'safety'], 0.8));
      mapper.registerSource(createMockSource('source2', ['basic'], 0.7));

      const stats = mapper.getStats();

      expect(stats.totalSources).toBe(2);
      expect(stats.categoryCoverage.basic).toBe(2);
      expect(stats.categoryCoverage.safety).toBe(1);
      expect(stats.categoryCoverage.climate).toBe(0);
    });
  });
});

describe('createCategoryMapper', () => {
  it('should create a new CategoryMapper instance', () => {
    const mapper = createCategoryMapper() as CategoryMapper;
    expect(mapper).toBeDefined();
    expect(mapper.getAllSources()).toEqual([]);
  });
});

describe('createDefaultCategoryMapper', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should create a mapper with default sources registered', () => {
    const mapper = createDefaultCategoryMapper() as CategoryMapper;

    const sources = mapper.getAllSources();
    expect(sources.length).toBeGreaterThan(0);

    const sourceNames = sources.map((s: ITravelInfoSource) => s.sourceName);
    expect(sourceNames).toContain('mofa-api');
    expect(sourceNames).toContain('weather-api');
    expect(sourceNames).toContain('exchange-api');
    expect(sourceNames).toContain('country-api');
    expect(sourceNames).toContain('gemini-fallback');
  });
});
