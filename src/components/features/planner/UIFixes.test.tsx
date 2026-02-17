/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import ResultView from "./ResultView";
import PDFExportModal from "./PDFExportModal";
import SpotCard from "@/components/features/plan/cards/SpotCard";
import { UserInput, Itinerary } from "@/types";
import React from "react";

// Mocks
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

    const addBtn = screen.queryByText("予定を書き足す");
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

    const addBtn = screen.getByText("予定を書き足す");
    expect(addBtn).toBeDefined();
  });

  it("SpotCard: Time input uses type='time' in edit mode", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "10:00" }));

    const timeInput = container.querySelector('input[type="time"]');
    expect(timeInput).toBeDefined();
    expect(timeInput?.getAttribute("type")).toBe("time");
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

    const chatText = screen.queryByText("AIと相談して調整");
    expect(chatText).toBeNull();
  });
});
