/**
 * Supabase browser client
 * Use this in client components
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Use dummy values if env vars are missing (for build time)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";

  if (!supabaseUrl || !supabaseAnonKey) {
    // This should not happen with fallback, but keeping check just in case
    throw new Error('Missing Supabase environment variables');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
