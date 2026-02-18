/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import { UserInput } from "@/types";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockOnChange = vi.fn();
const mockOnGenerate = vi.fn();

const defaultInput: UserInput = {
  destinations: [],
  isDestinationDecided: undefined,
  region: "",
  dates: "1泊2日", // Default
  companions: "solo",
  theme: [],
  budget: "",
  pace: "",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: undefined,
};

describe("SimplifiedInputFlow - Date Logic", () => {
  it("renders '未定' option in duration mode", () => {
    render(
      <SimplifiedInputFlow
        input={defaultInput}
        onChange={mockOnChange}
        onGenerate={mockOnGenerate}
      />
    );

    // Should find the "未定" button
    const undecidedBtn = screen.getByText("未定");
    expect(undecidedBtn).toBeDefined();

    // Click it
    fireEvent.click(undecidedBtn);

    // Should call onChange with { dates: "未定" }
    expect(mockOnChange).toHaveBeenCalledWith({ dates: "未定" });
  });

  it("treats unselected calendar dates as valid (undecided)", () => {
    const inputWithDest = { ...defaultInput, destinations: ["Tokyo"], dates: "" };
    // dates empty initially

    render(
      <SimplifiedInputFlow
        input={inputWithDest}
        onChange={mockOnChange}
        onGenerate={mockOnGenerate}
      />
    );

    // Switch to Calendar
    const calendarToggle = screen.getByText("カレンダー");
    fireEvent.click(calendarToggle);

    // Should see "日付を選択してください" message but button should be enabled (if other fields are valid)
    // We have dest="Tokyo", companion="solo" (default).
    // So if dates are valid (even if empty in calendar mode), button should be visible.

    // Check for button visibility (Phase 1 button: "とりあえず生成する")
    const generateBtn = screen.getByText("とりあえず生成する");
    expect(generateBtn).toBeDefined();
    expect(generateBtn.hasAttribute("disabled")).toBe(false);
  });

  it("sends '未定' when generating with empty calendar dates", () => {
    // Input with destination and companion, but empty dates
    // We simulate the state where calendar mode is active
    // Note: SimplifiedInputFlow manages 'useCalendar' state internally based on input.dates format.
    // If we pass empty dates, it defaults to duration mode (value 3).
    // So we need to switch to calendar first in the UI.

    const input = { ...defaultInput, destinations: ["Tokyo"], dates: "未定" };
    // Passing "未定" makes parseDuration return 0.

    render(
      <SimplifiedInputFlow
        input={input}
        onChange={mockOnChange}
        onGenerate={mockOnGenerate}
      />
    );

    // Switch to Calendar
    const calendarToggle = screen.getByText("カレンダー");
    fireEvent.click(calendarToggle);

    // Now in Calendar mode, start/end dates are empty.
    // Click Generate
    const generateBtn = screen.getByText("とりあえず生成する");
    fireEvent.click(generateBtn);

    // onGenerate should be called with input that has dates: "未定"
    // The component calls parentOnGenerate(finalInput)
    expect(mockOnGenerate).toHaveBeenCalledWith(expect.objectContaining({
      dates: "未定"
    }));
  });
});
