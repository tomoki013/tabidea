import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratingOverlay, { DayGenerationState } from "./GeneratingOverlay";

describe("GeneratingOverlay", () => {
  const createDayStates = (
    count: number,
    status: DayGenerationState["status"] = "pending"
  ): DayGenerationState[] =>
    Array.from({ length: count }, (_, i) => ({
      day: i + 1,
      status,
    }));

  const defaultProps = {
    totalDays: 3,
    dayStates: createDayStates(3),
    isComplete: false,
    isVisible: true,
    onHide: vi.fn(),
  };

  it("renders when visible", () => {
    render(<GeneratingOverlay {...defaultProps} />);

    expect(screen.getByText("生成を準備中...")).toBeInTheDocument();
  });

  it("does not render when not visible", () => {
    render(<GeneratingOverlay {...defaultProps} isVisible={false} />);

    expect(screen.queryByText("生成を準備中...")).not.toBeInTheDocument();
  });

  it("shows generating day status", () => {
    const dayStates: DayGenerationState[] = [
      { day: 1, status: "completed" },
      { day: 2, status: "generating" },
      { day: 3, status: "pending" },
    ];

    render(<GeneratingOverlay {...defaultProps} dayStates={dayStates} />);

    expect(screen.getByText("Day 2/3 の詳細を生成中...")).toBeInTheDocument();
  });

  it("shows completion message when complete", () => {
    render(
      <GeneratingOverlay
        {...defaultProps}
        dayStates={createDayStates(3, "completed")}
        isComplete={true}
      />
    );

    expect(screen.getByText("プラン完成！")).toBeInTheDocument();
  });

  it("shows progress count", () => {
    const dayStates: DayGenerationState[] = [
      { day: 1, status: "completed" },
      { day: 2, status: "completed" },
      { day: 3, status: "pending" },
    ];

    render(<GeneratingOverlay {...defaultProps} dayStates={dayStates} />);

    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("calls onHide when close button is clicked", () => {
    const onHide = vi.fn();

    render(<GeneratingOverlay {...defaultProps} onHide={onHide} />);

    fireEvent.click(screen.getByLabelText("閉じる"));

    expect(onHide).toHaveBeenCalled();
  });

  it("shows retry button for failed days", () => {
    const onRetry = vi.fn();
    const dayStates: DayGenerationState[] = [
      { day: 1, status: "completed" },
      { day: 2, status: "error", error: "Failed to generate" },
      { day: 3, status: "pending" },
    ];

    render(
      <GeneratingOverlay
        {...defaultProps}
        dayStates={dayStates}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("一部の日程で生成に失敗しました")).toBeInTheDocument();
    expect(screen.getByText("Day 2 を再試行")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Day 2 を再試行"));

    expect(onRetry).toHaveBeenCalledWith(2);
  });

  it("shows scroll hint when not complete", () => {
    render(<GeneratingOverlay {...defaultProps} />);

    expect(screen.getByText("スクロールしてプランを確認できます")).toBeInTheDocument();
  });
});
