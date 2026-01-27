'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserPlansList } from '@/app/actions/travel-planner';
import type { PlanListItem } from '@/types';

interface UserPlansContextType {
  plans: PlanListItem[];
  isLoading: boolean;
  error: string | null;
  refreshPlans: () => Promise<void>;
  addPlan: (plan: PlanListItem) => void;
  removePlan: (planId: string) => void;
  updatePlan: (planId: string, updates: Partial<PlanListItem>) => void;
  setPlans: (plans: PlanListItem[]) => void;
}

const UserPlansContext = createContext<UserPlansContextType | undefined>(undefined);

export function UserPlansProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [plans, setPlansState] = useState<PlanListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!isAuthenticated) {
      setPlansState([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch up to 50 plans to cover both sidebar and initial My Plans view
      const result = await getUserPlansList(50);

      if (result.success && result.plans) {
        setPlansState(
          result.plans.map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }))
        );
        setHasFetched(true);
      } else {
        setError(result.error || 'Failed to fetch plans');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated && !hasFetched) {
      fetchPlans();
    } else if (!isAuthenticated) {
      setPlansState([]);
      setHasFetched(false);
    }
  }, [isAuthenticated, hasFetched, fetchPlans]);

  const refreshPlans = useCallback(async () => {
    await fetchPlans();
  }, [fetchPlans]);

  const addPlan = useCallback((plan: PlanListItem) => {
    setPlansState((prev) => [plan, ...prev]);
  }, []);

  const removePlan = useCallback((planId: string) => {
    setPlansState((prev) => prev.filter((p) => p.id !== planId));
  }, []);

  const updatePlan = useCallback((planId: string, updates: Partial<PlanListItem>) => {
    setPlansState((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, ...updates } : p))
    );
  }, []);

  const setPlans = useCallback((newPlans: PlanListItem[]) => {
      setPlansState(newPlans);
      setHasFetched(true);
  }, []);

  return (
    <UserPlansContext.Provider
      value={{
        plans,
        isLoading,
        error,
        refreshPlans,
        addPlan,
        removePlan,
        updatePlan,
        setPlans,
      }}
    >
      {children}
    </UserPlansContext.Provider>
  );
}

export function useUserPlans() {
  const context = useContext(UserPlansContext);
  if (context === undefined) {
    throw new Error('useUserPlans must be used within a UserPlansProvider');
  }
  return context;
}
