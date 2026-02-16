export function shouldBypassShioriRewrite(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  );
}

export function resolveShioriRewrite(host: string | null, pathname: string): string | null {
  if (!host || shouldBypassShioriRewrite(pathname)) return null;
  const hostname = host.split(':')[0].toLowerCase();
  const isShioriHost = hostname === 'shiori.tabide.ai' || hostname.startsWith('shiori.');
  if (!isShioriHost) return null;
  if (pathname.startsWith('/shiori')) return null;
  return `/shiori${pathname}`;
}
