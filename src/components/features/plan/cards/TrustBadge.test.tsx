import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TrustBadge from "./TrustBadge";

describe("TrustBadge", () => {
  it("renders verified badge correctly", () => {
    const { container } = render(<TrustBadge level="verified" showLabel />);

    expect(screen.getByText("検証済み")).toBeInTheDocument();
    expect(container.querySelector(".bg-green-50")).toBeInTheDocument();
  });

  it("renders ai_generated badge correctly", () => {
    const { container } = render(<TrustBadge level="ai_generated" showLabel />);

    expect(screen.getByText("AI生成")).toBeInTheDocument();
    expect(container.querySelector(".bg-blue-50")).toBeInTheDocument();
  });

  it("renders needs_check badge correctly", () => {
    const { container } = render(<TrustBadge level="needs_check" showLabel />);

    expect(screen.getByText("要確認")).toBeInTheDocument();
    expect(container.querySelector(".bg-amber-50")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    render(<TrustBadge level="verified" showLabel={false} />);

    expect(screen.queryByText("検証済み")).not.toBeInTheDocument();
  });

  it("applies small size classes by default", () => {
    const { container } = render(<TrustBadge level="verified" />);

    expect(container.querySelector(".px-1\\.5")).toBeInTheDocument();
  });

  it("applies medium size classes when specified", () => {
    const { container } = render(<TrustBadge level="verified" size="md" />);

    expect(container.querySelector(".px-2")).toBeInTheDocument();
  });

  it("has correct tooltip text", () => {
    const { container } = render(<TrustBadge level="verified" />);

    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveAttribute("title", "Google Places等で存在を確認済み");
  });

  it("applies custom className", () => {
    const { container } = render(
      <TrustBadge level="verified" className="custom-class" />
    );

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });
});
