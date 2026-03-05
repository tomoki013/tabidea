/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TravelPlannerChat from "./TravelPlannerChat";

const { mockUseChat } = vi.hoisted(() => ({
  mockUseChat: vi.fn(),
}));

vi.mock("ai/react", () => ({
  useChat: (...args: any[]) => mockUseChat(...args),
}));

vi.mock("@/components/ui/ModelBadge", () => ({
  default: () => <span data-testid="model-badge" />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/ja/plan/id/1",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const messages: Record<string, string> = {
      "components.travelPlannerChat.title": "プランナーに相談",
      "components.travelPlannerChat.initialAssistantMessage": "いかがでしたか？プランについて気になるところや、詳しく知りたいことがあれば教えてくださいね！",
      "components.travelPlannerChat.emptyState": "日程の調整、レストラン提案、スポット解説などを相談できます。",
      "components.travelPlannerChat.regenerateButton": "会話の内容でプランを再生成",
      "components.travelPlannerChat.thinking": "考え中...",
      "components.travelPlannerChat.errorWithContact": "エラーが発生しました。もう一度お試しください。",
      "components.travelPlannerChat.inputPlaceholder": "例: もっと安いランチの選択肢は？",
      "app.planner.plan.regenerateInstruction": "この会話で合意した変更内容を現在のプランに反映して再生成してください。",
    };

    const t = (key: string) => messages[`${namespace}.${key}`] ?? key;
    (t as typeof t & { raw: (key: string) => unknown }).raw = (key: string) => {
      if (`${namespace}.${key}` === "components.travelPlannerChat.suggestionChips") {
        return [
          "地元の料理をもっと食べたい！ 🍜",
          "カフェ巡りを入れたい ☕️",
        ];
      }
      return [];
    };
    (t as typeof t & { rich: (key: string, values: Record<string, (chunks: ReactNode) => ReactNode>) => ReactNode }).rich = (
      key: string,
      values: Record<string, (chunks: ReactNode) => ReactNode>
    ) => {
      if (`${namespace}.${key}` === "components.travelPlannerChat.errorWithContact") {
        return (
          <>
            エラーが発生しました。もう一度お試しください。問題が解決しない場合は、
            {values.contact("お問い合わせページ")}
            からご連絡ください。
          </>
        );
      }
      return t(key);
    };

    return t;
  },
}));

const baseUseChatReturn = {
  input: "",
  handleInputChange: vi.fn(),
  setInput: vi.fn(),
  handleSubmit: vi.fn(),
  isLoading: false,
  error: undefined,
};

const itinerary = {
  id: "plan-1",
  destination: "東京",
  description: "test",
  days: [],
} as any;

describe("TravelPlannerChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show regenerate button when no consent tag exists", () => {
    mockUseChat.mockReturnValue({
      ...baseUseChatReturn,
      messages: [
        { id: "m1", role: "user", content: "カフェを増やしたい" },
        { id: "m2", role: "assistant", content: "カフェ候補を2つ提案できます。" },
      ],
    });

    render(<TravelPlannerChat itinerary={itinerary} onRegenerate={vi.fn()} />);

    expect(screen.queryByText("会話の内容でプランを再生成")).toBeNull();
  });

  it("shows regenerate button below latest assistant message with consent tag and hides tag from UI", () => {
    mockUseChat.mockReturnValue({
      ...baseUseChatReturn,
      messages: [
        { id: "m1", role: "assistant", content: "先に候補を出します [[REGEN_READY]]" },
        { id: "m2", role: "assistant", content: "この案で更新します [[REGEN_READY]]" },
      ],
    });

    render(<TravelPlannerChat itinerary={itinerary} onRegenerate={vi.fn()} />);

    expect(screen.getByText("この案で更新します")).toBeDefined();
    expect(screen.queryByText(/\[\[REGEN_READY\]\]/)).toBeNull();
    expect(screen.getByText("会話の内容でプランを再生成")).toBeDefined();
  });

  it("passes sanitized history plus explicit regenerate command when clicking regenerate", () => {
    const onRegenerate = vi.fn();

    mockUseChat.mockReturnValue({
      ...baseUseChatReturn,
      messages: [
        { id: "m1", role: "user", content: "ランチを安くしたい" },
        { id: "m2", role: "assistant", content: "安い候補に差し替えます [[REGEN_READY]]" },
      ],
    });

    render(<TravelPlannerChat itinerary={itinerary} onRegenerate={onRegenerate} />);

    fireEvent.click(screen.getByText("会話の内容でプランを再生成"));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(onRegenerate).toHaveBeenCalledWith([
      { role: "user", text: "ランチを安くしたい" },
      { role: "model", text: "安い候補に差し替えます" },
      {
        role: "user",
        text: "この会話で合意した変更内容を現在のプランに反映して再生成してください。",
      },
    ]);
  });
});

