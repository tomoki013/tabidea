import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TravelPlanner from "@/components/features/planner";

// Mock Image component
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock server actions
vi.mock("@/app/actions/travel-planner", () => ({
  generatePlan: vi.fn(),
  regeneratePlan: vi.fn(),
  savePlan: vi.fn(),
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
}));

// Mock UserPlansContext
vi.mock("@/context/UserPlansContext", () => ({
  useUserPlans: () => ({
    refreshPlans: vi.fn(),
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
  // Placeholder in StepDestination is dynamic/different.
  const input = await screen.findByPlaceholderText("パリ、京都...");
  fireEvent.change(input, { target: { value: "Tokyo" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  // Find the button specific to StepDestination
  const destNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(destNextBtn);

  // Step 2: Places (New Step)
  await screen.findByText((content) => content.includes("絶対に行きたい"));
  const noPlacesBtn = screen.getByText("ない");
  fireEvent.click(noPlacesBtn);

  // Proceed to next step
  const placesNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(placesNextBtn);

  // Step 3: Companions (Click 'Business')
  const businessBtn = await screen.findByText("ビジネス");
  fireEvent.click(businessBtn);
  const companionNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(companionNextBtn);

  // Step 4: Themes (Click 'Gourmet' -> 'グルメ')
  const gourmetBtn = await screen.findByText("グルメ");
  fireEvent.click(gourmetBtn);
  const themeNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(themeNextBtn);

  // Step 5: Budget
  await screen.findByText("予算はどれくらい？");
  const budgetBtn = screen.getByText("普通");
  fireEvent.click(budgetBtn);
  const budgetNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(budgetNextBtn);

  // Step 6: Dates
  await screen.findByText("いつ、どれくらい？");
  // Toggle "Flexible" to ensure dates input is set
  const flexibleCheck = screen.getByLabelText("未定", { selector: "#date-undecided" });
  fireEvent.click(flexibleCheck);
  const datesNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(datesNextBtn);

  // Step 7: Pace
  await screen.findByText("旅のペースは？");
  const paceBtn = screen.getByText("バランスよく");
  fireEvent.click(paceBtn);
  const paceNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(paceNextBtn);

  // Step 7: FreeText
  await screen.findByText((content) => content.includes("最後に") && content.includes("特別なご要望は"));

  // Submit button
  const submitBtn = screen.getByRole("button", { name: /プランを作成する/ });
  expect(submitBtn).toBeDefined();
}, 15000);

it("navigates through 'Not Decided' flow", async () => {
  render(<TravelPlanner />);

  // Step 0: Initial Choice -> Not Decided
  const notDecidedBtn = screen.getByText("決まっていない");
  fireEvent.click(notDecidedBtn);

  // Step 1: Region -> Domestic
  const domesticBtn = await screen.findByText("国内");
  fireEvent.click(domesticBtn);

  const regionNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(regionNextBtn);

  // Step 2: Places
  await screen.findByText((content) => content.includes("絶対に行きたい"));
  const noPlacesBtn = screen.getByText("ない");
  fireEvent.click(noPlacesBtn);

  const placesNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(placesNextBtn);

  // Step 3: Companions
  const companionStep = await screen.findByText("誰との旅ですか？");
  expect(companionStep).toBeDefined();

  const soloBtn = screen.getByText("一人旅");
  fireEvent.click(soloBtn);

  const companionNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(companionNextBtn);

  // Step 4: Themes
  const gourmetBtn = await screen.findByText("グルメ");
  fireEvent.click(gourmetBtn);
  const themeNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(themeNextBtn);

  // Step 5: Budget
  await screen.findByText("予算はどれくらい？");
  const budgetBtn = screen.getByText("普通");
  fireEvent.click(budgetBtn);
  const budgetNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(budgetNextBtn);

  // Dates
  await screen.findByText("いつ、どれくらい？");
  const flexibleCheck2 = screen.getByLabelText("未定", { selector: "#date-undecided" });
  fireEvent.click(flexibleCheck2);
  const datesNextBtn = await screen.findByRole("button", { name: /次へ進む/ });
  fireEvent.click(datesNextBtn);

  // Pace
  await screen.findByText("旅のペースは？");
});
