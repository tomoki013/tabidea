/**
 * ActivityMapRenderer テスト — ティア別アクティビティマップテスト
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ============================================
// Mocks
// ============================================

vi.mock("next/dynamic", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: (_loader: () => Promise<unknown>) => {
    const MockComponent = (props: Record<string, unknown>) => (
      <div data-testid="dynamic-activity-map" data-props={JSON.stringify(props)}>
        Dynamic Activity Map
      </div>
    );
    MockComponent.displayName = "DynamicMock";
    return MockComponent;
  },
}));

vi.mock("./StaticActivityMap", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="static-activity-map" data-name={props.name as string}>
      Static Activity Map
    </div>
  ),
}));

import ActivityMapRenderer from "./ActivityMapRenderer";

// ============================================
// Tests
// ============================================

describe("ActivityMapRenderer", () => {
  const baseProps = {
    name: "浅草寺",
    latitude: 35.7148,
    longitude: 139.7967,
    placeId: "ChIJ_example",
    destination: "東京",
  };

  describe("ティア別表示", () => {
    it("static プロバイダーで StaticActivityMap が表示される", () => {
      render(
        <ActivityMapRenderer mapProvider="static" {...baseProps} />,
      );

      expect(screen.getByTestId("static-activity-map")).toBeDefined();
      expect(screen.getByText("Static Activity Map")).toBeDefined();
    });

    it("leaflet プロバイダーで Dynamic Map が表示される", () => {
      render(
        <ActivityMapRenderer mapProvider="leaflet" {...baseProps} />,
      );

      expect(screen.getByTestId("dynamic-activity-map")).toBeDefined();
    });

    it("google_maps プロバイダーで Dynamic Map が表示される", () => {
      render(
        <ActivityMapRenderer mapProvider="google_maps" {...baseProps} />,
      );

      expect(screen.getByTestId("dynamic-activity-map")).toBeDefined();
    });
  });

  describe("Props 伝播", () => {
    it("name が正しく伝播される", () => {
      render(
        <ActivityMapRenderer mapProvider="static" {...baseProps} />,
      );

      const view = screen.getByTestId("static-activity-map");
      expect(view.getAttribute("data-name")).toBe("浅草寺");
    });

    it("全プロパティが leaflet に正しく伝播される", () => {
      render(
        <ActivityMapRenderer
          mapProvider="leaflet"
          {...baseProps}
          className="custom-class"
        />,
      );

      const map = screen.getByTestId("dynamic-activity-map");
      const props = JSON.parse(map.getAttribute("data-props") || "{}");
      expect(props.name).toBe("浅草寺");
      expect(props.latitude).toBe(35.7148);
      expect(props.longitude).toBe(139.7967);
      expect(props.className).toBe("custom-class");
    });
  });

  describe("フォールバック", () => {
    it("不明なプロバイダーで StaticActivityMap にフォールバック", () => {
      render(
        <ActivityMapRenderer
          // @ts-expect-error testing unknown provider fallback
          mapProvider={"unknown"}
          {...baseProps}
        />,
      );

      expect(screen.getByTestId("static-activity-map")).toBeDefined();
    });
  });
});
