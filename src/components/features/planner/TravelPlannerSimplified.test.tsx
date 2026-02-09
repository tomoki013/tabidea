import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TravelPlannerSimplified from "./TravelPlannerSimplified";

// Mock Image component
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock server actions
vi.mock("@/app/actions/travel-planner", () => ({
  generatePlanOutline: vi.fn(),
  generatePlanChunk: vi.fn(),
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
  usePathname: () => "/",
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

// Mock pending state
vi.mock("@/lib/restore/pending-state", () => ({
  restorePendingState: () => ({ success: false, expired: false }),
  clearPendingState: vi.fn(),
}));

// Mock Framer Motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("TravelPlannerSimplified", () => {
  it("renders the simplified form", () => {
    render(<TravelPlannerSimplified />);
    // Use flexible matchers or exact strings including the numbers
    expect(screen.getByText("旅行プランを作成")).toBeDefined();
    expect(screen.getByText("① 目的地はどうしますか？")).toBeDefined();
    expect(screen.getByText("② 日程")).toBeDefined();
    expect(screen.getByText("③ 誰と行く？")).toBeDefined();
  });

  it("can interact with the form", async () => {
    render(<TravelPlannerSimplified />);

    // 1. Enter Destination
    // Initially "Destination Input" button and "Omakase" button are shown.
    // Clicking "Destination Input" (left button) reveals the input.
    // However, the test below assumes we can find the placeholder immediately?
    // SimplifiedInputFlow code:
    // <JournalButton ... onClick={...}>目的地を入力</JournalButton>
    // isOmakase defaults to false? No, input.isDestinationDecided defaults to undefined.
    // If undefined, it shows the two buttons.
    // Wait, let's check SimplifiedInputFlow again.
    // const isOmakase = input.isDestinationDecided === false;
    // If isDestinationDecided is undefined, isOmakase is false? No, undefined !== false.
    // But boolean check: false === false is true. undefined === false is false.
    // So isOmakase is false if it's undefined.

    // Logic in JSX:
    // <JournalButton variant={!isOmakase ? "primary" : "outline"} ...>
    // If isOmakase is false (default), "Destination Input" is primary.
    // And input field:
    // {isOmakase ? (...) : ( <motion.div key="direct-input" ...> ... </motion.div> )}
    // So if isOmakase is false, the direct input IS rendered.
    // So "Destination Input" mode is default.

    const destInput = screen.getByPlaceholderText("京都、パリ、ハワイ...");
    fireEvent.change(destInput, { target: { value: "北海道" } });
    fireEvent.keyDown(destInput, { key: "Enter", code: "Enter" });

    // Check if tag added
    expect(screen.getByText("北海道")).toBeDefined();

    // 2. Select Duration
    // The "2泊3日" text is inside a button.
    const dayBtns = screen.getAllByText("2泊3日");
    const dayBtn = dayBtns.find(el => el.closest('button'));
    if (dayBtn) fireEvent.click(dayBtn);

    // 3. Select Companion
    const friendBtn = screen.getByText("友人");
    fireEvent.click(friendBtn);

    // 4. Generate button should be visible and enabled
    // Note: The button text changes based on state.
    // "とりあえず生成する" (Generate for now)
    const generateBtn = await screen.findByText(/とりあえず生成する/);
    expect(generateBtn).toBeDefined();

    // 5. Expand Phase 2 (Accordion)
    const phase2Btn = screen.getByText("詳細を設定");
    fireEvent.click(phase2Btn);

    // 6. Select Theme
    const gourmetBtn = await screen.findByText("グルメ");
    fireEvent.click(gourmetBtn);

    // 7. Select Budget
    const budgetBtn = screen.getByText("普通");
    fireEvent.click(budgetBtn);

    // 8. Select Pace
    const paceBtn = screen.getByText("バランスよく");
    fireEvent.click(paceBtn);
  });
});
