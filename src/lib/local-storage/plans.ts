/**
 * Local storage management for unauthenticated users' plans
 * Plans are synced to server when user logs in
 */

'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';

import type { UserInput, Itinerary, LocalPlan, SyncResult } from '@/types';
import { withLock } from './lock';

const STORAGE_KEY = 'tabidea_local_plans';
const MAX_LOCAL_PLANS = 10; // Fallback limit if not logged in

// ============================================
// Local Storage Operations
// ============================================

export function getLocalPlans(): LocalPlan[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const storage = JSON.parse(data);
    return storage.plans || [];
  } catch (error) {
    console.error('Failed to read local plans:', error);
    return [];
  }
}

export async function saveLocalPlan(
  input: UserInput,
  itinerary: Itinerary
): Promise<LocalPlan> {
  return withLock(() => {
    const plans = getLocalPlans();

    const newPlan: LocalPlan = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input,
      itinerary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    plans.unshift(newPlan);

    if (plans.length > MAX_LOCAL_PLANS) {
      plans.splice(MAX_LOCAL_PLANS);
    }

    saveLocalPlans(plans);

    // Set cookie to indicate user has local plans (for auth callback)
    if (typeof document !== 'undefined') {
      document.cookie =
        'tabidea_has_local_plans=true; path=/; max-age=2592000; SameSite=Lax';
    }

    return newPlan;
  });
}

/**
 * Synchronous version for backward compatibility
 * @deprecated Use saveLocalPlan instead
 */
export function saveLocalPlanSync(
  input: UserInput,
  itinerary: Itinerary
): LocalPlan {
  const plans = getLocalPlans();

  const newPlan: LocalPlan = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    input,
    itinerary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  plans.unshift(newPlan);

  if (plans.length > MAX_LOCAL_PLANS) {
    plans.splice(MAX_LOCAL_PLANS);
  }

  saveLocalPlans(plans);

  // Set cookie to indicate user has local plans (for auth callback)
  if (typeof document !== 'undefined') {
    document.cookie =
      'tabidea_has_local_plans=true; path=/; max-age=2592000; SameSite=Lax';
  }

  return newPlan;
}

export async function updateLocalPlan(
  id: string,
  updates: Partial<Pick<LocalPlan, 'input' | 'itinerary'>>
): Promise<LocalPlan | null> {
  return withLock(() => {
    const plans = getLocalPlans();
    const index = plans.findIndex((p) => p.id === id);

    if (index === -1) return null;

    plans[index] = {
      ...plans[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveLocalPlans(plans);
    return plans[index];
  });
}

export async function deleteLocalPlan(id: string): Promise<boolean> {
  return withLock(() => {
    const plans = getLocalPlans();
    const index = plans.findIndex((p) => p.id === id);

    if (index === -1) return false;

    plans.splice(index, 1);
    saveLocalPlans(plans);
    return true;
  });
}

export function clearLocalPlans(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

function saveLocalPlans(plans: LocalPlan[]): void {
  if (typeof window === 'undefined') return;

  const storage = {
    plans,
    version: 1,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

// ============================================
// Sync Capacity Check
// ============================================

export interface SyncPreCheckResult {
  canSyncAll: boolean;
  localPlanCount: number;
  dbPlanCount: number;
  dbLimit: number;
  availableSlots: number;
  excessCount: number; // Number of plans that cannot be synced
}

/**
 * Check sync capacity before syncing
 * @param getUserPlanCount - Function to get current DB plan count
 * @param getStorageLimit - Function to get user's storage limit
 */
export async function checkSyncCapacity(
  getUserPlanCount: () => Promise<number>,
  getStorageLimit: () => Promise<{ limit: number }>
): Promise<SyncPreCheckResult> {
  const localPlans = getLocalPlans();
  const dbCount = await getUserPlanCount();
  const { limit } = await getStorageLimit();

  const availableSlots =
    limit === -1 ? Infinity : Math.max(0, limit - dbCount);
  const excessCount = Math.max(0, localPlans.length - availableSlots);

  return {
    canSyncAll: localPlans.length <= availableSlots,
    localPlanCount: localPlans.length,
    dbPlanCount: dbCount,
    dbLimit: limit,
    availableSlots: limit === -1 ? -1 : availableSlots,
    excessCount,
  };
}

// ============================================
// Sync with Server
// ============================================

export interface SelectiveSyncOptions {
  /** IDs of plans to sync (if not specified, syncs oldest plans up to limit) */
  planIdsToSync?: string[];
  /** What to do with unsynced plans */
  unsyncedAction: 'keep_local' | 'delete' | 'ask_user';
}

export interface DetailedSyncResult extends SyncResult {
  /** Plans that could not be synced (for user selection) */
  unsyncedPlans?: Array<{
    id: string;
    destination: string;
    createdAt: string;
  }>;
}

export async function syncLocalPlansToServer(
  uploadPlan: (
    input: UserInput,
    itinerary: Itinerary
  ) => Promise<{ success: boolean; shareCode?: string; error?: string }>,
  getExistingPlansCount?: () => Promise<number>
): Promise<SyncResult> {
  return syncLocalPlansSelectively(uploadPlan, {
    unsyncedAction: 'delete',
  });
}

/**
 * Selectively sync local plans to server
 * Allows choosing which plans to sync when storage limit is exceeded
 */
export async function syncLocalPlansSelectively(
  uploadPlan: (
    input: UserInput,
    itinerary: Itinerary
  ) => Promise<{ success: boolean; shareCode?: string; error?: string }>,
  options: SelectiveSyncOptions,
  getExistingPlansCount?: () => Promise<number>
): Promise<DetailedSyncResult> {
  const localPlans = getLocalPlans();

  const result: DetailedSyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    errors: [],
    mergeInfo: {
      existingPlansCount: 0,
      newPlansAdded: 0,
    },
  };

  if (localPlans.length === 0) {
    return result;
  }

  // Get existing plans count (optional)
  if (getExistingPlansCount) {
    try {
      result.mergeInfo.existingPlansCount = await getExistingPlansCount();
    } catch {
      // Continue even if count fetch fails
    }
  }

  // Determine which plans to sync
  let plansToSync: LocalPlan[];
  let plansToSkip: LocalPlan[];

  if (options.planIdsToSync) {
    // User-selected plans
    plansToSync = localPlans.filter((p) =>
      options.planIdsToSync!.includes(p.id)
    );
    plansToSkip = localPlans.filter(
      (p) => !options.planIdsToSync!.includes(p.id)
    );
  } else {
    // Sync all (default behavior)
    plansToSync = localPlans;
    plansToSkip = [];
  }

  const syncedIds: string[] = [];

  // Upload selected plans
  for (const plan of plansToSync) {
    try {
      const uploadResult = await uploadPlan(plan.input, plan.itinerary);

      if (uploadResult.success) {
        result.syncedCount++;
        result.mergeInfo.newPlansAdded++;
        syncedIds.push(plan.id);
      } else {
        result.failedCount++;
        result.errors.push(
          uploadResult.error || `Failed to sync plan ${plan.id}`
        );
        // Move failed plans to skip list
        plansToSkip.push(plan);
      }
    } catch (error) {
      result.failedCount++;
      result.errors.push(`Error syncing plan ${plan.id}: ${error}`);
      plansToSkip.push(plan);
    }
  }

  // Handle unsynced plans
  if (plansToSkip.length > 0) {
    result.skippedCount = plansToSkip.length;

    switch (options.unsyncedAction) {
      case 'delete':
        // Delete all local plans
        clearLocalPlans();
        break;
      case 'keep_local':
        // Keep unsynced plans, remove synced ones
        saveLocalPlans(plansToSkip);
        result.unsyncedPlans = plansToSkip.map((p) => ({
          id: p.id,
          destination: p.itinerary.destination || '未設定',
          createdAt: p.createdAt,
        }));
        break;
      case 'ask_user':
        // Return unsynced plans for user to decide
        result.unsyncedPlans = plansToSkip.map((p) => ({
          id: p.id,
          destination: p.itinerary.destination || '未設定',
          createdAt: p.createdAt,
        }));
        // Keep all plans until user decides
        break;
    }
  } else {
    // All synced, clear local storage
    clearLocalPlans();
  }

  result.success = result.failedCount === 0;
  return result;
}

export function getSyncPreviewInfo(): {
  localPlansCount: number;
  localPlans: Array<{ id: string; destination: string; createdAt: string }>;
} {
  const plans = getLocalPlans();
  return {
    localPlansCount: plans.length,
    localPlans: plans.map((p) => ({
      id: p.id,
      destination: p.itinerary.destination || '未設定',
      createdAt: p.createdAt,
    })),
  };
}

// ============================================
// React Hook (using useSyncExternalStore for localStorage)
// ============================================

// Subscribers for localStorage changes
let listeners: Array<() => void> = [];
let cachedPlans: LocalPlan[] | undefined;

export function notifyPlanChange() {
  cachedPlans = undefined;
  for (const listener of listeners) {
    listener();
  }
}

function subscribeToLocalPlans(callback: () => void) {
  listeners = [...listeners, callback];
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getLocalPlansSnapshot(): LocalPlan[] {
  if (cachedPlans) return cachedPlans;
  cachedPlans = getLocalPlans();
  return cachedPlans;
}

const SERVER_SNAPSHOT: LocalPlan[] = [];

function getLocalPlansServerSnapshot(): LocalPlan[] {
  return SERVER_SNAPSHOT;
}

export function useLocalPlans() {
  // Use useSyncExternalStore for proper synchronization with localStorage
  const plans = useSyncExternalStore(
    subscribeToLocalPlans,
    getLocalPlansSnapshot,
    getLocalPlansServerSnapshot
  );

  const [isLoading] = useState(false);

  const savePlan = useCallback(async (input: UserInput, itinerary: Itinerary) => {
    const newPlan = await saveLocalPlan(input, itinerary);
    notifyPlanChange();
    return newPlan;
  }, []);

  const updatePlan = useCallback(
    async (id: string, updates: Partial<Pick<LocalPlan, 'input' | 'itinerary'>>) => {
      const updated = await updateLocalPlan(id, updates);
      if (updated) {
        notifyPlanChange();
      }
      return updated;
    },
    []
  );

  const deletePlan = useCallback(async (id: string) => {
    const success = await deleteLocalPlan(id);
    if (success) {
      notifyPlanChange();
    }
    return success;
  }, []);

  const clearAll = useCallback(() => {
    clearLocalPlans();
    notifyPlanChange();
  }, []);

  return {
    plans,
    isLoading,
    savePlan,
    updatePlan,
    deletePlan,
    clearAll,
    hasPlans: plans.length > 0,
  };
}
