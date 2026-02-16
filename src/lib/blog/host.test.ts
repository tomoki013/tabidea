import { describe, expect, it } from 'vitest';

import { resolveBlogRewrite } from '@/lib/blog/host';

describe('blog host rewrite', () => {
  it('rewrites for blog host', () => {
    expect(resolveBlogRewrite('blog.tabide.ai', '/travel-journal')).toBe('/blog/travel-journal');
  });

  it('does not rewrite static or api paths', () => {
    expect(resolveBlogRewrite('blog.tabide.ai', '/_next/static/chunk.js')).toBeNull();
    expect(resolveBlogRewrite('blog.tabide.ai', '/api/health')).toBeNull();
  });

  it('does not rewrite non-blog host', () => {
    expect(resolveBlogRewrite('tabide.ai', '/travel-journal')).toBeNull();
  });
});
