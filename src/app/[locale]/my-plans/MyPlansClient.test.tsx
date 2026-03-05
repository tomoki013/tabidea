/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyPlansClient from "./MyPlansClient";

const mocks = vi.hoisted(() => ({
  updatePlanVisibility: vi.fn(),
  setPlans: vi.fn(),
  updatePlan: vi.fn(),
  removePlan: vi.fn(),
  addPlan: vi.fn(),
  getFlaggedPlans: vi.fn(),
  openModal: vi.fn(),
  push: vi.fn(),
  toggleFlag: vi.fn(),
}));

const planFixture = vi.hoisted(() => ({
  id: "plan-1",
  shareCode: "share-1",
  destination: "Tokyo",
  durationDays: 3,
  thumbnailUrl: null,
  isPublic: false,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img alt={props.alt ?? ""} {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
  usePathname: () => "/ja/my-plans",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const dictionary: Record<string, string> = {
      "app.myPlans.makePublic": "Publish travel note",
      "app.myPlans.makePrivate": "Make travel note private",
      "errors.ui.myPlans.deleteFailed": "Delete failed",
      "errors.ui.myPlans.visibilityFailed": "Update failed",
      "errors.ui.myPlans.renameFailed": "Rename failed",
    };

    return (key: string) => dictionary[`${namespace}.${key}`] ?? key;
  },
}));

vi.mock("@/app/actions/travel-planner", () => ({
  deletePlan: vi.fn(),
  savePlan: vi.fn(),
  updatePlanName: vi.fn(),
  getFlaggedPlans: (...args: any[]) => mocks.getFlaggedPlans(...args),
  updatePlanVisibility: (...args: any[]) => mocks.updatePlanVisibility(...args),
}));

vi.mock("@/context/PlanModalContext", () => ({
  usePlanModal: () => ({
    openModal: mocks.openModal,
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock("@/context/UserPlansContext", () => ({
  useUserPlans: () => ({
    plans: [planFixture],
    addPlan: mocks.addPlan,
    removePlan: mocks.removePlan,
    updatePlan: mocks.updatePlan,
    setPlans: mocks.setPlans,
  }),
}));

vi.mock("@/context/FlagsContext", () => ({
  useFlags: () => ({
    isFlagged: () => false,
    toggleFlag: mocks.toggleFlag,
  }),
}));

vi.mock("@/lib/local-storage/plans", () => ({
  getLocalPlans: vi.fn(() => []),
  deleteLocalPlan: vi.fn(),
}));

vi.mock("@/components/ui/journal", () => ({
  JournalSheet: ({ children, className }: any) => <div className={className}>{children}</div>,
  Tape: () => null,
  Stamp: ({ children }: any) => <div>{children}</div>,
  HandwrittenText: ({ children, tag, ...props }: any) => {
    const Component = tag ?? "p";
    return <Component {...props}>{children}</Component>;
  },
  JournalButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

function openActionMenu() {
  const iconOnlyButtons = screen.getAllByRole("button").filter((button) => {
    return (button.textContent ?? "").trim().length === 0;
  });

  for (const button of iconOnlyButtons) {
    fireEvent.click(button);
    if (screen.queryByText("Publish travel note")) {
      return;
    }
  }

  throw new Error("Action menu button not found");
}

describe("MyPlansClient visibility actions", () => {
  beforeEach(() => {
    mocks.updatePlanVisibility.mockReset();
    mocks.setPlans.mockReset();
    mocks.updatePlan.mockReset();
    mocks.removePlan.mockReset();
    mocks.addPlan.mockReset();
    mocks.getFlaggedPlans.mockReset();
    mocks.openModal.mockReset();
    mocks.push.mockReset();
    mocks.toggleFlag.mockReset();
    mocks.updatePlanVisibility.mockResolvedValue({ success: true });
    mocks.getFlaggedPlans.mockResolvedValue({ success: true, plans: [] });
    vi.stubGlobal("alert", vi.fn());
  });

  it("uses updatePlanVisibility and updates local state when publishing", async () => {
    render(<MyPlansClient initialPlans={[planFixture]} totalPlans={1} />);

    await screen.findByText("Tokyo");
    openActionMenu();
    fireEvent.click(screen.getByText("Publish travel note"));

    await waitFor(() => {
      expect(mocks.updatePlanVisibility).toHaveBeenCalledWith("plan-1", true);
    });

    expect(mocks.updatePlan).toHaveBeenCalledWith("plan-1", { isPublic: true });
  });

  it("shows error and does not update local state on visibility update failure", async () => {
    mocks.updatePlanVisibility.mockResolvedValue({ success: false, error: "plan_update_failed" });
    const alertSpy = vi.spyOn(window, "alert");

    render(<MyPlansClient initialPlans={[planFixture]} totalPlans={1} />);

    await screen.findByText("Tokyo");
    openActionMenu();
    fireEvent.click(screen.getByText("Publish travel note"));

    await waitFor(() => {
      expect(mocks.updatePlanVisibility).toHaveBeenCalledWith("plan-1", true);
    });

    expect(mocks.updatePlan).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Update failed");
  });
});
