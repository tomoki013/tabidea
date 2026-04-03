/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TravelPlannerSimplified from "./TravelPlannerSimplified";

const { createTranslator } = vi.hoisted(() => {
  const translationMessages: Record<string, string> = {
    "components.features.planner.travelPlannerSimplified.defaultDates": "2泊3日",
    "components.features.planner.travelPlannerSimplified.actions.tryAgain": "もう一度試す",
    "components.features.planner.travelPlannerSimplified.contact.prefix": "",
    "components.features.planner.travelPlannerSimplified.contact.link": "お問い合わせ",
    "components.features.planner.travelPlannerSimplified.contact.suffix": "",
    "components.features.planner.travelPlannerSimplified.notices.expired": "期限切れ",
    "components.features.planner.travelPlannerSimplified.notices.restored": "復元しました",
    "components.features.planner.simplifiedInputFlow.header.title": "旅行プランを作成",
    "components.features.planner.simplifiedInputFlow.header.lead": "条件を選んでプランを作ります",
    "components.features.planner.simplifiedInputFlow.step1.destinationModeLabel": "① 目的地はどうしますか？",
    "components.features.planner.simplifiedInputFlow.step1.destinationInput.placeholderFirst": "例：京都、パリ、ハワイ...",
    "components.features.planner.simplifiedInputFlow.step1.destinationInput.placeholderNext": "次の目的地を追加",
    "components.features.planner.simplifiedInputFlow.step1.destinationInput.addButton": "追加",
    "components.features.planner.simplifiedInputFlow.step1.omakase.title": "おまかせ",
    "components.features.planner.simplifiedInputFlow.step1.dates.label": "② 日程",
    "components.features.planner.simplifiedInputFlow.step1.dates.mode.durationOnly": "日数から選ぶ",
    "components.features.planner.simplifiedInputFlow.step1.dates.mode.calendar": "日付を選ぶ",
    "components.features.planner.simplifiedInputFlow.step1.companions.label": "③ 誰と行く？",
    "components.features.planner.simplifiedInputFlow.phase3.toggle": "詳細を設定",
    "components.features.planner.simplifiedInputFlow.generate.quick": "とりあえず生成する",
    "components.features.planner.simplifiedInputFlow.generate.generating": "生成中",
    "components.features.planner.steps.stepCompanions.options.friends": "友人",
    "components.features.planner.steps.stepThemes.themes.gourmet": "グルメ",
    "components.features.planner.steps.stepBudget.options.standard.label": "普通",
    "components.features.planner.steps.stepBudget.options.standard.desc": "標準的な予算感",
    "components.features.planner.steps.stepPace.options.balanced.label": "バランスよく",
    "components.features.planner.steps.stepPace.options.balanced.desc": "無理のないペース",
    "components.features.planner.steps.stepDates.formats.dayTrip": "日帰り",
    "components.features.planner.steps.stepDates.formats.dateUndecidedValue": "日程未定",
  };

  const translatorFactory = (namespace: string) => {
    const translate = ((key: string, values?: Record<string, string | number>) => {
      const fullKey = `${namespace}.${key}`;
      if (fullKey === "components.features.planner.steps.stepDates.formats.nightsDays") {
        return `${values?.nights}泊${values?.days}日`;
      }
      return translationMessages[fullKey] ?? key.split(".").pop() ?? key;
    }) as ((key: string, values?: Record<string, string | number>) => string) & {
      raw: (key: string) => unknown;
    };

    translate.raw = () => [];
    return translate;
  };

  return { createTranslator: translatorFactory };
});

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => createTranslator(namespace),
  createTranslator: ({ locale: _locale, messages: _messages, namespace }: { locale?: string; messages?: unknown; namespace?: string }) =>
    createTranslator(namespace || ""),
  useLocale: () => "ja",
}));

// Mock Image component
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock server actions
vi.mock("@/app/actions/travel-planner", () => ({
  savePlan: vi.fn(),
}));

const mockCompose = {
  steps: [] as Array<{ id: string; message: string; status: string }>,
  currentStep: null as string | null,
  isGenerating: false,
  isCompleted: false,
  errorMessage: "",
  failureUi: null as "banner" | "modal" | null,
  failureKind: null as string | null,
  canRetry: false,
  resumeRunId: null as string | null,
  originSurface: null as "top_page" | "plan_page" | "modal" | null,
  limitExceeded: null as unknown,
  warnings: [] as string[],
  partialDays: new Map(),
  totalDays: 0,
  previewDestination: "",
  previewDescription: "",
  generate: vi.fn(),
  reset: vi.fn(),
  clearFailure: vi.fn(),
  clearLimitExceeded: vi.fn(),
};

// Mock usePlanGeneration
vi.mock("@/lib/hooks/usePlanGeneration", () => ({
  usePlanGeneration: () => mockCompose,
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompose.steps = [];
    mockCompose.currentStep = null;
    mockCompose.isGenerating = false;
    mockCompose.isCompleted = false;
    mockCompose.errorMessage = "";
    mockCompose.failureUi = null;
    mockCompose.failureKind = null;
    mockCompose.canRetry = false;
    mockCompose.resumeRunId = null;
    mockCompose.originSurface = null;
    mockCompose.limitExceeded = null;
    mockCompose.warnings = [];
    mockCompose.partialDays = new Map();
    mockCompose.totalDays = 0;
    mockCompose.previewDestination = "";
    mockCompose.previewDescription = "";
  });

  it("renders the simplified form", () => {
    render(<TravelPlannerSimplified />);
    // Use flexible matchers or exact strings including the numbers
    expect(screen.getByText("旅行プランを作成")).toBeDefined();
    expect(screen.getByText(/① 目的地はどうしますか？/)).toBeDefined();
    expect(screen.getByText(/② 日程/)).toBeDefined();
    expect(screen.getByText(/③ 誰と行く？/)).toBeDefined();
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

    const destInput = screen.getByPlaceholderText("例：京都、パリ、ハワイ...");
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
    const friendBtn = screen.getByTestId("companion-option-friends");
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

  it("shows only the modal failure surface on top-page failure and restores the form on back to input", async () => {
    mockCompose.errorMessage = "Generation failed";
    mockCompose.failureUi = "banner";
    mockCompose.canRetry = true;
    mockCompose.originSurface = "top_page";

    render(<TravelPlannerSimplified />);

    expect(screen.queryByText("旅行プランを作成")).toBeNull();
    expect(screen.getByText("Generation failed")).toBeDefined();
    expect(screen.getAllByText("modal")).toHaveLength(2);
    expect(screen.queryByText("banner")).toBeNull();

    fireEvent.click(screen.getByText("backToInput"));

    expect(mockCompose.clearFailure).toHaveBeenCalled();
    expect(screen.getByText("旅行プランを作成")).toBeDefined();
  });
});
