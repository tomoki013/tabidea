import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PlanGenerationOverlayProvider,
  usePlanGenerationOverlay,
} from "./PlanGenerationOverlayContext";

let mockPathname = "/ja";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/components/features/planner/FullScreenGenerationOverlay", () => ({
  __esModule: true,
  default: ({
    phase,
    previewDestination,
  }: {
    phase: string | null;
    previewDestination?: string;
  }) =>
    phase ? (
      <div data-testid="overlay" data-phase={phase}>
        {previewDestination ?? ""}
      </div>
    ) : null,
}));

function TestConsumer() {
  const overlay = usePlanGenerationOverlay();

  return (
    <div>
      <button
        onClick={() =>
          overlay.showGenerating({
            previewDestination: "Kyoto",
          })
        }
      >
        show-generating
      </button>
      <button onClick={() => overlay.showSuccess()}>
        show-success
      </button>
      <button onClick={() => overlay.showUpdating("/plan/local/123")}>
        show-updating
      </button>
    </div>
  );
}

describe("PlanGenerationOverlayProvider", () => {
  it("renders the generating overlay for global generation UI", () => {
    mockPathname = "/ja";

    render(
      <PlanGenerationOverlayProvider>
        <TestConsumer />
      </PlanGenerationOverlayProvider>,
    );

    fireEvent.click(screen.getByText("show-generating"));

    expect(screen.getByTestId("overlay")).toHaveAttribute("data-phase", "generating");
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
  });

  it("keeps the updating overlay until the localized target path is reached", () => {
    mockPathname = "/en";

    const { rerender } = render(
      <PlanGenerationOverlayProvider>
        <TestConsumer />
      </PlanGenerationOverlayProvider>,
    );

    fireEvent.click(screen.getByText("show-updating"));
    expect(screen.getByTestId("overlay")).toHaveAttribute("data-phase", "updating");

    mockPathname = "/en/plan/local/123";
    rerender(
      <PlanGenerationOverlayProvider>
        <TestConsumer />
      </PlanGenerationOverlayProvider>,
    );

    expect(screen.queryByTestId("overlay")).not.toBeInTheDocument();
  });
});
