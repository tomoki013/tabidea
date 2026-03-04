/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import ResultView from "./ResultView";
import PDFExportModal from "./PDFExportModal";
import SpotCard from "@/components/features/plan/cards/SpotCard";
import { UserInput, Itinerary } from "@/types";
import React from "react";

const navigationMock = vi.hoisted(() => {
  let currentParams = new URLSearchParams();

  const setSearchParams = (query: string) => {
    currentParams = new URLSearchParams(query);
  };

  const replace = vi.fn((url: string) => {
    const query = url.includes("?") ? (url.split("?")[1] ?? "") : "";
    setSearchParams(query);
  });

  return {
    useSearchParams: () => currentParams,
    setSearchParams,
    replace,
  };
});

// Mocks
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationMock.useSearchParams(),
  usePathname: () => "/plan/id/test-plan",
  useRouter: () => ({
    replace: navigationMock.replace,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock ResizeObserver for ResultView
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.scrollTo
global.scrollTo = vi.fn();

// Mock useAuth and useFlags
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("@/context/FlagsContext", () => ({
  useFlags: () => ({ isFlagged: () => false, toggleFlag: vi.fn() }),
}));
vi.mock("@/lib/hooks/useSpotCoordinates", () => ({
  useSpotCoordinates: (days: any) => ({ enrichedDays: days }),
}));

// Mock Google Maps
vi.mock("@vis.gl/react-google-maps", () => ({
  Map: () => <div>Map</div>,
  AdvancedMarker: () => <div>Marker</div>,
  useMap: () => ({}),
}));

// Mock PlanModalContext
vi.mock("@/context/PlanModalContext", () => ({
  usePlanModal: () => ({ openModal: vi.fn() }),
}));

const mockOnChange = vi.fn();
const mockOnGenerate = vi.fn();

const defaultInput: UserInput = {
  destinations: [],
  isDestinationDecided: undefined,
  region: "",
  dates: "1泊2日",
  companions: "solo",
  theme: [],
  budget: "",
  pace: "",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: undefined,
};

const mockItinerary: Itinerary = {
  id: "1",
  destination: "Tokyo",
  description: "Tokyo trip",
  days: [
    {
      day: 1,
      title: "Arrival",
      activities: [
        { time: "10:00", activity: "Airport", description: "Land" },
      ],
    },
  ],
};

describe("UI Fixes Regression Tests", () => {
  beforeEach(() => {
    navigationMock.setSearchParams("");
    navigationMock.replace.mockClear();
  });

  it("SimplifiedInputFlow: Selected destination button has text-primary class", () => {
    // Case 1: isDestinationDecided = true (Specific Destination Selected)
    const inputSpecific = { ...defaultInput, isDestinationDecided: true };
    const { rerender } = render(
      <SimplifiedInputFlow input={inputSpecific} onChange={mockOnChange} onGenerate={mockOnGenerate} />
    );

    const specificBtn = screen.getByText("目的地を入力").closest("button");
    expect(specificBtn).toBeDefined();
    expect(specificBtn?.className).toContain("text-primary");

    // Case 2: isDestinationDecided = false (Omakase Selected)
    const inputOmakase = { ...defaultInput, isDestinationDecided: false };
    rerender(
      <SimplifiedInputFlow input={inputOmakase} onChange={mockOnChange} onGenerate={mockOnGenerate} />
    );
    const omakaseBtn = screen.getByText("おまかせで決める").closest("button");
    expect(omakaseBtn?.className).toContain("text-primary");
  });

  it("PDFExportModal: Has z-[9999]", () => {
    render(
      <PDFExportModal
        isOpen={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        destination="Tokyo"
        isGenerating={false}
      />
    );
    const modal = screen.getByRole("dialog");
    expect(modal.className).toContain("z-[9999]");
  });

  it("ResultView: Add button hidden when enableEditing=false", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
          enableEditing={false}
        />
      );
    });

    const addBtn = screen.queryByText("予定を追加");
    expect(addBtn).toBeNull();
  });

  it("ResultView: Add button visible when enableEditing=true", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
          enableEditing={true}
        />
      );
    });

    const addBtn = screen.getByText("予定を追加");
    expect(addBtn).toBeDefined();
  });

  it("SpotCard: Editable field renders in edit mode", async () => {
    const { container } = render(
      <SpotCard
        activity={{
          time: "10:00",
          activity: "Airport",
          description: "Land",
        }}
        destination="Tokyo"
        isEditable={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Airport" }));

    const editableInput = container.querySelector('input, textarea');
    expect(editableInput).toBeDefined();
  });

  it("ResultView: Chat hidden when showChat=false", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
          showChat={false}
        />
      );
    });

    const chatText = screen.queryByText("AIと相談しながら調整する");
    expect(chatText).toBeNull();
  });

  it("ResultView: URL tab param activates matching tab", async () => {
    navigationMock.setSearchParams("tab=packing");

    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
        />
      );
    });

    const packingButton = screen.getByRole("button", { name: "持ち物" });
    expect(packingButton.className).toContain("text-stone-800");
  });

  it("ResultView: Tab click updates tab query param", async () => {
    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
        />
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "渡航情報" }));

    expect(navigationMock.replace).toHaveBeenCalled();
    const latestUrl = navigationMock.replace.mock.lastCall?.[0] as string;
    expect(latestUrl).toContain("tab=info");
  });

  it("ResultView: Invalid URL tab param falls back to plan", async () => {
    navigationMock.setSearchParams("tab=unknown");

    await act(async () => {
      render(
        <ResultView
          result={mockItinerary}
          input={defaultInput}
          onRestart={vi.fn()}
          onRegenerate={vi.fn()}
        />
      );
    });

    const planButton = screen.getByRole("button", { name: "旅程表" });
    expect(planButton.className).toContain("text-stone-800");
  });
});
