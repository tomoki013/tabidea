"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { ComposeStep } from "@/lib/hooks/useComposeGeneration";
import { localizeHref, resolveLanguageFromPathname } from "@/lib/i18n/navigation";
import FullScreenGenerationOverlay, {
  type OverlayPhase,
} from "@/components/features/planner/FullScreenGenerationOverlay";

interface OverlayProgressPayload {
  steps?: ComposeStep[];
  currentStep?: string | null;
  previewDestination?: string;
  previewDescription?: string;
  totalDays?: number;
}

interface OverlayState extends OverlayProgressPayload {
  phase: OverlayPhase;
  targetHref: string | null;
}

interface PlanGenerationOverlayContextValue {
  showGenerating: (payload?: OverlayProgressPayload) => void;
  syncProgress: (payload: OverlayProgressPayload) => void;
  showSuccess: () => void;
  showUpdating: (targetHref: string) => void;
  hideOverlay: () => void;
}

const DEFAULT_STATE: OverlayState = {
  phase: null,
  steps: [],
  currentStep: null,
  previewDestination: "",
  previewDescription: "",
  totalDays: 0,
  targetHref: null,
};

const PlanGenerationOverlayContext = createContext<PlanGenerationOverlayContextValue | undefined>(
  undefined,
);

export function PlanGenerationOverlayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [state, setState] = useState<OverlayState>(DEFAULT_STATE);

  const localizedTargetHref = useMemo(() => {
    if (!state.targetHref) return null;
    const language = resolveLanguageFromPathname(pathname);
    return localizeHref(state.targetHref, language);
  }, [pathname, state.targetHref]);
  const effectiveState =
    state.phase === "updating" &&
    localizedTargetHref &&
    pathname === localizedTargetHref
      ? DEFAULT_STATE
      : state;

  const showGenerating = useCallback((payload?: OverlayProgressPayload) => {
    setState({
      ...DEFAULT_STATE,
      phase: "generating",
      steps: payload?.steps ?? [],
      currentStep: payload?.currentStep ?? null,
      previewDestination: payload?.previewDestination ?? "",
      previewDescription: payload?.previewDescription ?? "",
      totalDays: payload?.totalDays ?? 0,
    });
  }, []);

  const syncProgress = useCallback((payload: OverlayProgressPayload) => {
    setState((prev) => {
      if (prev.phase !== "generating") {
        return prev;
      }

      return {
        ...prev,
        steps: payload.steps ?? prev.steps,
        currentStep: payload.currentStep ?? prev.currentStep,
        previewDestination: payload.previewDestination ?? prev.previewDestination,
        previewDescription: payload.previewDescription ?? prev.previewDescription,
        totalDays: payload.totalDays ?? prev.totalDays,
      };
    });
  }, []);

  const showSuccess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "success",
      currentStep: null,
    }));
  }, []);

  const showUpdating = useCallback((targetHref: string) => {
    setState((prev) => ({
      ...prev,
      phase: "updating",
      currentStep: null,
      targetHref,
    }));
  }, []);

  const hideOverlay = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return (
    <PlanGenerationOverlayContext.Provider
      value={{
        showGenerating,
        syncProgress,
        showSuccess,
        showUpdating,
        hideOverlay,
      }}
    >
      {children}
      <FullScreenGenerationOverlay
        phase={effectiveState.phase}
        steps={effectiveState.steps}
        currentStep={effectiveState.currentStep}
        previewDestination={effectiveState.previewDestination}
        previewDescription={effectiveState.previewDescription}
        totalDays={effectiveState.totalDays}
      />
    </PlanGenerationOverlayContext.Provider>
  );
}

export function usePlanGenerationOverlay() {
  const context = useContext(PlanGenerationOverlayContext);
  if (!context) {
    throw new Error(
      "usePlanGenerationOverlay must be used within a PlanGenerationOverlayProvider",
    );
  }

  return context;
}
