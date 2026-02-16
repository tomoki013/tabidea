export function shouldBypassBlogRewrite(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  );
}

export function resolveBlogRewrite(host: string | null, pathname: string): string | null {
  if (!host || shouldBypassBlogRewrite(pathname)) return null;
  const hostname = host.split(':')[0].toLowerCase();
  const isBlogHost = hostname === 'blog.tabide.ai' || hostname.startsWith('blog.');
  if (!isBlogHost) return null;
  if (pathname.startsWith('/blog')) return null;
  return `/blog${pathname}`;
}
