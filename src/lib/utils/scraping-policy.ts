/**
 * Scraping Policy Definitions
 *
 * Defines allowed/denied domains and per-domain scraping policies
 * to ensure ethical and legal compliance when accessing external resources.
 */

/**
 * Domain-specific scraping policy configuration
 */
export interface DomainPolicy {
  /** Whether to check and respect robots.txt for this domain */
  respectRobotsTxt: boolean;
  /** Minimum delay between requests to this domain (in milliseconds) */
  minDelayMs: number;
  /** Maximum requests allowed per minute to this domain */
  maxRequestsPerMinute: number;
  /** Allowed URL path patterns (use '*' for wildcard) */
  allowedPaths: string[];
  /** Whether a proper User-Agent is required for this domain */
  userAgentRequired: boolean;
  /** Optional attribution text required when using data from this source */
  attribution?: string;
}

/**
 * Explicitly allowed domains for scraping/API access.
 * Only domains in this list can be accessed by the ethical HTTP client.
 */
export const ALLOWED_DOMAINS: string[] = [
  'anzen.mofa.go.jp',           // 外務省海外安全ホームページ（公開データ）
  'api.openweathermap.org',     // OpenWeatherMap API
  'restcountries.com',          // REST Countries API
  'api.exchangerate-api.com',   // Exchange Rate API
  'tomokichidiary.com',         // 自社ブログ（自社所有）
  'www.tomokichidiary.com',     // 自社ブログ（www prefix）
];

/**
 * Explicitly denied domains that should never be scraped.
 * These sites have explicitly prohibited scraping or have legal restrictions.
 */
export const DENIED_DOMAINS: string[] = [
  // Add domains that explicitly prohibit scraping here
];

/**
 * Per-domain policy configurations.
 * If a domain is in ALLOWED_DOMAINS but not here, DEFAULT_POLICY applies.
 */
export const DOMAIN_POLICIES: Record<string, DomainPolicy> = {
  'anzen.mofa.go.jp': {
    respectRobotsTxt: true,
    minDelayMs: 2000,           // 2秒間隔（公共サイトには礼儀正しく）
    maxRequestsPerMinute: 10,
    allowedPaths: ['/info/*', '/riskmap/*'],
    userAgentRequired: true,
    attribution: '出典：外務省海外安全ホームページ (https://www.anzen.mofa.go.jp/)'
  },
  'api.openweathermap.org': {
    respectRobotsTxt: false,    // API service
    minDelayMs: 100,
    maxRequestsPerMinute: 60,   // Free tier limit
    allowedPaths: ['*'],
    userAgentRequired: false,
    attribution: 'Weather data provided by OpenWeatherMap'
  },
  'restcountries.com': {
    respectRobotsTxt: false,    // API service
    minDelayMs: 100,
    maxRequestsPerMinute: 60,
    allowedPaths: ['*'],
    userAgentRequired: false
  },
  'api.exchangerate-api.com': {
    respectRobotsTxt: false,    // API service
    minDelayMs: 100,
    maxRequestsPerMinute: 30,   // Free tier limit
    allowedPaths: ['*'],
    userAgentRequired: false,
    attribution: 'Exchange rates provided by ExchangeRate-API'
  },
  'tomokichidiary.com': {
    respectRobotsTxt: false,    // 自社サイト
    minDelayMs: 500,
    maxRequestsPerMinute: 60,
    allowedPaths: ['*'],
    userAgentRequired: false
  },
  'www.tomokichidiary.com': {
    respectRobotsTxt: false,    // 自社サイト（www prefix）
    minDelayMs: 500,
    maxRequestsPerMinute: 60,
    allowedPaths: ['*'],
    userAgentRequired: false
  }
};

/**
 * Default policy for domains in ALLOWED_DOMAINS but without explicit policy
 */
export const DEFAULT_POLICY: DomainPolicy = {
  respectRobotsTxt: true,
  minDelayMs: 1000,
  maxRequestsPerMinute: 30,
  allowedPaths: ['*'],
  userAgentRequired: true
};

/**
 * Check if a URL's path matches the allowed paths in a policy
 */
function matchesAllowedPath(urlPath: string, allowedPaths: string[]): boolean {
  return allowedPaths.some(pattern => {
    if (pattern === '*') return true;

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`).test(urlPath);
  });
}

/**
 * Get the scraping policy for a given URL.
 *
 * @param url - The URL to check
 * @returns The domain policy if allowed, null if denied or not in allowed list
 */
export function getDomainPolicy(url: string): DomainPolicy | null {
  let hostname: string;
  let pathname: string;

  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
    pathname = urlObj.pathname;
  } catch {
    console.error(`[scraping-policy] Invalid URL: ${url}`);
    return null;
  }

  // Check denied list first
  if (DENIED_DOMAINS.some(d => hostname.includes(d))) {
    console.warn(`[scraping-policy] Domain is in denied list: ${hostname}`);
    return null;
  }

  // Check allowed list
  if (!ALLOWED_DOMAINS.some(d => hostname.includes(d))) {
    console.warn(`[scraping-policy] Domain not in allowed list: ${hostname}`);
    return null;
  }

  // Get policy (specific or default)
  const policy = DOMAIN_POLICIES[hostname] ?? DEFAULT_POLICY;

  // Check path permissions
  if (!matchesAllowedPath(pathname, policy.allowedPaths)) {
    console.warn(`[scraping-policy] Path not allowed for ${hostname}: ${pathname}`);
    return null;
  }

  return policy;
}

/**
 * Check if a domain is allowed for scraping
 */
export function isDomainAllowed(url: string): boolean {
  return getDomainPolicy(url) !== null;
}

/**
 * Get attribution text for a domain if required
 */
export function getAttribution(url: string): string | null {
  const policy = getDomainPolicy(url);
  return policy?.attribution ?? null;
}
