import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TravelPlanner from "@/components/features/planner";
import * as TravelPlannerActions from "@/app/actions/travel-planner";

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
}));

// Mock server actions
vi.mock("@/app/actions/travel-planner", () => ({
  generatePlanOutline: vi.fn(),
  generatePlanChunk: vi.fn(),
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
  });

  it("shows generic error and retry button on standard failure", async () => {
    // Mock generic error
    vi.mocked(TravelPlannerActions.generatePlanOutline).mockRejectedValue(new Error("Network Error"));

    render(
      <TravelPlanner
        initialStep={8}
        initialInput={mockInput}
      />
    );

    // Click submit
    const submitBtn = screen.getByRole("button", { name: /プランを作成する/ });
    fireEvent.click(submitBtn);

    // Expect generic error UI
    await waitFor(() => {
      expect(screen.getByText("もう一度試す")).toBeDefined();
    });
    // Ensure we don't see the refresh button
    expect(screen.queryByText("ページを更新")).toBeNull();
  });

  it("shows refresh button on Server Action not found error", async () => {
    // Mock Server Action not found error
    // The exact error message string usually contains "Server Action ... was not found on the server"
    vi.mocked(TravelPlannerActions.generatePlanOutline).mockRejectedValue(
      new Error('Server Action "40ebdd9b5d999cb6d88070a7a86b52097f6be0d1fe" was not found on the server')
    );

    render(
      <TravelPlanner
        initialStep={8}
        initialInput={mockInput}
      />
    );

    // Click submit
    const submitBtn = screen.getByRole("button", { name: /プランを作成する/ });
    fireEvent.click(submitBtn);

    // Expect refresh UI
    // Note: This test is expected to FAIL initially because we haven't implemented the fix yet.
    await waitFor(() => {
      expect(screen.getByText("ページを更新")).toBeDefined();
    });
  });
});
