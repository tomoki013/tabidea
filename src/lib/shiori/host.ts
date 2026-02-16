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

  const hostname = host.split(',')[0].trim().split(':')[0].toLowerCase().replace(/\.$/, '');

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

export function resolveExternalSubdomainRedirect(host: string | null, pathname: string, search = ''): string | null {
  if (!host) return null;

  const hostname = host.split(',')[0].trim().split(':')[0].toLowerCase().replace(/\.$/, '');
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const normalizedSearch = search.startsWith('?') ? search : search ? `?${search}` : '';

  if ((hostname === 'tabide.ai' || hostname === 'www.tabide.ai') && normalizedPath === '/shiori') {
    return `https://shiori.tabide.ai/${normalizedSearch}`;
  }

  if ((hostname === 'tabide.ai' || hostname === 'www.tabide.ai') && normalizedPath === '/blog') {
    return `https://blog.tabide.ai/${normalizedSearch}`;
  }

  return null;
}

export function resolveShioriRewrite(host: string | null, pathname: string): string | null {
  const resolved = resolveHostRewrite(host, pathname);
  if (resolved?.startsWith('/shiori')) return resolved;
  return null;
}
