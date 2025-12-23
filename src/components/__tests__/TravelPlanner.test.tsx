import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TravelPlanner from "@/components/TravelPlanner";

// Mock Image component
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock server actions
vi.mock("@/app/actions/travel-planner", () => ({
  generatePlan: vi.fn(),
  regeneratePlan: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

it("renders the initial form", () => {
  render(<TravelPlanner />);
  expect(screen.getByText("どこへ行きますか？")).toBeDefined();
});

it("navigates through all steps including new ones", async () => {
  render(<TravelPlanner />);

  // Step 1: Destination
  const input = screen.getByPlaceholderText("例: パリ, 京都, 北海道...");
  fireEvent.change(input, { target: { value: "Tokyo" } });
  const nextBtn = screen.getByRole("button", { name: "Next Step" });
  fireEvent.click(nextBtn);

  // Step 2: Dates (Just click next)
  fireEvent.click(nextBtn);

  // Step 3: Companions (Click 'Business')
  const businessBtn = screen.getByText("同僚・ビジネス");
  expect(businessBtn).toBeDefined();
  fireEvent.click(businessBtn);
  fireEvent.click(nextBtn);

  // Step 4: Themes (Click 'Gourmet')
  const gourmetBtn = screen.getByText("グルメ");
  fireEvent.click(gourmetBtn);
  fireEvent.click(nextBtn);

  // Step 5: Budget (Click 'Standard')
  const standardBtn = screen.getByText("普通");
  expect(standardBtn).toBeDefined();
  fireEvent.click(standardBtn);
  fireEvent.click(nextBtn);

  // Step 6: Pace (Click 'Balanced')
  const balancedBtn = screen.getByText("バランスよく");
  expect(balancedBtn).toBeDefined();
  fireEvent.click(balancedBtn);
  fireEvent.click(nextBtn);

  // Step 7: FreeText -> Submit
  expect(screen.getByRole("button", { name: "Create Plan ✨" })).toBeDefined();
});
