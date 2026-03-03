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
  getFavoritePlanIds,
  addPlanToFavorites,
  removePlanFromFavorites,
} from "@/app/actions/travel-planner";
import { useAuth } from "./AuthContext";

interface FavoritesContextType {
  favoritePlanIds: Set<string>;
  isLoading: boolean;
  isFavorited: (planId: string) => boolean;
  addFavorite: (planId: string) => Promise<boolean>;
  removeFavorite: (planId: string) => Promise<boolean>;
  toggleFavorite: (planId: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [favoritePlanIds, setFavoritePlanIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites when user logs in
  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setFavoritePlanIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const result = await getFavoritePlanIds();
      if (result.success) {
        setFavoritePlanIds(new Set(result.planIds));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Initialize favorites on mount or when user changes
  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorited = useCallback(
    (planId: string) => {
      return favoritePlanIds.has(planId);
    },
    [favoritePlanIds]
  );

  const addFavorite = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        return false;
      }

      // Optimistic update
      setFavoritePlanIds((prev) => new Set([...prev, planId]));

      try {
        const result = await addPlanToFavorites(planId);
        if (!result.success) {
          // Revert on error
          setFavoritePlanIds((prev) => {
            const next = new Set(prev);
            next.delete(planId);
            return next;
          });
          return false;
        }
        return true;
      } catch (error) {
        console.error("Failed to add favorite:", error);
        // Revert on error
        setFavoritePlanIds((prev) => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
        return false;
      }
    },
    [isAuthenticated]
  );

  const removeFavorite = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!isAuthenticated) {
        return false;
      }

      // Optimistic update
      setFavoritePlanIds((prev) => {
        const next = new Set(prev);
        next.delete(planId);
        return next;
      });

      try {
        const result = await removePlanFromFavorites(planId);
        if (!result.success) {
          // Revert on error
          setFavoritePlanIds((prev) => new Set([...prev, planId]));
          return false;
        }
        return true;
      } catch (error) {
        console.error("Failed to remove favorite:", error);
        // Revert on error
        setFavoritePlanIds((prev) => new Set([...prev, planId]));
        return false;
      }
    },
    [isAuthenticated]
  );

  const toggleFavorite = useCallback(
    async (planId: string): Promise<boolean> => {
      if (isFavorited(planId)) {
        return await removeFavorite(planId);
      } else {
        return await addFavorite(planId);
      }
    },
    [isFavorited, addFavorite, removeFavorite]
  );

  const value: FavoritesContextType = {
    favoritePlanIds,
    isLoading,
    isFavorited,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }

  return context;
}
