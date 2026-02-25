/**
 * StaticRouteView テスト — 静的ルート表示テスト
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DayPlan } from "@/types";

// useRouteMarkers のモック
vi.mock("./useRouteMarkers", () => ({
  useRouteMarkers: vi.fn(),
}));

import StaticRouteView from "./StaticRouteView";
import { useRouteMarkers } from "./useRouteMarkers";

const mockUseRouteMarkers = vi.mocked(useRouteMarkers);

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
        activity: `スポット${i + 1}A`,
        description: "説明",
        activityType: "spot" as const,
      },
    ],
  }));
}

const MOCK_MARKERS = [
  {
    position: { lat: 35.68, lng: 139.77 },
    label: "1",
    name: "浅草寺",
    dayNumber: 1,
    spotIndex: 1,
    placeId: "place_1",
  },
  {
    position: { lat: 35.66, lng: 139.70 },
    label: "2",
    name: "渋谷スクランブル",
    dayNumber: 1,
    spotIndex: 2,
  },
  {
    position: { lat: 34.97, lng: 135.77 },
    label: "1",
    name: "金閣寺",
    dayNumber: 2,
    spotIndex: 1,
    placeId: "place_3",
  },
];

// ============================================
// Tests
// ============================================

describe("StaticRouteView", () => {
  beforeEach(() => {
    mockUseRouteMarkers.mockReturnValue({
      markers: MOCK_MARKERS,
      center: { lat: 35.44, lng: 138.41 },
    });
  });

  it("マーカーがない場合は null を返す", () => {
    mockUseRouteMarkers.mockReturnValue({
      markers: [],
      center: { lat: 35.68, lng: 139.77 },
    });

    const { container } = render(
      <StaticRouteView days={createDays(1)} destination="東京" />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("ヘッダーにスポット数が表示される", () => {
    render(
      <StaticRouteView days={createDays(2)} destination="東京" />,
    );

    expect(screen.getByText("全日程マップ")).toBeDefined();
    expect(screen.getByText("(3 spots)")).toBeDefined();
  });

  it("全スポットがリスト表示される", () => {
    render(
      <StaticRouteView days={createDays(2)} destination="東京" />,
    );

    expect(screen.getByText("浅草寺")).toBeDefined();
    expect(screen.getByText("渋谷スクランブル")).toBeDefined();
    expect(screen.getByText("金閣寺")).toBeDefined();
  });

  it("Day フィルターボタンが表示される", () => {
    render(
      <StaticRouteView days={createDays(2)} destination="東京" />,
    );

    expect(screen.getByText("全日程")).toBeDefined();
    // Day filter buttons + day section headers both render "Day N"
    expect(screen.getAllByText("Day 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Day 2").length).toBeGreaterThanOrEqual(1);
  });

  it("Google Maps リンクが表示される", () => {
    render(
      <StaticRouteView days={createDays(2)} destination="東京" />,
    );

    const link = screen.getByText("Google Mapsで見る");
    expect(link).toBeDefined();
    expect(link.closest("a")?.getAttribute("target")).toBe("_blank");
  });

  it("アップグレードヒントが表示される", () => {
    render(
      <StaticRouteView days={createDays(2)} destination="東京" />,
    );

    expect(
      screen.getByText("Proプランで対話型マップが利用可能になります"),
    ).toBeDefined();
  });

  it("折りたたみ/展開が切り替わる", () => {
    render(
      <StaticRouteView days={createDays(2)} destination="東京" />,
    );

    // Initially expanded
    expect(screen.getByText("浅草寺")).toBeDefined();

    // Click to collapse
    fireEvent.click(screen.getByText("全日程マップ"));

    // Spots should be hidden
    expect(screen.queryByText("浅草寺")).toBeNull();
  });
});
