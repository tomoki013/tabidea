import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';
import { resolveShioriRewrite } from '@/lib/shiori/host';

export async function proxy(request: NextRequest) {
  const rewritePath = resolveShioriRewrite(request.headers.get('host'), request.nextUrl.pathname);
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
