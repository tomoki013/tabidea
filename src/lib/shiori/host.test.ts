import { describe, expect, it } from 'vitest';

import { resolveShioriRewrite, shouldBypassShioriRewrite } from './host';

describe('shiori host rewrite', () => {
  it('rewrites for shiori host', () => {
    expect(resolveShioriRewrite('shiori.tabide.ai', '/kyoto-trip')).toBe('/shiori/kyoto-trip');
  });

  it('does not rewrite next assets', () => {
    expect(shouldBypassShioriRewrite('/_next/static/chunk.js')).toBe(true);
    expect(resolveShioriRewrite('shiori.tabide.ai', '/_next/static/chunk.js')).toBeNull();
  });

  it('does not rewrite normal host', () => {
    expect(resolveShioriRewrite('tabide.ai', '/kyoto-trip')).toBeNull();
  });
});
