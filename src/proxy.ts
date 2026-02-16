import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';
import { resolveExternalSubdomainRedirect, resolveHostRewrite } from '@/lib/shiori/host';

export async function proxy(request: NextRequest) {
  const redirectUrl = resolveExternalSubdomainRedirect(
    request.headers.get('host'),
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl, 308);
  }

  const rewritePath = resolveHostRewrite(request.headers.get('host'), request.nextUrl.pathname);
  if (rewritePath) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewritePath;
    return NextResponse.rewrite(rewriteUrl);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default proxy;
