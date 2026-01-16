import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ethicalFetch,
  ethicalFetchSafe,
  USER_AGENT,
  RobotsTxtDeniedError,
  DomainNotAllowedError,
  rateLimiter
} from './http-client';

// Mock the robots-checker module
vi.mock('./robots-checker', () => ({
  checkRobotsTxt: vi.fn().mockResolvedValue(true),
  getCrawlDelay: vi.fn().mockReturnValue(null)
}));

// Mock the scraping-policy module
vi.mock('./scraping-policy', () => ({
  getDomainPolicy: vi.fn((url: string) => {
    const hostname = new URL(url).hostname;
    if (hostname === 'tomokichidiary.com' || hostname === 'www.tomokichidiary.com') {
      return {
        respectRobotsTxt: false,
        minDelayMs: 100,
        maxRequestsPerMinute: 60,
        allowedPaths: ['*'],
        userAgentRequired: false
      };
    }
    if (hostname === 'blocked.com') {
      return null;
    }
    return {
      respectRobotsTxt: true,
      minDelayMs: 100,
      maxRequestsPerMinute: 60,
      allowedPaths: ['*'],
      userAgentRequired: true
    };
  })
}));

import { checkRobotsTxt } from './robots-checker';
const mockCheckRobotsTxt = vi.mocked(checkRobotsTxt);

// Mock global fetch
const mockFetch = vi.fn();

describe('http-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
    rateLimiter.reset();
    mockCheckRobotsTxt.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('USER_AGENT', () => {
    it('has expected format', () => {
      expect(USER_AGENT).toContain('AITravelPlannerBot');
      expect(USER_AGENT).toContain('1.0');
      expect(USER_AGENT).toContain('tomokichidiary.com');
    });
  });

  describe('ethicalFetch', () => {
    it('adds proper headers to request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      await ethicalFetch('https://tomokichidiary.com/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://tomokichidiary.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': USER_AGENT,
            'Accept-Language': 'ja,en;q=0.9'
          })
        })
      );
    });

    it('throws DomainNotAllowedError for blocked domain', async () => {
      await expect(
        ethicalFetch('https://blocked.com/page')
      ).rejects.toThrow(DomainNotAllowedError);
    });

    it('throws RobotsTxtDeniedError when robots.txt denies access', async () => {
      mockCheckRobotsTxt.mockResolvedValueOnce(false);

      await expect(
        ethicalFetch('https://allowed.com/page')
      ).rejects.toThrow(RobotsTxtDeniedError);
    });

    it('skips robots.txt check when policy says so', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      await ethicalFetch('https://tomokichidiary.com/test');

      // robots.txt check should not be called for own domain
      expect(mockCheckRobotsTxt).not.toHaveBeenCalled();
    });

    it('retries on failure with exponential backoff', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await ethicalFetch('https://tomokichidiary.com/test', {
        maxRetries: 3
      });

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000);

    it('throws after max retries exceeded', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        ethicalFetch('https://tomokichidiary.com/test', { maxRetries: 2 })
      ).rejects.toThrow('Network error');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000);

    it('throws on invalid URL', async () => {
      await expect(
        ethicalFetch('not-a-valid-url')
      ).rejects.toThrow('Invalid URL');
    });

    it('can skip policy check with option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await ethicalFetch('https://any-domain.com/page', {
        skipPolicyCheck: true,
        respectRobotsTxt: false
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('ethicalFetchSafe', () => {
    it('returns response on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await ethicalFetchSafe('https://tomokichidiary.com/test');

      expect(result).not.toBeNull();
      expect(result?.ok).toBe(true);
    });

    it('returns null on RobotsTxtDeniedError', async () => {
      mockCheckRobotsTxt.mockResolvedValueOnce(false);

      const result = await ethicalFetchSafe('https://allowed.com/page');

      expect(result).toBeNull();
    });

    it('returns null on DomainNotAllowedError', async () => {
      const result = await ethicalFetchSafe('https://blocked.com/page');

      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await ethicalFetchSafe('https://tomokichidiary.com/test', {
        maxRetries: 1
      });

      expect(result).toBeNull();
    });
  });

  describe('RobotsTxtDeniedError', () => {
    it('has correct properties', () => {
      const error = new RobotsTxtDeniedError('https://example.com/page');

      expect(error.name).toBe('RobotsTxtDeniedError');
      expect(error.url).toBe('https://example.com/page');
      expect(error.message).toContain('robots.txt');
    });
  });

  describe('DomainNotAllowedError', () => {
    it('has correct properties', () => {
      const error = new DomainNotAllowedError('https://blocked.com/page');

      expect(error.name).toBe('DomainNotAllowedError');
      expect(error.url).toBe('https://blocked.com/page');
      expect(error.message).toContain('allowed list');
    });
  });
});
