/**
 * Supabase utilities barrel export
 */

export { createClient } from './client';
export {
  createClient as createServerClient,
  createAdminClient,
  getUser,
  getSession,
} from './server';
export { updateSession } from './proxy';
