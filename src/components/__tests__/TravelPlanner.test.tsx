import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  // Updated text assertions for the new UI
  expect(screen.getByText((content) => content.includes("まずは、行き先を"))).toBeDefined();
  expect(screen.getByText((content) => content.includes("教えてください。"))).toBeDefined();
});

it("navigates through all steps including new ones", async () => {
  render(<TravelPlanner />);

  // Step 1: Destination
  const input = screen.getByPlaceholderText("ここに行きたい...");
  fireEvent.change(input, { target: { value: "Tokyo" } });

  const nextBtn = screen.getByRole("button", { name: "次へ" });
  fireEvent.click(nextBtn);

  // Step 2: Dates (Just click next)
  // New UI uses "いつ、どれくらい？"
  await screen.findByText("いつ、どれくらい？");
  fireEvent.click(nextBtn);

  // Step 3: Companions (Click 'Business')
  const businessBtn = await screen.findByText("ビジネス");
  expect(businessBtn).toBeDefined();
  fireEvent.click(businessBtn);
  // In the current StepCompanions implementation, it seems I need to click Next manually after selection
  // because the "Next" button is outside the StepCompanions component (in StepContainer).
  fireEvent.click(nextBtn);

  // Step 4: Themes (Click 'Gourmet' -> 'グルメ')
  // Note: StepThemes now includes Budget and Pace
  const gourmetBtn = await screen.findByText("#グルメ");
  fireEvent.click(gourmetBtn);

  // Budget "普通"
  const allStandardBtns = screen.getAllByText("普通");
  fireEvent.click(allStandardBtns[0]); // Budget

  // Pace "普通"
  fireEvent.click(allStandardBtns[1]); // Pace

  fireEvent.click(nextBtn);

  // Step 5: FreeText
  // Wait for the text to appear. The text "最後に、メモはありますか？" might be split due to <br /> or newlines.
  // We use a flexible matcher.
  await screen.findByText((content) => content.includes("最後に") && content.includes("メモはありますか"));

  // Submit button
  const submitBtn = screen.getByRole("button", { name: /プランを作成する/ });
  expect(submitBtn).toBeDefined();
});
