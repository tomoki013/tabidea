import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user has local plans to sync
      const cookieStore = await cookies();
      const hasLocalPlans = cookieStore.get('tabidea_has_local_plans')?.value === 'true';

      // Clear the cookie
      cookieStore.delete('tabidea_has_local_plans');

      // If user has local plans, redirect to sync page
      if (hasLocalPlans) {
        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';

        let redirectUrl: string;
        if (isLocalEnv) {
          redirectUrl = `${origin}/sync-plans`;
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}/sync-plans`;
        } else {
          redirectUrl = `${origin}/sync-plans`;
        }

        return NextResponse.redirect(redirectUrl);
      }

      // No local plans, redirect to original destination
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to error page or home on failure
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
