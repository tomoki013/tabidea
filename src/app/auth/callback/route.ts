import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const redirect = searchParams.get('redirect') ?? next;
  const restore = searchParams.get('restore');
  const modal = searchParams.get('modal');
  const autoSave = searchParams.get('autoSave');

  // Determine base URL: Prioritize origin from request
  const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL;

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user has local plans to sync
      const cookieStore = await cookies();
      const hasLocalPlans = cookieStore.get('tabidea_has_local_plans')?.value === 'true';

      // Clear the cookie
      cookieStore.delete('tabidea_has_local_plans');

      // If user has local plans, redirect to sync page (unless restoring state)
      if (hasLocalPlans && !restore) {
        return NextResponse.redirect(`${baseUrl}/sync-plans`);
      }

      // Build redirect URL with restoration parameters
      const redirectUrl = new URL(redirect, baseUrl);

      if (restore === 'true') {
        redirectUrl.searchParams.set('restore', 'true');
      }
      if (modal === 'true') {
        redirectUrl.searchParams.set('modal', 'true');
      }
      if (autoSave === 'true') {
        redirectUrl.searchParams.set('autoSave', 'true');
      }

      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return to error page or home on failure
  return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_failed`);
}
