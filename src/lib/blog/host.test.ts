import { describe, expect, it } from 'vitest';

import { resolveBlogRewrite } from '@/lib/blog/host';

describe('resolveBlogRewrite', () => {
  it('rewrites blog subdomain paths to /blog', () => {
    expect(resolveBlogRewrite('blog.tabide.ai', '/@alice/post')).toBe('/blog/@alice/post');
  });

  it('does not rewrite assets and api', () => {
    expect(resolveBlogRewrite('blog.tabide.ai', '/_next/static/chunk.js')).toBeNull();
    expect(resolveBlogRewrite('blog.tabide.ai', '/api/health')).toBeNull();
  });

  it('does not rewrite non blog hosts', () => {
    expect(resolveBlogRewrite('tabide.ai', '/abc')).toBeNull();
  });
});
