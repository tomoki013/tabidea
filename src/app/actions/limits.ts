'use server';

import { checkPlanStorageLimit as checkStorageLimit } from '@/lib/limits/check';

/**
 * Server Action: Check plan storage limit
 * This wraps the library function to be callable from Client Components
 */
export async function checkPlanStorageLimit(): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  return checkStorageLimit();
}
