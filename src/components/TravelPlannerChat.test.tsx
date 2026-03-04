/* eslint-disable @typescript-eslint/no-explicit-any */
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

