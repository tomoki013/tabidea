import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';
import { resolveShioriRewrite } from '@/lib/shiori/host';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  if (host.startsWith('blog.tabide.ai')) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/blog${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  const rewritePath = resolveShioriRewrite(host, pathname);
  if (rewritePath) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewritePath;
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://blog.tabide.ai https://tabide.ai https://www.tabide.ai");
    return response;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
