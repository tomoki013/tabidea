import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirect') || '/';

  await supabase.auth.signOut();

  const origin = request.headers.get('origin') || '';
  return NextResponse.redirect(`${origin}${redirectTo}`, {
    status: 302,
  });
}

export async function GET(request: Request) {
  // Also support GET for simple link-based logout
  return POST(request);
}
