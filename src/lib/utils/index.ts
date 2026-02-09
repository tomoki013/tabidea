/**
 * Utils Module
 *
 * Exports utility functions for ethical web scraping and HTTP requests.
 */

// HTTP Client exports
export {
  ethicalFetch,
  ethicalFetchSafe,
  USER_AGENT,
  RobotsTxtDeniedError,
  DomainNotAllowedError,
  RateLimitError,
  rateLimiter,
  logAccess,
  type AccessLog,
  type EthicalFetchOptions
} from './http-client';

// Robots.txt checker exports
export {
  checkRobotsTxt,
  getCrawlDelay,
  getSitemaps,
  clearRobotsCache,
  getRobotsCacheStats
} from './robots-checker';

// Scraping policy exports
export {
  getDomainPolicy,
  isDomainAllowed,
  getAttribution,
  ALLOWED_DOMAINS,
  DENIED_DOMAINS,
  DOMAIN_POLICIES,
  DEFAULT_POLICY,
  type DomainPolicy
} from './scraping-policy';

// Generic utilities
export { throttle } from './throttle';

// URL utilities
export * from './url';

// Travel info URL utilities
export * from './travel-info-url';

// Plan utilities
export * from './plan';

// PDF utilities
export * from './pdf';

// Classnames utility
export * from './cn';
