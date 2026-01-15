/**
 * Robots.txt Parser and Checker
 *
 * Provides functionality to fetch, parse, and cache robots.txt files
 * to ensure compliance with website crawling policies.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const robotsParser = require('robots-parser');

/**
 * Cached robots.txt entry
 */
interface RobotsCacheEntry {
  robots: ReturnType<typeof robotsParser>;
  fetchedAt: Date;
}

/**
 * Cache for robots.txt files, keyed by hostname
 */
const robotsCache = new Map<string, RobotsCacheEntry>();

/**
 * Time-to-live for cached robots.txt entries (24 hours)
 */
const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Timeout for fetching robots.txt (5 seconds)
 */
const ROBOTS_FETCH_TIMEOUT_MS = 5000;

/**
 * Check if a URL is allowed by the site's robots.txt
 *
 * @param url - The URL to check
 * @param userAgent - The User-Agent string to check against
 * @returns true if allowed, false if disallowed or on error (conservative approach)
 */
export async function checkRobotsTxt(
  url: string,
  userAgent: string
): Promise<boolean> {
  let hostname: string;
  let robotsUrl: string;

  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
    robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;
  } catch {
    console.error(`[robots-checker] Invalid URL: ${url}`);
    return false;
  }

  // Check cache first
  const cached = robotsCache.get(hostname);
  if (cached && Date.now() - cached.fetchedAt.getTime() < ROBOTS_CACHE_TTL_MS) {
    const isAllowed = cached.robots.isAllowed(url, userAgent);
    return isAllowed ?? true;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ROBOTS_FETCH_TIMEOUT_MS);

    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // robots.txt doesn't exist or can't be accessed - allow by default
      // This follows the standard robots.txt protocol
      console.log(`[robots-checker] No robots.txt found for ${hostname} (${response.status})`);
      return true;
    }

    const robotsTxt = await response.text();
    const robots = robotsParser(robotsUrl, robotsTxt);

    // Cache the parsed robots.txt
    robotsCache.set(hostname, {
      robots,
      fetchedAt: new Date()
    });

    const isAllowed = robots.isAllowed(url, userAgent);
    return isAllowed ?? true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[robots-checker] Timeout fetching robots.txt for ${hostname}`);
    } else {
      console.warn(`[robots-checker] Failed to fetch robots.txt for ${hostname}:`, error);
    }
    // On error, be conservative and deny access
    // This prevents accidental violations when the site is unreachable
    return false;
  }
}

/**
 * Get the Crawl-Delay directive for a domain if specified in robots.txt
 *
 * @param hostname - The hostname to check
 * @param userAgent - The User-Agent string to check against
 * @returns The crawl delay in seconds, or null if not specified
 */
export function getCrawlDelay(
  hostname: string,
  userAgent: string
): number | null {
  const cached = robotsCache.get(hostname);
  if (!cached) {
    return null;
  }

  const delay = cached.robots.getCrawlDelay(userAgent);
  return delay ?? null;
}

/**
 * Get the sitemap URLs for a domain if specified in robots.txt
 *
 * @param hostname - The hostname to check
 * @returns Array of sitemap URLs, or empty array if none specified
 */
export function getSitemaps(hostname: string): string[] {
  const cached = robotsCache.get(hostname);
  if (!cached) {
    return [];
  }

  return cached.robots.getSitemaps() ?? [];
}

/**
 * Clear the robots.txt cache for a specific hostname or all entries
 *
 * @param hostname - Optional hostname to clear. If not provided, clears all entries.
 */
export function clearRobotsCache(hostname?: string): void {
  if (hostname) {
    robotsCache.delete(hostname);
  } else {
    robotsCache.clear();
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getRobotsCacheStats(): {
  size: number;
  entries: Array<{ hostname: string; fetchedAt: Date }>;
} {
  const entries: Array<{ hostname: string; fetchedAt: Date }> = [];
  robotsCache.forEach((value, key) => {
    entries.push({ hostname: key, fetchedAt: value.fetchedAt });
  });

  return {
    size: robotsCache.size,
    entries
  };
}
