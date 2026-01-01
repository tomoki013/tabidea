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
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

it("renders the initial form", () => {
  render(<TravelPlanner />);
  // Updated text assertions for the new Initial Choice Step
  expect(screen.getByText((content) => content.includes("行き先は"))).toBeDefined();
  expect(screen.getByText((content) => content.includes("決まっていますか？"))).toBeDefined();
});

it("navigates through 'Decided' flow", async () => {
  render(<TravelPlanner />);

  // Step 0: Initial Choice -> Decided
  const decidedBtn = screen.getByText("決まっている");
  fireEvent.click(decidedBtn);

  // Step 1: Destination
  const input = await screen.findByPlaceholderText("ここに行きたい...");
  fireEvent.change(input, { target: { value: "Tokyo" } });

  const nextBtn = screen.getByRole("button", { name: "次へ" });
  fireEvent.click(nextBtn);

  // Step 2: Companions (Click 'Business')
  const businessBtn = await screen.findByText("ビジネス");
  fireEvent.click(businessBtn);
  fireEvent.click(nextBtn);

  // Step 3: Themes (Click 'Gourmet' -> 'グルメ')
  const gourmetBtn = await screen.findByText("グルメ");
  fireEvent.click(gourmetBtn);
  fireEvent.click(nextBtn);

  // Step 4: Budget
  await screen.findByText("予算はどれくらい？");
  const budgetBtn = screen.getByText("普通");
  fireEvent.click(budgetBtn);
  fireEvent.click(nextBtn);

  // Step 5: Dates
  await screen.findByText("いつ、どれくらい？");
  // Toggle "Flexible" to ensure dates input is set
  const flexibleCheck = screen.getByLabelText("未定", { selector: "#date-undecided" });
  fireEvent.click(flexibleCheck);
  fireEvent.click(nextBtn);

  // Step 6: Pace
  await screen.findByText("旅のペースは？");
  const paceBtn = screen.getByText("バランスよく");
  fireEvent.click(paceBtn);
  fireEvent.click(nextBtn);

  // Step 7: FreeText
  await screen.findByText((content) => content.includes("最後に") && content.includes("特別なご要望は"));

  // Submit button
  const submitBtn = screen.getByRole("button", { name: /プランを作成する/ });
  expect(submitBtn).toBeDefined();
});

it("navigates through 'Not Decided' flow", async () => {
  render(<TravelPlanner />);

  // Step 0: Initial Choice -> Not Decided
  const notDecidedBtn = screen.getByText("決まっていない");
  fireEvent.click(notDecidedBtn);

  // Step 1: Region -> Domestic
  const domesticBtn = await screen.findByText("国内");
  fireEvent.click(domesticBtn);

  const nextBtn1 = screen.getByRole("button", { name: "次へ" });
  fireEvent.click(nextBtn1);

  // Step 2: Companions
  const companionStep = await screen.findByText("誰との旅ですか？");
  expect(companionStep).toBeDefined();

  const soloBtn = screen.getByText("一人旅");
  fireEvent.click(soloBtn);

  const nextBtn = screen.getByRole("button", { name: "次へ" });
  fireEvent.click(nextBtn);

  // Step 3: Themes
  const gourmetBtn = await screen.findByText("グルメ");
  fireEvent.click(gourmetBtn);
  fireEvent.click(nextBtn);

  // Step 4: Budget
  await screen.findByText("予算はどれくらい？");
  const budgetBtn = screen.getByText("普通");
  fireEvent.click(budgetBtn);
  fireEvent.click(nextBtn);

  // And so on... verifying we are in the flow
  await screen.findByText("いつ、どれくらい？");
  const flexibleCheck2 = screen.getByLabelText("未定", { selector: "#date-undecided" });
  fireEvent.click(flexibleCheck2);
  fireEvent.click(nextBtn);

  // Pace
  await screen.findByText("旅のペースは？");
});
