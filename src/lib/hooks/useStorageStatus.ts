'use client';

import { useState, useEffect, useCallback } from 'react';
import { checkPlanStorageLimit } from '@/lib/limits/check';

interface StorageStatus {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
}

/**
 * Hook to get current storage status
 * Provides real-time information about plan storage limits
 */
export function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await checkPlanStorageLimit();
      setStatus({
        ...result,
        remaining:
          result.limit === -1
            ? -1
            : Math.max(0, result.limit - result.currentCount),
      });
    } catch (error) {
      console.error('Failed to check storage status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, isLoading, refresh };
}
