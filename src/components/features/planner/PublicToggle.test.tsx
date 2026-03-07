/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicToggle from "./PublicToggle";
import type { UserInput } from "@/types";

const mocks = vi.hoisted(() => ({
  updatePlanVisibility: vi.fn(),
  upsertPlanPublication: vi.fn(),
}));

vi.mock("@/app/actions/travel-planner", () => ({
  updatePlanVisibility: (...args: any[]) => mocks.updatePlanVisibility(...args),
}));

vi.mock("@/app/actions/plan-itinerary", () => ({
  upsertPlanPublication: (...args: any[]) => mocks.upsertPlanPublication(...args),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      label: "公開設定",
      "states.public": "公開",
      "states.private": "非公開",
    };
    return map[key] ?? key;
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const sampleInput: UserInput = {
  destinations: ['京都'],
  region: 'domestic',
  dates: '3泊4日',
  companions: 'couple',
  theme: ['gourmet'],
  budget: 'standard',
  pace: 'balanced',
  freeText: '',
};

describe("PublicToggle", () => {
  beforeEach(() => {
    mocks.updatePlanVisibility.mockReset();
    mocks.upsertPlanPublication.mockReset();
    mocks.updatePlanVisibility.mockResolvedValue({ success: true });
    mocks.upsertPlanPublication.mockResolvedValue({ success: true, slug: 'test-slug' });
  });

  it("syncs local state when initialIsPublic prop changes", async () => {
    const { rerender } = render(<PublicToggle planId="plan-1" initialIsPublic={false} />);

    expect(screen.getByText("非公開")).toBeInTheDocument();

    rerender(<PublicToggle planId="plan-1" initialIsPublic={true} />);

    await waitFor(() => {
      expect(screen.getByText("公開")).toBeInTheDocument();
    });
  });

  it("calls updatePlanVisibility with toggled state", async () => {
    render(<PublicToggle planId="plan-1" initialIsPublic={false} />);

    fireEvent.click(screen.getByRole("button", { name: "非公開" }));

    await waitFor(() => {
      expect(mocks.updatePlanVisibility).toHaveBeenCalledWith("plan-1", true);
    });
  });

  it("calls upsertPlanPublication with conditionsSnapshot when going public with userInput", async () => {
    render(
      <PublicToggle
        planId="plan-1"
        initialIsPublic={false}
        userInput={sampleInput}
        durationDays={4}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "非公開" }));

    await waitFor(() => {
      expect(mocks.upsertPlanPublication).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: "plan-1",
          visibility: "public",
          conditionsSnapshot: expect.objectContaining({
            destinations: ['京都'],
            companions: 'couple',
            durationDays: 4,
          }),
        })
      );
    });
  });

  it("does not call upsertPlanPublication when going private", async () => {
    render(
      <PublicToggle
        planId="plan-1"
        initialIsPublic={true}
        userInput={sampleInput}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "公開" }));

    await waitFor(() => {
      expect(mocks.updatePlanVisibility).toHaveBeenCalledWith("plan-1", false);
    });
    expect(mocks.upsertPlanPublication).not.toHaveBeenCalled();
  });

  it("does not call upsertPlanPublication when userInput is not provided", async () => {
    render(<PublicToggle planId="plan-1" initialIsPublic={false} />);

    fireEvent.click(screen.getByRole("button", { name: "非公開" }));

    await waitFor(() => {
      expect(mocks.updatePlanVisibility).toHaveBeenCalled();
    });
    expect(mocks.upsertPlanPublication).not.toHaveBeenCalled();
  });
});
