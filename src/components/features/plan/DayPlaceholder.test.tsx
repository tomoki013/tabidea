import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DayPlaceholder from "./DayPlaceholder";

describe("DayPlaceholder", () => {
  it("renders day number", () => {
    render(<DayPlaceholder day={2} />);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<DayPlaceholder day={1} title="京都観光" />);

    expect(screen.getByText("京都観光")).toBeInTheDocument();
  });

  it("renders default title when no title provided", () => {
    render(<DayPlaceholder day={3} />);

    expect(screen.getByText("Day 3")).toBeInTheDocument();
  });

  it("renders highlight areas", () => {
    render(
      <DayPlaceholder
        day={1}
        title="京都観光"
        highlightAreas={["金閣寺", "清水寺", "嵐山"]}
      />
    );

    expect(screen.getByText("金閣寺")).toBeInTheDocument();
    expect(screen.getByText("清水寺")).toBeInTheDocument();
    expect(screen.getByText("嵐山")).toBeInTheDocument();
  });

  it("shows generating status when isGenerating is true", () => {
    render(<DayPlaceholder day={1} isGenerating={true} />);

    expect(screen.getByText("詳細を生成中...")).toBeInTheDocument();
  });

  it("shows pending status when not generating", () => {
    render(<DayPlaceholder day={1} isGenerating={false} />);

    expect(screen.getByText("生成待機中")).toBeInTheDocument();
  });

  it("renders error state correctly", () => {
    const onRetry = vi.fn();

    render(
      <DayPlaceholder
        day={2}
        error="ネットワークエラーが発生しました"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("Day 2 の生成に失敗しました")).toBeInTheDocument();
    expect(screen.getByText("ネットワークエラーが発生しました")).toBeInTheDocument();
    expect(screen.getByText("再試行")).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();

    render(
      <DayPlaceholder
        day={2}
        error="エラー"
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByText("再試行"));

    expect(onRetry).toHaveBeenCalled();
  });

  it("renders skeleton cards when generating", () => {
    const { container } = render(<DayPlaceholder day={1} isGenerating={true} />);

    // Should have skeleton cards (3 when generating)
    const skeletonCards = container.querySelectorAll(".animate-pulse");
    expect(skeletonCards.length).toBeGreaterThan(0);
  });
});
