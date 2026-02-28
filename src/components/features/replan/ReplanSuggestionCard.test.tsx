import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { RecoveryOption } from "@/types/replan";

import { ReplanSuggestionCard } from "./ReplanSuggestionCard";

// ============================================================================
// Helpers
// ============================================================================

function makeOption(overrides: Partial<RecoveryOption> = {}): RecoveryOption {
  return {
    id: "opt-1",
    replacementSlots: [],
    explanation: "雨の日にぴったりの美術館でゆっくり過ごせます",
    estimatedDuration: "1時間30分",
    category: "indoor",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ReplanSuggestionCard", () => {
  it("提案の説明文を表示する", () => {
    render(
      <ReplanSuggestionCard
        option={makeOption()}
        onAccept={vi.fn()}
      />
    );
    expect(
      screen.getByText("雨の日にぴったりの美術館でゆっくり過ごせます")
    ).toBeDefined();
  });

  it("推定所要時間を表示する", () => {
    render(
      <ReplanSuggestionCard
        option={makeOption()}
        onAccept={vi.fn()}
      />
    );
    expect(screen.getByText("約1時間30分")).toBeDefined();
  });

  it("採用ボタンをクリックでコールバックが呼ばれる", () => {
    const onAccept = vi.fn();
    const option = makeOption();
    render(
      <ReplanSuggestionCard
        option={option}
        onAccept={onAccept}
      />
    );

    fireEvent.click(screen.getByText("採用する"));
    expect(onAccept).toHaveBeenCalledWith(option);
  });

  it("代替案がある場合は「他の案」ボタンが表示される", () => {
    render(
      <ReplanSuggestionCard
        option={makeOption()}
        onAccept={vi.fn()}
        hasAlternatives
        onShowAlternatives={vi.fn()}
      />
    );
    expect(screen.getByText("他の案")).toBeDefined();
  });

  it("代替案がない場合は「他の案」ボタンが表示されない", () => {
    render(
      <ReplanSuggestionCard
        option={makeOption()}
        onAccept={vi.fn()}
        hasAlternatives={false}
      />
    );
    expect(screen.queryByText("他の案")).toBeNull();
  });

  it("「他の案」クリックでコールバックが呼ばれる", () => {
    const onShowAlternatives = vi.fn();
    render(
      <ReplanSuggestionCard
        option={makeOption()}
        onAccept={vi.fn()}
        hasAlternatives
        onShowAlternatives={onShowAlternatives}
      />
    );

    fireEvent.click(screen.getByText("他の案"));
    expect(onShowAlternatives).toHaveBeenCalled();
  });
});
