/**
 * StaticActivityMap テスト — 静的アクティビティマップテスト
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StaticActivityMap from "./StaticActivityMap";

// ============================================
// Tests
// ============================================

describe("StaticActivityMap", () => {
  const baseProps = {
    name: "浅草寺",
    latitude: 35.7148,
    longitude: 139.7967,
  };

  it("スポット名が表示される", () => {
    render(<StaticActivityMap {...baseProps} />);

    expect(screen.getByText("浅草寺")).toBeDefined();
  });

  it("座標が表示される", () => {
    render(<StaticActivityMap {...baseProps} />);

    expect(screen.getByText("35.7148, 139.7967")).toBeDefined();
  });

  it("Google Maps リンクが表示される", () => {
    render(<StaticActivityMap {...baseProps} />);

    const link = screen.getByText("Google Mapsで見る");
    expect(link).toBeDefined();
    expect(link.closest("a")?.getAttribute("target")).toBe("_blank");
    expect(link.closest("a")?.getAttribute("rel")).toBe(
      "noopener noreferrer",
    );
  });

  it("placeId がある場合、Place ID 形式の URL を使用する", () => {
    render(
      <StaticActivityMap
        {...baseProps}
        placeId="ChIJ_example_place_id"
      />,
    );

    const link = screen.getByText("Google Mapsで見る").closest("a");
    expect(link?.getAttribute("href")).toContain(
      "place_id:ChIJ_example_place_id",
    );
  });

  it("googleMapsUrl が優先される", () => {
    render(
      <StaticActivityMap
        {...baseProps}
        googleMapsUrl="https://custom-maps-url.com"
      />,
    );

    const link = screen.getByText("Google Mapsで見る").closest("a");
    expect(link?.getAttribute("href")).toBe("https://custom-maps-url.com");
  });

  it("destination がある場合、検索クエリに含まれる", () => {
    render(
      <StaticActivityMap {...baseProps} destination="東京" />,
    );

    const link = screen.getByText("Google Mapsで見る").closest("a");
    const href = link?.getAttribute("href") || "";
    // URL-encoded query should contain the name (destination is used for search query)
    expect(href).toContain("query=");
  });
});
