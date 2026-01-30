"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import {
  getFlaggedPlanIds,
  addPlanToFlags,
  removePlanFromFlags,
} from "@/app/actions/travel-planner";
import { useAuth } from "./AuthContext";

interface FlagsContextType {
  flaggedPlanIds: Set<string>;
  isLoading: boolean;
  isFlagged: (planId: string) => boolean;
  addFlag: (planId: string) => Promise<boolean>;
  removeFlag: (planId: string) => Promise<boolean>;
  toggleFlag: (planId: string) => Promise<boolean>;
  refreshFlags: () => Promise<void>;
}

const FlagsContext = createContext<FlagsContextType | undefined>(
  undefined
);

export function FlagsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [flaggedPlanIds, setFlaggedPlanIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load flags when user logs in
  const refreshFlags = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setFlaggedPlanIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const result = await getFlaggedPlanIds();
      if (result.success) {
        setFlaggedPlanIds(new Set(result.planIds));
      }
    } catch (error) {
      console.error("Failed to load flags:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Initialize flags on mount or when user changes
  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  const isFlagged = useCallback(
    (planId: string) => {
      return flaggedPlanIds.has(planId);
    },
    [flaggedPlanIds]
  );

  const addFlag = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        return false;
      }

      // Optimistic update
      setFlaggedPlanIds((prev) => new Set([...prev, planId]));

      try {
        const result = await addPlanToFlags(planId);
        if (!result.success) {
          // Revert on error
          setFlaggedPlanIds((prev) => {
            const next = new Set(prev);
            next.delete(planId);
            return next;
          });
          return false;
        }
        return true;
      } catch (error) {
        console.error("Failed to add flag:", error);
        // Revert on error
        setFlaggedPlanIds((prev) => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
        return false;
      }
    },
    [isAuthenticated]
  );

  const removeFlag = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        return false;
      }

      // Optimistic update
      setFlaggedPlanIds((prev) => {
        const next = new Set(prev);
        next.delete(planId);
        return next;
      });

      try {
        const result = await removePlanFromFlags(planId);
        if (!result.success) {
          // Revert on error
          setFlaggedPlanIds((prev) => new Set([...prev, planId]));
          return false;
        }
        return true;
      } catch (error) {
        console.error("Failed to remove flag:", error);
        // Revert on error
        setFlaggedPlanIds((prev) => new Set([...prev, planId]));
        return false;
      }
    },
    [isAuthenticated]
  );

  const toggleFlag = useCallback(
    async (planId: string): Promise<boolean> => {
      if (isFlagged(planId)) {
        return await removeFlag(planId);
      } else {
        return await addFlag(planId);
      }
    },
    [isFlagged, addFlag, removeFlag]
  );

  const value: FlagsContextType = {
    flaggedPlanIds,
    isLoading,
    isFlagged,
    addFlag,
    removeFlag,
    toggleFlag,
    refreshFlags,
  };

  return (
    <FlagsContext.Provider value={value}>
      {children}
    </FlagsContext.Provider>
  );
}

export function useFlags() {
  const context = useContext(FlagsContext);

  if (context === undefined) {
    throw new Error("useFlags must be used within a FlagsProvider");
  }

  return context;
}
