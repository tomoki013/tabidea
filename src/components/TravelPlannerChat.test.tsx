/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TravelPlannerChat from "./TravelPlannerChat";
import { buildResolvedRegenerationState } from "@/lib/utils/travel-planner-chat";

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
      "components.travelPlannerChat.appliedSummaryTitle": "この内容をプランに反映しました",
      "components.travelPlannerChat.appliedSummaryDescription": "同じ依頼を押し直さなくていいように、直前の会話は折りたたんでいます。",
      "components.travelPlannerChat.appliedRequestLabel": "反映した要望:",
      "components.travelPlannerChat.appliedPlanLabel": "反映方針:",
      "components.travelPlannerChat.showAppliedHistory": "反映した会話を開く",
      "components.travelPlannerChat.hideAppliedHistory": "反映した会話を閉じる",
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

  it("hides regenerate button and folds previous messages after regeneration succeeds", () => {
    const resolvedHistory = [
      { role: "user", text: "ランチを安くしたい" },
      { role: "model", text: "安い候補に差し替えます" },
    ];

    mockUseChat.mockReturnValue({
      ...baseUseChatReturn,
      messages: [
        { id: "m1", role: "user", content: "ランチを安くしたい" },
        { id: "m2", role: "assistant", content: "安い候補に差し替えます [[REGEN_READY]]" },
      ],
    });

    render(
      <TravelPlannerChat
        itinerary={itinerary}
        onRegenerate={vi.fn()}
        resolvedRegeneration={buildResolvedRegenerationState(resolvedHistory)}
      />
    );

    expect(screen.queryByText("会話の内容でプランを再生成")).toBeNull();
    expect(screen.getByText("この内容をプランに反映しました")).toBeDefined();
    expect(screen.getAllByText("ランチを安くしたい")).toHaveLength(1);
    expect(screen.getAllByText("安い候補に差し替えます")).toHaveLength(1);

    fireEvent.click(screen.getByText("反映した会話を開く"));

    expect(screen.getAllByText("ランチを安くしたい")).toHaveLength(2);
    expect(screen.getAllByText("安い候補に差し替えます")).toHaveLength(2);
  });

  it("clears the applied summary when a new chat message is submitted", () => {
    const onResolvedRegenerationClear = vi.fn();
    const handleSubmit = vi.fn();

    mockUseChat.mockReturnValue({
      ...baseUseChatReturn,
      input: "新しく調整したい",
      handleSubmit,
      messages: [
        { id: "m1", role: "user", content: "ランチを安くしたい" },
        { id: "m2", role: "assistant", content: "安い候補に差し替えます" },
      ],
    });

    render(
      <TravelPlannerChat
        itinerary={itinerary}
        onRegenerate={vi.fn()}
        resolvedRegeneration={buildResolvedRegenerationState([
          { role: "user", text: "ランチを安くしたい" },
          { role: "model", text: "安い候補に差し替えます" },
        ])}
        onResolvedRegenerationClear={onResolvedRegenerationClear}
      />
    );

    fireEvent.submit(
      screen.getByPlaceholderText("例: もっと安いランチの選択肢は？").closest("form") as HTMLFormElement
    );

    expect(onResolvedRegenerationClear).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });
});
