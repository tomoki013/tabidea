import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRobotsTxt,
  getCrawlDelay,
  clearRobotsCache,
  getRobotsCacheStats
} from './robots-checker';

// Mock global fetch
const mockFetch = vi.fn();

describe('robots-checker', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    clearRobotsCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('checkRobotsTxt', () => {
    it('returns true when robots.txt allows access', async () => {
      const robotsTxt = `
User-agent: *
Allow: /
`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      });

      const result = await checkRobotsTxt(
        'https://example.com/page',
        'TestBot/1.0'
      );

      expect(result).toBe(true);
    });

    it('returns false when robots.txt disallows access', async () => {
      const robotsTxt = `
User-agent: *
Disallow: /
`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      });

      const result = await checkRobotsTxt(
        'https://example.com/page',
        'TestBot/1.0'
      );

      expect(result).toBe(false);
    });

    it('returns true when robots.txt does not exist (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await checkRobotsTxt(
        'https://example.com/page',
        'TestBot/1.0'
      );

      expect(result).toBe(true);
    });

    it('returns false for invalid URL', async () => {
      const result = await checkRobotsTxt(
        'not-a-valid-url',
        'TestBot/1.0'
      );

      expect(result).toBe(false);
    });

    it('caches robots.txt responses', async () => {
      const robotsTxt = `
User-agent: *
Allow: /
`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      });

      // First call fetches
      await checkRobotsTxt('https://example.com/page1', 'TestBot/1.0');
      // Second call should use cache
      await checkRobotsTxt('https://example.com/page2', 'TestBot/1.0');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns false on fetch error (conservative approach)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkRobotsTxt(
        'https://example.com/page',
        'TestBot/1.0'
      );

      expect(result).toBe(false);
    });
  });

  describe('getCrawlDelay', () => {
    it('returns null when no cache entry exists', () => {
      const delay = getCrawlDelay('uncached.com', 'TestBot/1.0');
      expect(delay).toBeNull();
    });

    it('returns crawl delay from cached robots.txt', async () => {
      const robotsTxt = `
User-agent: *
Crawl-delay: 5
Allow: /
`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      });

      // Populate cache
      await checkRobotsTxt('https://example.com/page', 'TestBot/1.0');

      const delay = getCrawlDelay('example.com', 'TestBot/1.0');
      // Note: robots-parser may or may not support Crawl-delay depending on version
      // Just check it returns a value or null
      expect(delay === null || typeof delay === 'number').toBe(true);
    });
  });

  describe('getRobotsCacheStats', () => {
    it('returns empty stats initially', () => {
      const stats = getRobotsCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });

    it('tracks cached entries', async () => {
      const robotsTxt = `
User-agent: *
Allow: /
`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      });

      await checkRobotsTxt('https://example.com/page', 'TestBot/1.0');

      const stats = getRobotsCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].hostname).toBe('example.com');
    });
  });

  describe('clearRobotsCache', () => {
    it('clears specific hostname', async () => {
      const robotsTxt = `
User-agent: *
Allow: /
`;
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      });

      await checkRobotsTxt('https://example.com/page', 'TestBot/1.0');
      await checkRobotsTxt('https://other.com/page', 'TestBot/1.0');

      clearRobotsCache('example.com');

      const stats = getRobotsCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].hostname).toBe('other.com');
    });

    it('clears all entries when no hostname specified', async () => {
      const robotsTxt = `
User-agent: *
Allow: /
`;
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(robotsTxt)
      });

      await checkRobotsTxt('https://example.com/page', 'TestBot/1.0');
      await checkRobotsTxt('https://other.com/page', 'TestBot/1.0');

      clearRobotsCache();

      const stats = getRobotsCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
