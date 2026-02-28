import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PostTripReflection } from "./PostTripReflection";

describe("PostTripReflection", () => {
  it("タイトルを表示する", () => {
    render(
      <PostTripReflection planId="plan-1" onSubmit={vi.fn()} />
    );
    expect(screen.getByText("旅行はいかがでしたか？")).toBeDefined();
  });

  it("3つの満足度選択肢を表示する", () => {
    render(
      <PostTripReflection planId="plan-1" onSubmit={vi.fn()} />
    );
    expect(screen.getByText("助かった")).toBeDefined();
    expect(screen.getByText("ふつう")).toBeDefined();
    expect(screen.getByText("苦労した")).toBeDefined();
  });

  it("満足度を選択すると自由記述欄が表示される", () => {
    render(
      <PostTripReflection planId="plan-1" onSubmit={vi.fn()} />
    );

    // 選択前は自由記述なし
    expect(screen.queryByLabelText("ご感想（任意）")).toBeNull();

    // 選択
    fireEvent.click(screen.getByText("助かった"));

    // 自由記述が表示
    expect(screen.getByLabelText("ご感想（任意）")).toBeDefined();
  });

  it("送信ボタンは満足度未選択で無効", () => {
    render(
      <PostTripReflection planId="plan-1" onSubmit={vi.fn()} />
    );

    const submitButton = screen.getByText("送信する");
    expect(submitButton.hasAttribute("disabled")).toBe(true);
  });

  it("満足度選択後に送信が可能", () => {
    const onSubmit = vi.fn();
    render(
      <PostTripReflection planId="plan-1" onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByText("助かった"));
    fireEvent.click(screen.getByText("送信する"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "plan-1",
        satisfaction: "helped",
      })
    );
  });

  it("リプラン利用時に追加質問が表示される", () => {
    render(
      <PostTripReflection
        planId="plan-1"
        usedReplan
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("助かった"));

    expect(
      screen.getByText("プラン変更の提案は役に立ちましたか？")
    ).toBeDefined();
  });

  it("リプラン未使用時は追加質問が表示されない", () => {
    render(
      <PostTripReflection
        planId="plan-1"
        usedReplan={false}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("助かった"));

    expect(
      screen.queryByText("プラン変更の提案は役に立ちましたか？")
    ).toBeNull();
  });

  it("あとでボタンで dismiss コールバックが呼ばれる", () => {
    const onDismiss = vi.fn();
    render(
      <PostTripReflection
        planId="plan-1"
        onSubmit={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByText("あとで"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("自由記述を含めて送信できる", () => {
    const onSubmit = vi.fn();
    render(
      <PostTripReflection planId="plan-1" onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByText("ふつう"));

    const textarea = screen.getByPlaceholderText(
      "旅行中に感じたことを教えてください..."
    );
    fireEvent.change(textarea, { target: { value: "天気が良くて最高でした" } });

    fireEvent.click(screen.getByText("送信する"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        satisfaction: "neutral",
        freeText: "天気が良くて最高でした",
      })
    );
  });
});
