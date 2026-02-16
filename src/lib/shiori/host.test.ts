import { describe, expect, it } from 'vitest';

import {
  resolveExternalSubdomainRedirect,
  resolveHostRewrite,
  resolveShioriRewrite,
  shouldBypassShioriRewrite,
} from './host';

describe('subdomain host rewrite', () => {
  it('rewrites for shiori host', () => {
    expect(resolveShioriRewrite('shiori.tabide.ai', '/kyoto-trip')).toBe('/shiori/kyoto-trip');
    expect(resolveHostRewrite('shiori.tabide.ai', '/kyoto-trip')).toBe('/shiori/kyoto-trip');
  });

  it('rewrites for blog host', () => {
    expect(resolveHostRewrite('blog.tabide.ai', '/@alice/kyoto-guide')).toBe('/blog/@alice/kyoto-guide');
  });

  it('does not rewrite next assets', () => {
    expect(shouldBypassShioriRewrite('/_next/static/chunk.js')).toBe(true);
    expect(resolveShioriRewrite('shiori.tabide.ai', '/_next/static/chunk.js')).toBeNull();
    expect(resolveHostRewrite('blog.tabide.ai', '/_next/static/chunk.js')).toBeNull();
  });

  it('does not rewrite normal host', () => {
    expect(resolveShioriRewrite('tabide.ai', '/kyoto-trip')).toBeNull();
    expect(resolveHostRewrite('tabide.ai', '/@alice/kyoto-guide')).toBeNull();
  });
  it('redirects first-party shiori and blog paths to dedicated subdomains', () => {
    expect(resolveExternalSubdomainRedirect('tabide.ai', '/shiori')).toBe('https://shiori.tabide.ai/');
    expect(resolveExternalSubdomainRedirect('www.tabide.ai', '/blog', '?page=2')).toBe('https://blog.tabide.ai/?page=2');
  });

  it('does not redirect nested paths or other hosts', () => {
    expect(resolveExternalSubdomainRedirect('tabide.ai', '/shiori/kyoto-trip')).toBeNull();
    expect(resolveExternalSubdomainRedirect('staging.tabide.ai', '/blog')).toBeNull();
  });

});
