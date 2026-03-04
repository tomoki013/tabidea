/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicToggle from "./PublicToggle";

const mocks = vi.hoisted(() => ({
  updatePlanVisibility: vi.fn(),
}));

vi.mock("@/app/actions/travel-planner", () => ({
  updatePlanVisibility: (...args: any[]) => mocks.updatePlanVisibility(...args),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("PublicToggle", () => {
  beforeEach(() => {
    mocks.updatePlanVisibility.mockReset();
    mocks.updatePlanVisibility.mockResolvedValue({ success: true });
  });

  it("syncs local state when initialIsPublic prop changes", async () => {
    const { rerender } = render(<PublicToggle planId="plan-1" initialIsPublic={false} />);

    expect(screen.getByText("Private")).toBeInTheDocument();

    rerender(<PublicToggle planId="plan-1" initialIsPublic={true} />);

    await waitFor(() => {
      expect(screen.getByText("Public")).toBeInTheDocument();
    });
  });

  it("calls updatePlanVisibility with toggled state", async () => {
    render(<PublicToggle planId="plan-1" initialIsPublic={false} />);

    fireEvent.click(screen.getByRole("button", { name: "非公開" }));

    await waitFor(() => {
      expect(mocks.updatePlanVisibility).toHaveBeenCalledWith("plan-1", true);
    });
  });
});
