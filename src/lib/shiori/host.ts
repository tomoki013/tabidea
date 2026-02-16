function shouldBypassHostRewrite(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  );
}

export const shouldBypassShioriRewrite = shouldBypassHostRewrite;

export function resolveHostRewrite(host: string | null, pathname: string): string | null {
  if (!host || shouldBypassHostRewrite(pathname)) return null;

  const hostname = host.split(':')[0].toLowerCase();

  const isShioriHost = hostname === 'shiori.tabide.ai' || hostname.startsWith('shiori.');
  if (isShioriHost) {
    if (pathname.startsWith('/shiori')) return null;
    return `/shiori${pathname}`;
  }

  const isBlogHost = hostname === 'blog.tabide.ai' || hostname.startsWith('blog.');
  if (isBlogHost) {
    if (pathname.startsWith('/blog')) return null;
    return `/blog${pathname}`;
  }

  return null;
}

export function resolveShioriRewrite(host: string | null, pathname: string): string | null {
  const resolved = resolveHostRewrite(host, pathname);
  if (resolved?.startsWith('/shiori')) return resolved;
  return null;
}
