/**
 * ItineraryMapRenderer テスト — ティア別全日程マップテスト
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DayPlan } from "@/types";

// ============================================
// Mocks
// ============================================

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>) => {
    const MockComponent = (props: any) => (
      <div
        data-testid="dynamic-itinerary-map"
        data-props={JSON.stringify(props)}
      >
        Dynamic Itinerary Map
      </div>
    );
    MockComponent.displayName = "DynamicMock";
    return MockComponent;
  },
}));

vi.mock("./StaticItineraryMap", () => ({
  default: (props: any) => (
    <div
      data-testid="static-itinerary-map"
      data-destination={props.destination}
    >
      Static Itinerary Map
    </div>
  ),
}));

import ItineraryMapRenderer from "./ItineraryMapRenderer";

// ============================================
// Helpers
// ============================================

function createDays(count: number): DayPlan[] {
  return Array.from({ length: count }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}`,
    activities: [
      {
        time: "10:00",
        activity: `スポット${i + 1}`,
        description: `説明${i + 1}`,
        activityType: "spot" as const,
        validation: {
          spotName: `スポット${i + 1}`,
          isVerified: true,
          confidence: "high" as const,
          details: {
            latitude: 35.68 + i * 0.01,
            longitude: 139.77 + i * 0.01,
          },
        },
      },
    ],
  }));
}

// ============================================
// Tests
// ============================================

describe("ItineraryMapRenderer", () => {
  describe("ティア別表示", () => {
    it("static プロバイダーで StaticItineraryMap が表示される", () => {
      render(
        <ItineraryMapRenderer
          mapProvider="static"
          days={createDays(3)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("static-itinerary-map")).toBeDefined();
      expect(screen.getByText("Static Itinerary Map")).toBeDefined();
    });

    it("leaflet プロバイダーで Dynamic Map が表示される", () => {
      render(
        <ItineraryMapRenderer
          mapProvider="leaflet"
          days={createDays(3)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("dynamic-itinerary-map")).toBeDefined();
    });

    it("google_maps プロバイダーで Dynamic Map が表示される", () => {
      render(
        <ItineraryMapRenderer
          mapProvider="google_maps"
          days={createDays(3)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("dynamic-itinerary-map")).toBeDefined();
    });
  });

  describe("Props 伝播", () => {
    it("destination が正しく伝播される", () => {
      render(
        <ItineraryMapRenderer
          mapProvider="static"
          days={createDays(2)}
          destination="京都"
        />,
      );

      const view = screen.getByTestId("static-itinerary-map");
      expect(view.getAttribute("data-destination")).toBe("京都");
    });

    it("className が正しく伝播される", () => {
      render(
        <ItineraryMapRenderer
          mapProvider="leaflet"
          days={createDays(1)}
          destination="東京"
          className="custom-class"
        />,
      );

      const map = screen.getByTestId("dynamic-itinerary-map");
      const props = JSON.parse(map.getAttribute("data-props") || "{}");
      expect(props.className).toBe("custom-class");
    });

    it("selectedDay が正しく伝播される", () => {
      render(
        <ItineraryMapRenderer
          mapProvider="leaflet"
          days={createDays(3)}
          destination="東京"
          selectedDay={2}
        />,
      );

      const map = screen.getByTestId("dynamic-itinerary-map");
      const props = JSON.parse(map.getAttribute("data-props") || "{}");
      expect(props.selectedDay).toBe(2);
    });
  });

  describe("フォールバック", () => {
    it("不明なプロバイダーで StaticItineraryMap にフォールバック", () => {
      render(
        <ItineraryMapRenderer
          mapProvider={"unknown" as any}
          days={createDays(1)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("static-itinerary-map")).toBeDefined();
    });
  });
});
