/**
 * Ethical HTTP Client
 *
 * A wrapper around fetch that implements ethical scraping practices:
 * - Respects robots.txt directives
 * - Enforces rate limiting per domain
 * - Uses proper User-Agent identification
 * - Logs all access for auditability
 */

import { checkRobotsTxt, getCrawlDelay } from './robots-checker';
import { getDomainPolicy, type DomainPolicy } from './scraping-policy';

/**
 * Application information for User-Agent
 */
const APP_INFO = {
  name: 'AITravelPlannerBot',
  version: '1.0',
  url: 'https://ai.tomokichidiary.com/',
  contact: 'contact@tomokichidiary.com'
};

/**
 * User-Agent string identifying this application
 * Format follows best practices for web crawlers
 */
export const USER_AGENT = `${APP_INFO.name}/${APP_INFO.version} (+${APP_INFO.url}; ${APP_INFO.contact})`;

/**
 * Custom error for when robots.txt denies access
 */
export class RobotsTxtDeniedError extends Error {
  public readonly url: string;

  constructor(url: string) {
    super(`Access denied by robots.txt: ${url}`);
    this.name = 'RobotsTxtDeniedError';
    this.url = url;
  }
}

/**
 * Custom error for when a domain is not in the allowed list
 */
export class DomainNotAllowedError extends Error {
  public readonly url: string;

  constructor(url: string) {
    super(`Domain not in allowed list: ${url}`);
    this.name = 'DomainNotAllowedError';
    this.url = url;
  }
}

/**
 * Custom error for rate limit violations
 */
export class RateLimitError extends Error {
  public readonly hostname: string;

  constructor(hostname: string) {
    super(`Rate limit exceeded for: ${hostname}`);
    this.name = 'RateLimitError';
    this.hostname = hostname;
  }
}

/**
 * Access log entry for auditability
 */
export interface AccessLog {
  timestamp: Date;
  url: string;
  userAgent: string;
  robotsAllowed: boolean;
  policyAllowed: boolean;
  statusCode?: number;
  error?: string;
  durationMs?: number;
}

/**
 * Options for ethical fetch
 */
export interface EthicalFetchOptions {
  /** Whether to check robots.txt (default: follows domain policy) */
  respectRobotsTxt?: boolean;
  /** Minimum delay between requests in ms (default: follows domain policy) */
  minDelayMs?: number;
  /** Maximum retries on failure (default: 3) */
  maxRetries?: number;
  /** Request timeout in ms (default: 10000) */
  timeoutMs?: number;
  /** Standard fetch options */
  fetchOptions?: RequestInit;
  /** Skip domain policy check (use with caution) */
  skipPolicyCheck?: boolean;
}

/**
 * Rate limiter class for controlling request frequency per domain
 */
class RateLimiter {
  private lastAccess = new Map<string, number>();
  private requestCounts = new Map<string, { count: number; windowStart: number }>();

  /**
   * Wait if necessary to respect rate limits
   */
  async wait(hostname: string, minDelayMs: number, maxRequestsPerMinute: number): Promise<void> {
    const now = Date.now();

    // Check per-minute rate limit
    const windowData = this.requestCounts.get(hostname);
    if (windowData) {
      const windowElapsed = now - windowData.windowStart;
      if (windowElapsed < 60000) {
        if (windowData.count >= maxRequestsPerMinute) {
          const waitTime = 60000 - windowElapsed;
          console.log(`[rate-limiter] Rate limit reached for ${hostname}, waiting ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          this.requestCounts.set(hostname, { count: 1, windowStart: Date.now() });
          this.lastAccess.set(hostname, Date.now());
          return;
        }
        windowData.count++;
      } else {
        this.requestCounts.set(hostname, { count: 1, windowStart: now });
      }
    } else {
      this.requestCounts.set(hostname, { count: 1, windowStart: now });
    }

    // Check minimum delay between requests
    const lastTime = this.lastAccess.get(hostname) ?? 0;
    const elapsed = now - lastTime;

    if (elapsed < minDelayMs) {
      const waitTime = minDelayMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastAccess.set(hostname, Date.now());
  }

  /**
   * Reset rate limiter state (useful for testing)
   */
  reset(): void {
    this.lastAccess.clear();
    this.requestCounts.clear();
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = new RateLimiter();

/**
 * Log access for auditability
 */
export function logAccess(log: AccessLog): void {
  const logEntry = {
    ...log,
    timestamp: log.timestamp.toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[access-log]', JSON.stringify(logEntry, null, 2));
  } else {
    // In production, use structured logging
    console.log('[access-log]', JSON.stringify(logEntry));
  }

  // In production, you might want to send to a logging service:
  // - Winston, Pino, or similar for file/console logging
  // - Datadog, CloudWatch, or similar for cloud logging
  // - A database for persistent audit trails
}

/**
 * Ethical fetch wrapper that respects robots.txt and rate limits
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns The fetch Response
 * @throws RobotsTxtDeniedError if robots.txt denies access
 * @throws DomainNotAllowedError if domain is not in allowed list
 * @throws RateLimitError if rate limit is exceeded (shouldn't happen with wait)
 */
export async function ethicalFetch(
  url: string,
  options?: EthicalFetchOptions
): Promise<Response> {
  const startTime = Date.now();
  const {
    respectRobotsTxt,
    minDelayMs,
    maxRetries = 3,
    timeoutMs = 10000,
    fetchOptions = {},
    skipPolicyCheck = false
  } = options ?? {};

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // 1. Check domain policy
  let policy: DomainPolicy | null = null;
  if (!skipPolicyCheck) {
    policy = getDomainPolicy(url);
    if (!policy) {
      logAccess({
        timestamp: new Date(),
        url,
        userAgent: USER_AGENT,
        robotsAllowed: false,
        policyAllowed: false,
        error: 'Domain not in allowed list'
      });
      throw new DomainNotAllowedError(url);
    }
  }

  // Use provided values or fall back to policy defaults
  const effectiveRespectRobots = respectRobotsTxt ?? policy?.respectRobotsTxt ?? true;
  const effectiveMinDelay = minDelayMs ?? policy?.minDelayMs ?? 1000;
  const effectiveMaxRequestsPerMinute = policy?.maxRequestsPerMinute ?? 30;

  // 2. Check robots.txt if required
  if (effectiveRespectRobots) {
    // Also check for Crawl-Delay in robots.txt
    const robotsCrawlDelay = getCrawlDelay(hostname, USER_AGENT);
    const finalDelay = robotsCrawlDelay !== null
      ? Math.max(effectiveMinDelay, robotsCrawlDelay * 1000)
      : effectiveMinDelay;

    const allowed = await checkRobotsTxt(url, USER_AGENT);
    if (!allowed) {
      logAccess({
        timestamp: new Date(),
        url,
        userAgent: USER_AGENT,
        robotsAllowed: false,
        policyAllowed: true,
        error: 'Blocked by robots.txt'
      });
      throw new RobotsTxtDeniedError(url);
    }

    // Apply delay with Crawl-Delay consideration
    await rateLimiter.wait(hostname, finalDelay, effectiveMaxRequestsPerMinute);
  } else {
    // Apply rate limiting even without robots.txt check
    await rateLimiter.wait(hostname, effectiveMinDelay, effectiveMaxRequestsPerMinute);
  }

  // 3. Execute request with retries
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en;q=0.9',
          ...fetchOptions.headers
        }
      });

      clearTimeout(timeoutId);

      logAccess({
        timestamp: new Date(),
        url,
        userAgent: USER_AGENT,
        robotsAllowed: true,
        policyAllowed: true,
        statusCode: response.status,
        durationMs: Date.now() - startTime
      });

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        console.warn(`[ethical-fetch] Request timeout for ${url} (attempt ${attempt}/${maxRetries})`);
      } else {
        console.warn(`[ethical-fetch] Request failed for ${url} (attempt ${attempt}/${maxRetries}):`, lastError.message);
      }

      // Don't retry on abort/timeout for the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  logAccess({
    timestamp: new Date(),
    url,
    userAgent: USER_AGENT,
    robotsAllowed: true,
    policyAllowed: true,
    error: lastError?.message ?? 'Unknown error',
    durationMs: Date.now() - startTime
  });

  throw lastError ?? new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

/**
 * Simple wrapper for ethical fetch that returns null on error instead of throwing
 */
export async function ethicalFetchSafe(
  url: string,
  options?: EthicalFetchOptions
): Promise<Response | null> {
  try {
    return await ethicalFetch(url, options);
  } catch (error) {
    if (error instanceof RobotsTxtDeniedError) {
      console.log(`[ethical-fetch] Skipping ${url}: blocked by robots.txt`);
    } else if (error instanceof DomainNotAllowedError) {
      console.log(`[ethical-fetch] Skipping ${url}: domain not allowed`);
    } else {
      console.error(`[ethical-fetch] Error fetching ${url}:`, error);
    }
    return null;
  }
}
