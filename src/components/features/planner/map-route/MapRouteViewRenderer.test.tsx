/**
 * MapRouteViewRenderer テスト — ティア別ルートマップ表示テスト
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DayPlan } from "@/types";

// ============================================
// Mocks
// ============================================

// dynamic import をモック
vi.mock("next/dynamic", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: (_loader: () => Promise<unknown>) => {
    const MockComponent = (props: Record<string, unknown>) => (
      <div data-testid="dynamic-route-map" data-props={JSON.stringify(props)}>
        Dynamic Route Map
      </div>
    );
    MockComponent.displayName = "DynamicMock";
    return MockComponent;
  },
}));

// StaticRouteView のモック
vi.mock("./StaticRouteView", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="static-route-view" data-destination={props.destination as string}>
      Static Route View
    </div>
  ),
}));

// useRouteMarkers のモック
vi.mock("./useRouteMarkers", () => ({
  useRouteMarkers: () => ({
    markers: [],
    center: { lat: 35.68, lng: 139.77 },
  }),
}));

import MapRouteViewRenderer from "./MapRouteViewRenderer";

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

describe("MapRouteViewRenderer", () => {
  describe("ティア別表示", () => {
    it("static プロバイダーで StaticRouteView が表示される", () => {
      render(
        <MapRouteViewRenderer
          mapProvider="static"
          days={createDays(2)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("static-route-view")).toBeDefined();
      expect(screen.getByText("Static Route View")).toBeDefined();
    });

    it("leaflet プロバイダーで Dynamic Map が表示される", () => {
      render(
        <MapRouteViewRenderer
          mapProvider="leaflet"
          days={createDays(2)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("dynamic-route-map")).toBeDefined();
    });

    it("google_maps プロバイダーで Dynamic Map が表示される", () => {
      render(
        <MapRouteViewRenderer
          mapProvider="google_maps"
          days={createDays(2)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("dynamic-route-map")).toBeDefined();
    });
  });

  describe("Props 伝播", () => {
    it("destination が正しく伝播される", () => {
      render(
        <MapRouteViewRenderer
          mapProvider="static"
          days={createDays(1)}
          destination="京都"
        />,
      );

      const view = screen.getByTestId("static-route-view");
      expect(view.getAttribute("data-destination")).toBe("京都");
    });

    it("className が正しく伝播される", () => {
      render(
        <MapRouteViewRenderer
          mapProvider="leaflet"
          days={createDays(1)}
          destination="東京"
          className="custom-class"
        />,
      );

      const map = screen.getByTestId("dynamic-route-map");
      const props = JSON.parse(map.getAttribute("data-props") || "{}");
      expect(props.className).toBe("custom-class");
    });
  });

  describe("フォールバック", () => {
    it("不明なプロバイダーで StaticRouteView にフォールバック", () => {
      render(
        <MapRouteViewRenderer
          // @ts-expect-error testing unknown provider fallback
          mapProvider={"unknown"}
          days={createDays(1)}
          destination="東京"
        />,
      );

      expect(screen.getByTestId("static-route-view")).toBeDefined();
    });
  });
});
