import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BaseCard from "./BaseCard";
import { MapPin } from "lucide-react";

describe("BaseCard", () => {
  const defaultProps = {
    cardType: "spot" as const,
    icon: <MapPin data-testid="icon" />,
    title: "清水寺",
    subtitle: "京都の有名な寺院",
    time: "10:00",
  };

  it("renders title and subtitle", () => {
    render(<BaseCard {...defaultProps} />);

    expect(screen.getByText("清水寺")).toBeInTheDocument();
    expect(screen.getByText("京都の有名な寺院")).toBeInTheDocument();
  });

  it("renders time display", () => {
    render(<BaseCard {...defaultProps} />);

    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("renders icon", () => {
    render(<BaseCard {...defaultProps} />);

    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("expands on click when expandable", () => {
    render(
      <BaseCard {...defaultProps}>
        <div data-testid="expanded-content">詳細コンテンツ</div>
      </BaseCard>
    );

    // Initially collapsed - content should not be visible
    expect(screen.queryByTestId("expanded-content")).not.toBeInTheDocument();

    // Click on the title text to expand (bubbles up to the motion.div with onClick)
    fireEvent.click(screen.getByText("清水寺"));

    // Content should now be visible
    expect(screen.getByTestId("expanded-content")).toBeInTheDocument();
  });

  it("does not expand when expandable is false", () => {
    const { container } = render(
      <BaseCard {...defaultProps} expandable={false}>
        <div data-testid="expanded-content">詳細コンテンツ</div>
      </BaseCard>
    );

    // Click should not expand
    const cardContainer = container.firstChild as HTMLElement;
    fireEvent.click(cardContainer);

    expect(screen.queryByTestId("expanded-content")).not.toBeInTheDocument();
  });

  it("calls onStateChange when toggled", () => {
    const onStateChange = vi.fn();

    render(
      <BaseCard
        {...defaultProps}
        state="collapsed"
        onStateChange={onStateChange}
      >
        <div>Content</div>
      </BaseCard>
    );

    // Click on the title text (inside the motion.div with onClick handler)
    fireEvent.click(screen.getByText("清水寺"));

    expect(onStateChange).toHaveBeenCalledWith("expanded");
  });

  it("renders badge when provided", () => {
    render(
      <BaseCard
        {...defaultProps}
        badge={<span data-testid="badge">検証済み</span>}
      />
    );

    expect(screen.getByTestId("badge")).toBeInTheDocument();
  });

  it("applies correct color theme", () => {
    const { container } = render(
      <BaseCard {...defaultProps} colorTheme="blue" />
    );

    // Check that blue theme classes are applied
    expect(container.querySelector(".border-blue-200")).toBeInTheDocument();
  });
});
