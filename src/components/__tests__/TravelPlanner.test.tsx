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
  // The text is split across multiple elements or lines
  expect(screen.getByText((content) => content.includes("どこへ"))).toBeDefined();
  expect(screen.getByText((content) => content.includes("旅に出ますか？"))).toBeDefined();
});

it("navigates through all steps including new ones", async () => {
  render(<TravelPlanner />);

  // Step 1: Destination
  const input = screen.getByPlaceholderText("例: 京都、パリ、北海道...");
  fireEvent.change(input, { target: { value: "Tokyo" } });
  const nextBtn = screen.getByRole("button", { name: "次へ" });
  fireEvent.click(nextBtn);

  // Step 2: Dates (Just click next)
  fireEvent.click(nextBtn);

  // Step 3: Companions (Click 'Business')
  // Wait for the element to appear if there is an animation or state update lag
  const businessBtn = await screen.findByText("ビジネス");
  expect(businessBtn).toBeDefined();
  fireEvent.click(businessBtn);
  fireEvent.click(nextBtn);

  // Step 4: Themes (Click 'Gourmet')
  const gourmetBtn = await screen.findByText("グルメ");
  fireEvent.click(gourmetBtn);
  fireEvent.click(nextBtn);

  // Step 5: Budget (Click 'Standard')
  // Note: "普通" appears in both Budget and Pace options in StepThemes.
  const allStandardBtns = screen.getAllByText("普通");
  // Assuming the first one is budget (based on render order in StepThemes)
  fireEvent.click(allStandardBtns[0]);

  // Step 6: Pace (Click 'Balanced' which is labeled "普通")
  // So we need to click the second "普通".
  fireEvent.click(allStandardBtns[1]);

  // Now click next to move to Step 7 (FreeText)
  fireEvent.click(nextBtn);

  // Step 7: FreeText -> Submit
  expect(screen.getByRole("button", { name: "プランを作成する ✨" })).toBeDefined();
});
