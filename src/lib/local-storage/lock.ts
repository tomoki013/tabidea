/**
 * Multi-tab localStorage lock mechanism
 * Prevents concurrent writes to localStorage across multiple tabs
 */

'use client';

const LOCK_KEY = 'tabidea_storage_lock';
const LOCK_TIMEOUT = 5000; // 5 seconds

interface StorageLock {
  tabId: string;
  timestamp: number;
}

/**
 * Get or create a unique tab ID for this session
 */
function getTabId(): string {
  if (typeof sessionStorage === 'undefined') return 'unknown';

  let tabId = sessionStorage.getItem('tabidea_tab_id');
  if (!tabId) {
    tabId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem('tabidea_tab_id', tabId);
  }
  return tabId;
}

/**
 * Attempt to acquire the storage lock
 * Returns true if lock acquired, false otherwise
 */
export function acquireLock(): boolean {
  if (typeof localStorage === 'undefined') return true;

  const tabId = getTabId();
  const now = Date.now();

  const existingLock = localStorage.getItem(LOCK_KEY);
  if (existingLock) {
    try {
      const lock: StorageLock = JSON.parse(existingLock);

      // Same tab - extend lock
      if (lock.tabId === tabId) {
        localStorage.setItem(
          LOCK_KEY,
          JSON.stringify({ tabId, timestamp: now })
        );
        return true;
      }

      // Stale lock - take over
      if (now - lock.timestamp > LOCK_TIMEOUT) {
        localStorage.setItem(
          LOCK_KEY,
          JSON.stringify({ tabId, timestamp: now })
        );
        return true;
      }

      // Another tab holds lock
      return false;
    } catch {
      // Invalid lock data - take over
      localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId, timestamp: now }));
      return true;
    }
  }

  // No lock - acquire it
  localStorage.setItem(LOCK_KEY, JSON.stringify({ tabId, timestamp: now }));
  return true;
}

/**
 * Release the storage lock
 */
export function releaseLock(): void {
  if (typeof localStorage === 'undefined') return;

  const tabId = getTabId();
  const existingLock = localStorage.getItem(LOCK_KEY);

  if (existingLock) {
    try {
      const lock: StorageLock = JSON.parse(existingLock);
      // Only release if this tab owns the lock
      if (lock.tabId === tabId) {
        localStorage.removeItem(LOCK_KEY);
      }
    } catch {
      // Invalid lock data - remove it
      localStorage.removeItem(LOCK_KEY);
    }
  }
}

/**
 * Execute an operation with a lock
 * Retries up to maxRetries times if lock cannot be acquired
 */
export async function withLock<T>(
  operation: () => T | Promise<T>,
  maxRetries = 3,
  retryDelay = 500
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    if (acquireLock()) {
      try {
        return await operation();
      } finally {
        releaseLock();
      }
    }

    // Wait before retry
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    'ストレージのロックを取得できませんでした。他のタブで操作中の可能性があります。'
  );
}
