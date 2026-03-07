/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import { UserInput } from "@/types";

const messages: Record<string, string> = {
  "components.features.planner.simplifiedInputFlow.header.title": "Travel Planner",
  "components.features.planner.simplifiedInputFlow.header.lead": "Lead",
  "components.features.planner.simplifiedInputFlow.step1.destinationModeLabel": "How do you want to set the destination?",
  "components.features.planner.simplifiedInputFlow.step1.destinationInput.placeholderFirst": "Kyoto",
  "components.features.planner.simplifiedInputFlow.step1.destinationInput.placeholderNext": "Add another destination",
  "components.features.planner.simplifiedInputFlow.step1.destinationInput.addButton": "Add destination",
  "components.features.planner.simplifiedInputFlow.step1.omakase.title": "Let AI suggest",
  "components.features.planner.simplifiedInputFlow.step1.dates.label": "Dates",
  "components.features.planner.simplifiedInputFlow.step1.dates.mode.durationOnly": "Duration only",
  "components.features.planner.simplifiedInputFlow.step1.dates.mode.calendar": "Calendar",
  "components.features.planner.simplifiedInputFlow.step1.companions.label": "Companions",
  "components.features.planner.simplifiedInputFlow.phase2.theme.label": "Themes",
  "components.features.planner.simplifiedInputFlow.phase2.pace.label": "Pace",
  "components.features.planner.simplifiedInputFlow.phase2.budget.label": "Budget",
  "components.features.planner.simplifiedInputFlow.phase3.toggle": "Add must-have details",
  "components.features.planner.simplifiedInputFlow.phase3.transport.label": "Preferred transport",
  "components.features.planner.simplifiedInputFlow.phase3.mustVisit.label": "Must-visit places",
  "components.features.planner.simplifiedInputFlow.phase3.mustVisit.placeholder": "Kiyomizu-dera",
  "components.features.planner.simplifiedInputFlow.phase3.mustVisit.addButton": "Add must-visit place",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.label": "Booked items",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.transportTitle": "Booked transport",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.hotelTitle": "Booked hotel",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.transportNamePlaceholder": "JL123",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.hotelNamePlaceholder": "Hilton Tokyo",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.hotelMemoPlaceholder": "Memo",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.memoPlaceholder": "Memo",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.addTransportButton": "Add booked transport",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.addHotelButton": "Add booked hotel",
  "components.features.planner.simplifiedInputFlow.phase3.reservations.empty": "No booked items",
  "components.features.planner.simplifiedInputFlow.phase3.freeText.label": "Additional requests",
  "components.features.planner.simplifiedInputFlow.phase3.freeText.placeholder": "Memo",
  "components.features.planner.simplifiedInputFlow.generate.generating": "Generating",
  "components.features.planner.simplifiedInputFlow.generate.quick": "Generate quickly",
  "components.features.planner.steps.stepCompanions.options.solo.label": "Solo",
  "components.features.planner.steps.stepCompanions.options.couple.label": "Couple",
  "components.features.planner.steps.stepCompanions.options.family.label": "Family",
  "components.features.planner.steps.stepCompanions.options.friends.label": "Friends",
  "components.features.planner.steps.stepThemes.themes.gourmet": "Gourmet",
  "components.features.planner.steps.stepThemes.themes.historyCulture": "History",
  "components.features.planner.steps.stepThemes.themes.natureScenery": "Nature",
  "components.features.planner.steps.stepThemes.themes.shopping": "Shopping",
  "components.features.planner.steps.stepThemes.themes.art": "Art",
  "components.features.planner.steps.stepThemes.themes.relax": "Relax",
  "components.features.planner.steps.stepThemes.themeValues.gourmet": "Gourmet",
  "components.features.planner.steps.stepThemes.themeValues.historyCulture": "History",
  "components.features.planner.steps.stepThemes.themeValues.natureScenery": "Nature",
  "components.features.planner.steps.stepThemes.themeValues.shopping": "Shopping",
  "components.features.planner.steps.stepThemes.themeValues.art": "Art",
  "components.features.planner.steps.stepThemes.themeValues.relax": "Relax",
  "components.features.planner.steps.stepBudget.options.saving.label": "Saving",
  "components.features.planner.steps.stepBudget.options.standard.label": "Standard",
  "components.features.planner.steps.stepBudget.options.high.label": "High",
  "components.features.planner.steps.stepBudget.options.luxury.label": "Luxury",
  "components.features.planner.steps.stepBudget.options.saving.desc": "desc",
  "components.features.planner.steps.stepBudget.options.standard.desc": "desc",
  "components.features.planner.steps.stepBudget.options.high.desc": "desc",
  "components.features.planner.steps.stepBudget.options.luxury.desc": "desc",
  "components.features.planner.steps.stepPace.options.relaxed.label": "Relaxed",
  "components.features.planner.steps.stepPace.options.balanced.label": "Balanced",
  "components.features.planner.steps.stepPace.options.active.label": "Active",
  "components.features.planner.steps.stepPace.options.packed.label": "Packed",
  "components.features.planner.steps.stepPace.options.relaxed.desc": "desc",
  "components.features.planner.steps.stepPace.options.balanced.desc": "desc",
  "components.features.planner.steps.stepPace.options.active.desc": "desc",
  "components.features.planner.steps.stepPace.options.packed.desc": "desc",
  "components.features.planner.steps.stepDates.formats.dateUndecidedValue": "Undecided",
  "components.features.planner.steps.stepDates.formats.dayTrip": "Day trip",
  "components.features.planner.steps.stepDates.formats.nightsDays": "{nights} nights {days} days",
  "components.features.planner.simplifiedInputFlow.transport.options.flight": "Flight",
  "components.features.planner.simplifiedInputFlow.transport.options.shinkansen": "Shinkansen",
  "components.features.planner.simplifiedInputFlow.transport.options.train": "Train",
  "components.features.planner.simplifiedInputFlow.transport.options.bus": "Bus",
  "components.features.planner.simplifiedInputFlow.reservation.types.flight": "Flight",
  "components.features.planner.simplifiedInputFlow.reservation.types.train": "Train",
  "components.features.planner.simplifiedInputFlow.reservation.types.bus": "Bus",
  "components.features.planner.simplifiedInputFlow.reservation.types.hotel": "Hotel",
  "components.features.planner.simplifiedInputFlow.reservation.types.other": "Other",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const template = messages[fullKey] ?? key;
    if (!values) return template;
    return Object.entries(values).reduce((acc, [name, value]) => acc.replace(`{${name}}`, String(value)), template);
  },
}));

const defaultInput: UserInput = {
  destinations: ["Tokyo"],
  isDestinationDecided: true,
  region: "",
  dates: "2 nights 3 days",
  companions: "solo",
  theme: [],
  budget: "",
  pace: "",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: undefined,
  preferredTransport: [],
  fixedSchedule: [],
};

describe("SimplifiedInputFlow", () => {
  it("renders a labeled destination add button", () => {
    render(<SimplifiedInputFlow input={{ ...defaultInput, destinations: [] }} onChange={vi.fn()} onGenerate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add destination" })).toBeDefined();
  });

  it("shows selected indicators for theme, pace, and budget options", () => {
    render(<SimplifiedInputFlow input={{ ...defaultInput, theme: ["Gourmet"], pace: "relaxed", budget: "saving" }} onChange={vi.fn()} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add must-have details" }));
    expect(screen.getByTestId("theme-indicator-gourmet")).toBeDefined();
    expect(screen.getByTestId("pace-indicator-relaxed")).toBeDefined();
    expect(screen.getByTestId("budget-indicator-saving")).toBeDefined();
  });

  it("adds must-visit places through onChange", () => {
    const onChange = vi.fn();
    render(<SimplifiedInputFlow input={defaultInput} onChange={onChange} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add must-have details" }));
    fireEvent.change(screen.getByPlaceholderText("Kiyomizu-dera"), { target: { value: "Kiyomizu-dera" } });
    fireEvent.click(screen.getByRole("button", { name: "Add must-visit place" }));
    expect(onChange).toHaveBeenCalledWith({ mustVisitPlaces: ["Kiyomizu-dera"], hasMustVisitPlaces: true });
  });
});
