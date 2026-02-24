import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ReplanTriggerButton } from "./ReplanTriggerButton";

describe("ReplanTriggerButton", () => {
  it("rain ボタンを表示する", () => {
    render(
      <ReplanTriggerButton
        slotId="slot-1"
        triggerType="rain"
        onTrigger={vi.fn()}
      />
    );
    expect(screen.getByText("天気が悪い")).toBeDefined();
  });

  it("fatigue ボタンを表示する", () => {
    render(
      <ReplanTriggerButton
        slotId="slot-1"
        triggerType="fatigue"
        onTrigger={vi.fn()}
      />
    );
    expect(screen.getByText("疲れた")).toBeDefined();
  });

  it("delay ボタンを表示する", () => {
    render(
      <ReplanTriggerButton
        slotId="slot-1"
        triggerType="delay"
        onTrigger={vi.fn()}
      />
    );
    expect(screen.getByText("遅れてる")).toBeDefined();
  });

  it("クリックでトリガーが発火する", () => {
    const onTrigger = vi.fn();
    render(
      <ReplanTriggerButton
        slotId="slot-1"
        triggerType="rain"
        onTrigger={onTrigger}
      />
    );

    fireEvent.click(screen.getByText("天気が悪い"));

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "rain",
        slotId: "slot-1",
      })
    );
  });

  it("disabled 時はクリックが無効", () => {
    const onTrigger = vi.fn();
    render(
      <ReplanTriggerButton
        slotId="slot-1"
        triggerType="rain"
        onTrigger={onTrigger}
        disabled
      />
    );

    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("アクセシビリティラベルが設定されている", () => {
    render(
      <ReplanTriggerButton
        slotId="slot-1"
        triggerType="rain"
        onTrigger={vi.fn()}
      />
    );

    expect(screen.getByLabelText("天気が悪いでプランを変更")).toBeDefined();
  });
});
