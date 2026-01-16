import { describe, it, expect } from 'vitest';
import {
  getDomainPolicy,
  isDomainAllowed,
  getAttribution,
  ALLOWED_DOMAINS,
  DENIED_DOMAINS,
  DOMAIN_POLICIES
} from './scraping-policy';

describe('scraping-policy', () => {
  describe('getDomainPolicy', () => {
    it('returns policy for allowed domain', () => {
      const policy = getDomainPolicy('https://tomokichidiary.com/post/123');
      expect(policy).not.toBeNull();
      expect(policy?.minDelayMs).toBe(500);
    });

    it('returns null for domain not in allowed list', () => {
      const policy = getDomainPolicy('https://unknown-site.com/page');
      expect(policy).toBeNull();
    });

    it('returns null for invalid URL', () => {
      const policy = getDomainPolicy('not-a-valid-url');
      expect(policy).toBeNull();
    });

    it('uses specific policy for configured domain', () => {
      const policy = getDomainPolicy('https://anzen.mofa.go.jp/info/test');
      expect(policy).not.toBeNull();
      expect(policy?.minDelayMs).toBe(2000);
      expect(policy?.respectRobotsTxt).toBe(true);
    });

    it('returns null for denied path on domain', () => {
      // anzen.mofa.go.jp only allows /info/* and /riskmap/* paths
      const policy = getDomainPolicy('https://anzen.mofa.go.jp/admin/secret');
      expect(policy).toBeNull();
    });

    it('allows wildcard paths', () => {
      const policy = getDomainPolicy('https://api.openweathermap.org/data/2.5/weather');
      expect(policy).not.toBeNull();
    });
  });

  describe('isDomainAllowed', () => {
    it('returns true for allowed domain', () => {
      expect(isDomainAllowed('https://tomokichidiary.com/')).toBe(true);
    });

    it('returns false for disallowed domain', () => {
      expect(isDomainAllowed('https://google.com/')).toBe(false);
    });
  });

  describe('getAttribution', () => {
    it('returns attribution for domain with attribution', () => {
      const attr = getAttribution('https://anzen.mofa.go.jp/info/test');
      expect(attr).toBe('出典：外務省海外安全ホームページ (https://www.anzen.mofa.go.jp/)');
    });

    it('returns null for domain without attribution', () => {
      const attr = getAttribution('https://tomokichidiary.com/');
      expect(attr).toBeNull();
    });

    it('returns null for disallowed domain', () => {
      const attr = getAttribution('https://unknown.com/');
      expect(attr).toBeNull();
    });
  });

  describe('constants', () => {
    it('has expected allowed domains', () => {
      expect(ALLOWED_DOMAINS).toContain('tomokichidiary.com');
      expect(ALLOWED_DOMAINS).toContain('anzen.mofa.go.jp');
      expect(ALLOWED_DOMAINS).toContain('api.openweathermap.org');
    });

    it('has policies for key domains', () => {
      expect(DOMAIN_POLICIES['anzen.mofa.go.jp']).toBeDefined();
      expect(DOMAIN_POLICIES['tomokichidiary.com']).toBeDefined();
    });

    it('denied domains is an array', () => {
      expect(Array.isArray(DENIED_DOMAINS)).toBe(true);
    });
  });
});
