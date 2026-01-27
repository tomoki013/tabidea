/**
 * Local storage management for unauthenticated users' plans
 * Plans are synced to server when user logs in
 */

'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';

import type { UserInput, Itinerary, LocalPlan, SyncResult } from '@/types';

const STORAGE_KEY = 'tabidea_local_plans';
const MAX_LOCAL_PLANS = 10;

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

export function saveLocalPlan(
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
  return newPlan;
}

export function updateLocalPlan(
  id: string,
  updates: Partial<Pick<LocalPlan, 'input' | 'itinerary'>>
): LocalPlan | null {
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
}

export function deleteLocalPlan(id: string): boolean {
  const plans = getLocalPlans();
  const index = plans.findIndex((p) => p.id === id);

  if (index === -1) return false;

  plans.splice(index, 1);
  saveLocalPlans(plans);
  return true;
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
// Sync with Server
// ============================================

export async function syncLocalPlansToServer(
  uploadPlan: (
    input: UserInput,
    itinerary: Itinerary
  ) => Promise<{ success: boolean; shareCode?: string; error?: string }>,
  getExistingPlansCount?: () => Promise<number>
): Promise<SyncResult> {
  const localPlans = getLocalPlans();

  const result: SyncResult = {
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

  const syncedIds: string[] = [];

  // Upload all local plans (merge strategy - no overwrite)
  for (const plan of localPlans) {
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
      }
    } catch (error) {
      result.failedCount++;
      result.errors.push(`Error syncing plan ${plan.id}: ${error}`);
    }
  }

  // Remove synced plans from local storage
  if (syncedIds.length > 0) {
    const remainingPlans = localPlans.filter((p) => !syncedIds.includes(p.id));
    saveLocalPlans(remainingPlans);
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

  const savePlan = useCallback((input: UserInput, itinerary: Itinerary) => {
    const newPlan = saveLocalPlan(input, itinerary);
    notifyPlanChange();
    return newPlan;
  }, []);

  const updatePlan = useCallback(
    (id: string, updates: Partial<Pick<LocalPlan, 'input' | 'itinerary'>>) => {
      const updated = updateLocalPlan(id, updates);
      if (updated) {
        notifyPlanChange();
      }
      return updated;
    },
    []
  );

  const deletePlan = useCallback((id: string) => {
    const success = deleteLocalPlan(id);
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
