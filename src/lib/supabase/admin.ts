/**
 * Supabase admin client (Service Role)
 * Use this for operations that need to bypass RLS, such as:
 * - Webhook handlers (Stripe, etc.)
 * - Background jobs
 * - Admin operations
 *
 * IMPORTANT: This file should NOT import 'next/headers' to allow
 * usage in contexts where cookies are not available.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create admin client without cookies (for webhooks and background jobs)
 * Use this when you don't have access to cookies (e.g., Stripe webhooks)
 * This client bypasses RLS using the service role key
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase service role environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
