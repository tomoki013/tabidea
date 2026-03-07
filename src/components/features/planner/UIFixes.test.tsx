/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import ResultView from "./ResultView";
import PDFExportModal from "./PDFExportModal";
import SpotCard from "@/components/features/plan/cards/SpotCard";
import { UserInput, Itinerary } from "@/types";
import React from "react";

const translationMessages = vi.hoisted<Record<string, string | string[]>>(() => ({
  "components.features.planner.simplifiedInputFlow.header.lead": "必要な情報を入力して、AIがあなただけのプランを作成します",
  "components.features.planner.simplifiedInputFlow.step1.destinationModeLabel": "① 目的地はどうしますか？",
  "components.features.planner.simplifiedInputFlow.step1.destinationInput.placeholderFirst": "例：京都、パリ、ハワイ...",
  "components.features.planner.simplifiedInputFlow.step1.destinationInput.placeholderNext": "次の行き先を追加...",
  "components.features.planner.simplifiedInputFlow.step1.omakase.title": "おまかせで決める",
  "components.features.planner.simplifiedInputFlow.step1.dates.label": "② 日程",
  "components.features.planner.simplifiedInputFlow.step1.dates.mode.durationOnly": "日数のみ",
  "components.features.planner.simplifiedInputFlow.step1.dates.mode.calendar": "カレンダー",
  "components.features.planner.simplifiedInputFlow.step1.companions.label": "③ 誰と行く？",
  "components.features.planner.simplifiedInputFlow.phase2.theme.label": "テーマ（複数選択可）",
  "components.features.planner.simplifiedInputFlow.phase2.pace.label": "旅のペース",
  "components.features.planner.simplifiedInputFlow.phase2.budget.label": "予算感",
  "components.features.planner.simplifiedInputFlow.phase2.budget.sliderTitle": "総額を細かく指定",
  "components.features.planner.simplifiedInputFlow.phase2.budget.sliderLead": "スライダーで旅全体の予算感を決めます",
  "components.features.planner.simplifiedInputFlow.phase2.budget.rangeLabel": "おすすめ幅",
  "components.features.planner.simplifiedInputFlow.phase2.budget.moods.saving": "節約寄り",
  "components.features.planner.simplifiedInputFlow.phase2.budget.moods.standard": "ちょうどいい",
  "components.features.planner.simplifiedInputFlow.phase2.budget.moods.high": "少し余裕あり",
  "components.features.planner.simplifiedInputFlow.phase2.budget.moods.luxury": "かなり贅沢",
  "components.features.planner.simplifiedInputFlow.phase3.freeText.label": "その他のリクエスト",
  "components.features.planner.simplifiedInputFlow.phase3.freeText.placeholder": "自由入力",
  "components.features.planner.simplifiedInputFlow.phase3.toggle": "こだわり条件を追加する（任意）",
  "components.features.planner.simplifiedInputFlow.generate.generating": "プランを生成中...",
  "components.features.planner.simplifiedInputFlow.generate.quick": "AIで旅をデザインする",
  "components.features.planner.simplifiedInputFlow.budget.units.tenThousandYen": "万円",
  "components.features.planner.simplifiedInputFlow.budget.units.yen": "円",
  "components.features.planner.steps.stepCompanions.options.solo.label": "ひとり旅",
  "components.features.planner.steps.stepCompanions.options.solo.desc": "自由な旅",
  "components.features.planner.steps.stepCompanions.options.couple.label": "カップル",
  "components.features.planner.steps.stepCompanions.options.couple.desc": "落ち着いた旅",
  "components.features.planner.steps.stepCompanions.options.anniversary.label": "記念日",
  "components.features.planner.steps.stepCompanions.options.anniversary.desc": "特別感",
  "components.features.planner.steps.stepCompanions.options.family_kids.label": "子連れ家族",
  "components.features.planner.steps.stepCompanions.options.family_kids.desc": "安心",
  "components.features.planner.steps.stepCompanions.options.three_generation.label": "三世代",
  "components.features.planner.steps.stepCompanions.options.three_generation.desc": "ゆったり",
  "components.features.planner.steps.stepCompanions.options.friends.label": "友達",
  "components.features.planner.steps.stepCompanions.options.friends.desc": "賑やか",
  "components.features.planner.steps.stepCompanions.options.girls_trip.label": "女子旅",
  "components.features.planner.steps.stepCompanions.options.girls_trip.desc": "華やか",
  "components.features.planner.steps.stepCompanions.options.boys_trip.label": "男子旅",
  "components.features.planner.steps.stepCompanions.options.boys_trip.desc": "アクティブ",
  "components.features.planner.steps.stepCompanions.options.oshikatsu.label": "推し活",
  "components.features.planner.steps.stepCompanions.options.oshikatsu.desc": "熱量高め",
  "components.features.planner.steps.stepCompanions.options.business.label": "出張",
  "components.features.planner.steps.stepCompanions.options.business.desc": "効率重視",
  "components.features.planner.steps.stepCompanions.options.pet.label": "ペット連れ",
  "components.features.planner.steps.stepCompanions.options.pet.desc": "やさしい旅",
  "components.features.planner.steps.stepCompanions.options.workation.label": "ワーケーション",
  "components.features.planner.steps.stepCompanions.options.workation.desc": "両立",
  "components.features.planner.steps.stepThemes.themes.gourmet": "グルメ",
  "components.features.planner.steps.stepThemes.descriptions.gourmet": "ご当地の味",
  "components.features.planner.steps.stepThemes.themeValues.gourmet": "グルメ",
  "components.features.planner.steps.stepThemes.themes.cafeHopping": "カフェ巡り",
  "components.features.planner.steps.stepThemes.descriptions.cafeHopping": "ゆるく街歩き",
  "components.features.planner.steps.stepThemes.themeValues.cafeHopping": "カフェ巡り",
  "components.features.planner.steps.stepThemes.themes.historyCulture": "歴史・文化",
  "components.features.planner.steps.stepThemes.descriptions.historyCulture": "深く知る",
  "components.features.planner.steps.stepThemes.themeValues.historyCulture": "歴史・文化",
  "components.features.planner.steps.stepThemes.themes.natureScenery": "自然・絶景",
  "components.features.planner.steps.stepThemes.descriptions.natureScenery": "開放感",
  "components.features.planner.steps.stepThemes.themeValues.natureScenery": "自然・絶景",
  "components.features.planner.steps.stepThemes.themes.spectacularViews": "絶景",
  "components.features.planner.steps.stepThemes.descriptions.spectacularViews": "景色主役",
  "components.features.planner.steps.stepThemes.themeValues.spectacularViews": "絶景",
  "components.features.planner.steps.stepThemes.themes.cityWalk": "街歩き",
  "components.features.planner.steps.stepThemes.descriptions.cityWalk": "街の空気",
  "components.features.planner.steps.stepThemes.themeValues.cityWalk": "街歩き",
  "components.features.planner.steps.stepThemes.themes.resort": "リゾート",
  "components.features.planner.steps.stepThemes.descriptions.resort": "非日常",
  "components.features.planner.steps.stepThemes.themeValues.resort": "リゾート",
  "components.features.planner.steps.stepThemes.themes.relax": "リラックス",
  "components.features.planner.steps.stepThemes.descriptions.relax": "余白あり",
  "components.features.planner.steps.stepThemes.themeValues.relax": "リラックス",
  "components.features.planner.steps.stepThemes.themes.hiddenSpots": "穴場スポット",
  "components.features.planner.steps.stepThemes.descriptions.hiddenSpots": "発見重視",
  "components.features.planner.steps.stepThemes.themeValues.hiddenSpots": "穴場スポット",
  "components.features.planner.steps.stepThemes.themes.shopping": "ショッピング",
  "components.features.planner.steps.stepThemes.descriptions.shopping": "高揚感",
  "components.features.planner.steps.stepThemes.themeValues.shopping": "ショッピング",
  "components.features.planner.steps.stepThemes.themes.art": "アート",
  "components.features.planner.steps.stepThemes.descriptions.art": "感性",
  "components.features.planner.steps.stepThemes.themeValues.art": "アート",
  "components.features.planner.steps.stepThemes.themes.architecture": "建築",
  "components.features.planner.steps.stepThemes.descriptions.architecture": "造形美",
  "components.features.planner.steps.stepThemes.themeValues.architecture": "建築",
  "components.features.planner.steps.stepThemes.themes.nightlife": "ナイトライフ",
  "components.features.planner.steps.stepThemes.descriptions.nightlife": "夜も満喫",
  "components.features.planner.steps.stepThemes.themeValues.nightlife": "ナイトライフ",
  "components.features.planner.steps.stepThemes.themes.experienceActivity": "体験・アクティビティ",
  "components.features.planner.steps.stepThemes.descriptions.experienceActivity": "体験中心",
  "components.features.planner.steps.stepThemes.themeValues.experienceActivity": "体験・アクティビティ",
  "components.features.planner.steps.stepThemes.themes.localExperience": "ローカル体験",
  "components.features.planner.steps.stepThemes.descriptions.localExperience": "現地目線",
  "components.features.planner.steps.stepThemes.themeValues.localExperience": "ローカル体験",
  "components.features.planner.steps.stepThemes.themes.onsenSauna": "温泉・サウナ",
  "components.features.planner.steps.stepThemes.descriptions.onsenSauna": "回復",
  "components.features.planner.steps.stepThemes.themeValues.onsenSauna": "温泉・サウナ",
  "components.features.planner.steps.stepThemes.themes.wellness": "ウェルネス",
  "components.features.planner.steps.stepThemes.descriptions.wellness": "整える",
  "components.features.planner.steps.stepThemes.themeValues.wellness": "ウェルネス",
  "components.features.planner.steps.stepThemes.themes.photogenic": "写真映え",
  "components.features.planner.steps.stepThemes.descriptions.photogenic": "残したくなる",
  "components.features.planner.steps.stepThemes.themeValues.photogenic": "写真映え",
  "components.features.planner.steps.stepThemes.themes.powerSpots": "パワースポット",
  "components.features.planner.steps.stepThemes.descriptions.powerSpots": "気持ちを整える",
  "components.features.planner.steps.stepThemes.themeValues.powerSpots": "パワースポット",
  "components.features.planner.steps.stepThemes.themes.seasonalEvents": "季節イベント",
  "components.features.planner.steps.stepThemes.descriptions.seasonalEvents": "今だけ",
  "components.features.planner.steps.stepThemes.themeValues.seasonalEvents": "季節イベント",
  "components.features.planner.steps.stepThemes.themes.adventure": "冒険",
  "components.features.planner.steps.stepThemes.descriptions.adventure": "体験価値",
  "components.features.planner.steps.stepThemes.themeValues.adventure": "冒険",
  "components.features.planner.steps.stepThemes.themes.oshikatsu": "推し活",
  "components.features.planner.steps.stepThemes.descriptions.oshikatsu": "熱量高く巡る",
  "components.features.planner.steps.stepThemes.themeValues.oshikatsu": "推し活",
  "components.features.planner.steps.stepBudget.options.saving.label": "節約",
  "components.features.planner.steps.stepBudget.options.saving.desc": "なるべく安く",
  "components.features.planner.steps.stepBudget.options.standard.label": "標準",
  "components.features.planner.steps.stepBudget.options.standard.desc": "ちょうどよく",
  "components.features.planner.steps.stepBudget.options.high.label": "少し贅沢",
  "components.features.planner.steps.stepBudget.options.high.desc": "快適重視",
  "components.features.planner.steps.stepBudget.options.luxury.label": "ラグジュアリー",
  "components.features.planner.steps.stepBudget.options.luxury.desc": "贅沢に",
  "components.features.planner.steps.stepPace.options.relaxed.label": "ゆったり",
  "components.features.planner.steps.stepPace.options.relaxed.desc": "余裕を持って",
  "components.features.planner.steps.stepPace.options.balanced.label": "バランス",
  "components.features.planner.steps.stepPace.options.balanced.desc": "定番",
  "components.features.planner.steps.stepPace.options.active.label": "アクティブ",
  "components.features.planner.steps.stepPace.options.active.desc": "しっかり動く",
  "components.features.planner.steps.stepPace.options.packed.label": "ぎっしり",
  "components.features.planner.steps.stepPace.options.packed.desc": "めいっぱい",
  "components.features.planner.steps.stepDates.formats.dateUndecidedValue": "未定",
  "components.features.planner.steps.stepDates.formats.dayTrip": "日帰り",
  "components.features.planner.steps.stepDates.formats.nightsDays": "{nights}泊{days}日",
  "components.features.planner.resultView.tabs.plan": "旅程表",
  "components.features.planner.resultView.tabs.info": "渡航情報",
  "components.features.planner.resultView.tabs.packing": "持ち物",
  "components.features.planner.resultView.chat.title": "AIと相談しながら調整する",
  "components.features.planner.resultView.actions.addActivity": "予定を追加",
  "components.features.planner.resultView.addSchedule": "予定を追加",
  "components.travelPlannerChat.suggestionChips": [],
}));

const navigationMock = vi.hoisted(() => {
  let currentParams = new URLSearchParams();

  const setSearchParams = (query: string) => {
    currentParams = new URLSearchParams(query);
  };

  const replace = vi.fn((url: string) => {
    const query = url.includes("?") ? (url.split("?")[1] ?? "") : "";
    setSearchParams(query);
  });

  return {
    useSearchParams: () => currentParams,
    setSearchParams,
    replace,
  };
});

// Mocks
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationMock.useSearchParams(),
  usePathname: () => "/plan/id/test-plan",
  useRouter: () => ({
    replace: navigationMock.replace,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock ResizeObserver for ResultView
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.scrollTo
global.scrollTo = vi.fn();

// Mock useAuth and useFlags
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/context/FlagsContext", () => ({
  useFlags: () => ({ isFlagged: () => false, toggleFlag: vi.fn() }),
}));
vi.mock("@/lib/hooks/useSpotCoordinates", () => ({
  useSpotCoordinates: (days: any) => ({ enrichedDays: days }),
}));

// Mock Google Maps
vi.mock("@vis.gl/react-google-maps", () => ({
  Map: () => <div>Map</div>,
  AdvancedMarker: () => <div>Marker</div>,
  useMap: () => ({}),
}));

// Mock PlanModalContext
vi.mock("@/context/PlanModalContext", () => ({
  usePlanModal: () => ({ openModal: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const translator = (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const template = translationMessages[fullKey] ?? key;
      if (Array.isArray(template)) return key;
      if (!values) return template;
      return Object.entries(values).reduce(
        (acc, [name, value]) => acc.replace(`{${name}}`, String(value)),
        template,
      );
    };
    translator.raw = (key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return translationMessages[fullKey] ?? key;
    };
    translator.rich = (key: string, values?: Record<string, string | number>) =>
      translator(key, values);
    return translator;
  },
  useLocale: () => "ja",
  useMessages: () => ({}),
  createTranslator: ({ messages: scopedMessages }: { messages?: Record<string, string> }) =>
    Object.assign(
      (key: string, values?: Record<string, string | number>) => {
        const template = scopedMessages?.[key] ?? translationMessages[key] ?? key;
        if (Array.isArray(template)) return key;
        if (!values) return template;
        return Object.entries(values).reduce(
          (acc, [name, value]) => acc.replace(`{${name}}`, String(value)),
          template,
        );
      },
      {
        rich: (key: string, values?: Record<string, string | number>) => {
          const template = scopedMessages?.[key] ?? translationMessages[key] ?? key;
          if (Array.isArray(template)) return key;
          if (!values) return template;
          return Object.entries(values).reduce(
            (acc, [name, value]) => acc.replace(`{${name}}`, String(value)),
            template,
          );
        },
      },
    ),
}));

const mockOnChange = vi.fn();
const mockOnGenerate = vi.fn();

const defaultInput: UserInput = {
  destinations: [],
  isDestinationDecided: undefined,
  region: "",
  dates: "1泊2日",
  companions: "solo",
  theme: [],
  budget: "",
  pace: "",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: undefined,
};

const mockItinerary: Itinerary = {
  id: "1",
  destination: "Tokyo",
  description: "Tokyo trip",
  days: [
    {
      day: 1,
      title: "Arrival",
      activities: [
        { time: "10:00", activity: "Airport", description: "Land" },
      ],
    },
  ],
};

describe("UI Fixes Regression Tests", () => {
  beforeEach(() => {
    navigationMock.setSearchParams("");
    navigationMock.replace.mockClear();
    mockOnChange.mockClear();
    mockOnGenerate.mockClear();
  });

  it("SimplifiedInputFlow: selected omakase button stays high-contrast", () => {
    render(
      <SimplifiedInputFlow
        input={{ ...defaultInput, isDestinationDecided: false }}
        onChange={mockOnChange}
        onGenerate={mockOnGenerate}
      />
    );

    const omakaseBtn = screen.getByRole("button", { name: "おまかせで決める" });
    expect(omakaseBtn.className).toContain("bg-orange-600");
    expect(omakaseBtn.className).toContain("text-white");
  });

  it("PDFExportModal: Has z-[9999]", () => {
    render(
      <PDFExportModal
        isOpen={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        destination="Tokyo"
        isGenerating={false}
      />
    );
    const modal = screen.getByRole("dialog");
    expect(modal.className).toContain("z-[9999]");
  });

  it("ResultView: Add button hidden when enableEditing=false", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
          enableEditing={false}
        />
      );
    });

    const addBtn = screen.queryByText("予定を追加");
    expect(addBtn).toBeNull();
  });

  it("ResultView: Add button visible when enableEditing=true", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
          enableEditing={true}
        />
      );
    });

    const addBtn = screen.getByText("予定を追加");
    expect(addBtn).toBeDefined();
  });

  it("SpotCard: Editable field renders in edit mode", async () => {
    const { container } = render(
      <SpotCard
        activity={{
          time: "10:00",
          activity: "Airport",
          description: "Land",
        }}
        destination="Tokyo"
        isEditable={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Airport" }));

    const editableInput = container.querySelector('input, textarea');
    expect(editableInput).toBeDefined();
  });

  it("ResultView: Chat hidden when showChat=false", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
          showChat={false}
        />
      );
    });

    const chatText = screen.queryByText("AIと相談しながら調整する");
    expect(chatText).toBeNull();
  });

  it("ResultView: URL tab param activates matching tab", async () => {
    navigationMock.setSearchParams("tab=packing");

    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
        />
      );
    });

    const packingButton = screen.getByRole("button", { name: "持ち物" });
    expect(packingButton.className).toContain("text-stone-800");
  });

  it("ResultView: Tab click updates tab query param", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
        />
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "渡航情報" }));

    expect(navigationMock.replace).toHaveBeenCalled();
    const latestUrl = navigationMock.replace.mock.lastCall?.[0] as string;
    expect(latestUrl).toContain("tab=info");
  });

  it("ResultView: Invalid URL tab param falls back to plan", async () => {
    navigationMock.setSearchParams("tab=unknown");

    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
        />
      );
    });

    const planButton = screen.getByRole("button", { name: "旅程表" });
    expect(planButton.className).toContain("text-stone-800");
  });

  it("SimplifiedInputFlow: companion selection uses bright indicator instead of gray dot", () => {
    render(
      <SimplifiedInputFlow
        input={{ ...defaultInput, companions: "solo" }}
        onChange={mockOnChange}
        onGenerate={mockOnGenerate}
      />
    );

    const selected = screen.getByTestId("companion-option-solo");
    const indicator = screen.getByTestId("companion-indicator-solo");

    expect(selected.className).toContain("bg-orange-600");
    expect(indicator.className).toContain("bg-orange-500");
  });

  it("SimplifiedInputFlow: theme, pace, and budget selections render explicit check indicators", () => {
    render(
      <SimplifiedInputFlow
        input={{
          ...defaultInput,
          theme: ["グルメ"],
          pace: "relaxed",
          budget: "saving",
        }}
        onChange={mockOnChange}
        onGenerate={mockOnGenerate}
      />
    );

    fireEvent.click(screen.getByText("こだわり条件を追加する（任意）"));

    expect(screen.getByTestId("theme-indicator-gourmet")).toBeDefined();
    expect(screen.getByTestId("pace-indicator-relaxed")).toBeDefined();
    expect(screen.getByTestId("budget-indicator-saving")).toBeDefined();

    expect(screen.getByTestId("theme-option-gourmet").className).toContain("bg-orange-600");
    expect(screen.getByTestId("pace-option-relaxed").className).toContain("bg-orange-600");
    expect(screen.getByTestId("budget-option-saving").className).toContain("bg-orange-600");
  });

  it("SimplifiedInputFlow: budget slider stores a detailed range value", () => {
    render(
      <SimplifiedInputFlow
        input={{ ...defaultInput }}
        onChange={mockOnChange}
        onGenerate={mockOnGenerate}
      />
    );

    fireEvent.click(screen.getByText("こだわり条件を追加する（任意）"));
    fireEvent.change(screen.getByRole("slider", { name: "総額を細かく指定" }), {
      target: { value: "120000" },
    });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ budget: "range:100000:140000" }),
    );
  });
});
