import { shouldBypassShioriRewrite } from '@/lib/shiori/host';

export function resolveBlogRewrite(host: string | null, pathname: string): string | null {
  if (!host || shouldBypassShioriRewrite(pathname)) return null;
  const hostname = host.split(':')[0].toLowerCase();
  const isBlogHost = hostname === 'blog.tabide.ai' || hostname.startsWith('blog.');
  if (!isBlogHost) return null;
  if (pathname.startsWith('/blog')) return null;
  return `/blog${pathname}`;
}
