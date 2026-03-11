/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TravelPlanner from "@/components/features/planner";

// Mock Image component
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock server actions
vi.mock("@/app/actions/travel-planner", () => ({
  savePlan: vi.fn(),
}));

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    session: null,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

// Mock local storage
vi.mock("@/lib/local-storage/plans", () => ({
  saveLocalPlan: vi.fn(() => ({ id: "local_test_123" })),
  getLocalPlans: vi.fn(() => []),
  notifyPlanChange: vi.fn(),
}));

// Mock UserPlansContext
vi.mock("@/context/UserPlansContext", () => ({
  useUserPlans: () => ({
    refreshPlans: vi.fn(),
  }),
}));

// Mock useComposeGeneration for error testing
const mockCompose = {
  steps: [] as Array<{ id: string; message: string; status: string }>,
  currentStep: null as string | null,
  isGenerating: false,
  isCompleted: false,
  errorMessage: "",
  limitExceeded: null as any,
  warnings: [] as string[],
  partialDays: new Map(),
  totalDays: 0,
  generate: vi.fn(),
  reset: vi.fn(),
  clearLimitExceeded: vi.fn(),
};

vi.mock("@/lib/hooks/useComposeGeneration", () => ({
  useComposeGeneration: () => mockCompose,
}));

const mockInput = {
  destinations: ["Tokyo"],
  isDestinationDecided: true,
  region: "",
  dates: "2024-01-01",
  companions: "Couple",
  theme: ["Food"],
  budget: "Medium",
  pace: "Relaxed",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: false,
};

describe("TravelPlanner Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompose.errorMessage = "";
    mockCompose.isGenerating = false;
  });

  it("shows error message when compose pipeline returns an error", async () => {
    mockCompose.errorMessage = "Generation failed";

    render(
      <TravelPlanner
        initialInput={mockInput}
      />
    );

    // Expect error UI with retry button
    await waitFor(() => {
      expect(screen.getByText("Generation failed")).toBeDefined();
      expect(screen.getByRole("button")).toBeDefined();
    });
  });

  it("shows loading animation when compose pipeline is generating", async () => {
    mockCompose.isGenerating = true;
    mockCompose.steps = [
      { id: "normalize", message: "Normalizing...", status: "active" },
    ];

    render(
      <TravelPlanner
        initialInput={mockInput}
      />
    );

    // ComposeLoadingAnimation should be rendered
    await waitFor(() => {
      expect(screen.getByText("Normalizing...")).toBeDefined();
    });
  });
});
