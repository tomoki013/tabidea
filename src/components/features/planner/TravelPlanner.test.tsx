/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TravelPlanner from "@/components/features/planner";

const mockSimplified = vi.fn((props: any) => (
  <div data-testid="travel-planner-simplified">
    {props.initialInput ? "with-input" : "without-input"}
  </div>
));

vi.mock("./TravelPlannerSimplified", () => ({
  default: (props: any) => mockSimplified(props),
}));

describe("TravelPlanner", () => {
  it("always renders the simplified v4 planner", () => {
    render(<TravelPlanner initialStep={0} />);

    expect(screen.getByTestId("travel-planner-simplified")).toBeDefined();
    expect(mockSimplified).toHaveBeenCalledTimes(1);
  });

  it("passes through the initial input to the simplified planner", () => {
    render(
      <TravelPlanner
        initialInput={{
          destinations: ["Tokyo"],
          isDestinationDecided: true,
          region: "",
          dates: "2024-01-01",
          companions: "Couple",
          theme: ["Food"],
          budget: "Medium",
          pace: "Relaxed",
          freeText: "",
          travelVibe: "",
          mustVisitPlaces: [],
          hasMustVisitPlaces: false,
        }}
      />,
    );

    expect(screen.getByText("with-input")).toBeDefined();
    const latestProps = mockSimplified.mock.calls.at(-1)?.[0];
    expect(latestProps?.initialInput.destinations).toEqual(["Tokyo"]);
  });
});
