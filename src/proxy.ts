import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';
import { resolveShioriRewrite } from '@/lib/shiori/host';
import { resolveBlogRewrite } from '@/lib/blog/host';

export async function proxy(request: NextRequest) {
  const shioriRewritePath = resolveShioriRewrite(request.headers.get('host'), request.nextUrl.pathname);
  if (shioriRewritePath) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = shioriRewritePath;
    return NextResponse.rewrite(rewriteUrl);
  }

  const blogRewritePath = resolveBlogRewrite(request.headers.get('host'), request.nextUrl.pathname);
  if (blogRewritePath) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = blogRewritePath;
    return NextResponse.rewrite(rewriteUrl);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
