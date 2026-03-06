/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import { UserInput } from "@/types";

const translationMessages = vi.hoisted(() => ({
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
  "components.features.planner.simplifiedInputFlow.phase3.freeText.label": "その他のリクエスト",
  "components.features.planner.simplifiedInputFlow.phase3.freeText.placeholder": "自由入力",
  "components.features.planner.simplifiedInputFlow.generate.generating": "プランを生成中...",
  "components.features.planner.simplifiedInputFlow.generate.quick": "AIで旅をデザインする",
  "components.features.planner.simplifiedInputFlow.budget.units.tenThousandYen": "万円",
  "components.features.planner.simplifiedInputFlow.budget.units.yen": "円",
  "components.features.planner.steps.stepCompanions.options.solo.label": "ひとり旅",
  "components.features.planner.steps.stepCompanions.options.couple.label": "カップル",
  "components.features.planner.steps.stepCompanions.options.family.label": "家族",
  "components.features.planner.steps.stepCompanions.options.friends.label": "友達",
  "components.features.planner.steps.stepCompanions.options.male_trip.label": "男子旅",
  "components.features.planner.steps.stepCompanions.options.female_trip.label": "女子旅",
  "components.features.planner.steps.stepCompanions.options.backpacker.label": "バックパッカー",
  "components.features.planner.steps.stepCompanions.options.business.label": "出張",
  "components.features.planner.steps.stepCompanions.options.pet.label": "ペット連れ",
  "components.features.planner.steps.stepThemes.themes.gourmet": "グルメ",
  "components.features.planner.steps.stepThemes.themeValues.gourmet": "グルメ",
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
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const template = translationMessages[fullKey] ?? key;
    if (!values) return template;
    return Object.entries(values).reduce(
      (acc, [name, value]) => acc.replace(`{${name}}`, String(value)),
      template,
    );
  },
}));

const defaultInput: UserInput = {
  destinations: ["東京"],
  isDestinationDecided: true,
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

describe("SimplifiedInputFlow UI polish", () => {
  it("renders a bright companion selection indicator instead of a gray dot", () => {
    render(
      <SimplifiedInputFlow
        input={{ ...defaultInput, companions: "solo" }}
        onChange={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    const selected = screen.getByTestId("companion-option-solo");
    const indicator = screen.getByTestId("companion-indicator-solo");

    expect(selected.className).toContain("bg-orange-600");
    expect(indicator.className).toContain("bg-orange-500");
  });

  it("shows explicit check indicators for selected theme, pace, and budget options", () => {
    render(
      <SimplifiedInputFlow
        input={{
          ...defaultInput,
          theme: ["グルメ"],
          pace: "relaxed",
          budget: "saving",
        }}
        onChange={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "こだわり条件を追加する（任意）" }));

    expect(screen.getByTestId("theme-indicator-gourmet")).toBeDefined();
    expect(screen.getByTestId("pace-indicator-relaxed")).toBeDefined();
    expect(screen.getByTestId("budget-indicator-saving")).toBeDefined();
  });
});
