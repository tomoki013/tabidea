/**
 * useRouteMarkers テスト — ルートマーカー抽出フックテスト
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { DayPlan } from "@/types";

// activity-classifier のモック
vi.mock("@/lib/utils/activity-classifier", () => ({
  shouldSkipPlacesSearch: (name: string) => {
    const skipKeywords = ["移動", "チェックイン", "休憩"];
    return skipKeywords.some((kw) => name.includes(kw));
  },
}));

import { useRouteMarkers } from "./useRouteMarkers";

// ============================================
// Helpers
// ============================================

function createDays(
  dayConfigs: {
    day: number;
    activities: {
      name: string;
      lat?: number;
      lng?: number;
      placeId?: string;
    }[];
  }[],
): DayPlan[] {
  return dayConfigs.map((config) => ({
    day: config.day,
    title: `Day ${config.day}`,
    activities: config.activities.map((a) => ({
      time: "10:00",
      activity: a.name,
      description: "説明",
      activityType: "spot" as const,
      validation: a.lat
        ? {
            spotName: a.name,
            isVerified: true,
            confidence: "high" as const,
            placeId: a.placeId,
            details: {
              latitude: a.lat,
              longitude: a.lng,
            },
          }
        : undefined,
    })),
  }));
}

// ============================================
// Tests
// ============================================

describe("useRouteMarkers", () => {
  it("有効な座標を持つアクティビティからマーカーを抽出する", () => {
    const days = createDays([
      {
        day: 1,
        activities: [
          { name: "浅草寺", lat: 35.7148, lng: 139.7967, placeId: "p1" },
          { name: "渋谷", lat: 35.6595, lng: 139.7006 },
        ],
      },
    ]);

    const { result } = renderHook(() => useRouteMarkers(days));

    expect(result.current.markers).toHaveLength(2);
    expect(result.current.markers[0]).toEqual({
      position: { lat: 35.7148, lng: 139.7967 },
      label: "1",
      name: "浅草寺",
      dayNumber: 1,
      spotIndex: 1,
      placeId: "p1",
    });
    expect(result.current.markers[1].name).toBe("渋谷");
  });

  it("座標のないアクティビティを除外する", () => {
    const days = createDays([
      {
        day: 1,
        activities: [
          { name: "浅草寺", lat: 35.71, lng: 139.80 },
          { name: "座標なしスポット" }, // no coordinates
        ],
      },
    ]);

    const { result } = renderHook(() => useRouteMarkers(days));

    expect(result.current.markers).toHaveLength(1);
    expect(result.current.markers[0].name).toBe("浅草寺");
  });

  it("移動系アクティビティをスキップする", () => {
    const days = createDays([
      {
        day: 1,
        activities: [
          { name: "浅草寺", lat: 35.71, lng: 139.80 },
          { name: "移動（電車）", lat: 35.68, lng: 139.77 },
        ],
      },
    ]);

    const { result } = renderHook(() => useRouteMarkers(days));

    expect(result.current.markers).toHaveLength(1);
    expect(result.current.markers[0].name).toBe("浅草寺");
  });

  it("緯度経度が0の場合は除外する", () => {
    const days = createDays([
      {
        day: 1,
        activities: [{ name: "無効スポット", lat: 0, lng: 0 }],
      },
    ]);

    const { result } = renderHook(() => useRouteMarkers(days));

    expect(result.current.markers).toHaveLength(0);
  });

  it("複数日のマーカーを正しく抽出する", () => {
    const days = createDays([
      {
        day: 1,
        activities: [{ name: "浅草寺", lat: 35.71, lng: 139.80 }],
      },
      {
        day: 2,
        activities: [{ name: "金閣寺", lat: 35.04, lng: 135.73 }],
      },
    ]);

    const { result } = renderHook(() => useRouteMarkers(days));

    expect(result.current.markers).toHaveLength(2);
    expect(result.current.markers[0].dayNumber).toBe(1);
    expect(result.current.markers[1].dayNumber).toBe(2);
    // spotIndex resets per day
    expect(result.current.markers[0].spotIndex).toBe(1);
    expect(result.current.markers[1].spotIndex).toBe(1);
  });

  it("center が全マーカーの平均座標になる", () => {
    const days = createDays([
      {
        day: 1,
        activities: [
          { name: "A", lat: 36.0, lng: 140.0 },
          { name: "B", lat: 34.0, lng: 136.0 },
        ],
      },
    ]);

    const { result } = renderHook(() => useRouteMarkers(days));

    expect(result.current.center.lat).toBeCloseTo(35.0, 5);
    expect(result.current.center.lng).toBeCloseTo(138.0, 5);
  });

  it("マーカーがない場合は東京デフォルトセンターを返す", () => {
    const days = createDays([
      { day: 1, activities: [{ name: "座標なし" }] },
    ]);

    const { result } = renderHook(() => useRouteMarkers(days));

    expect(result.current.markers).toHaveLength(0);
    expect(result.current.center).toEqual({ lat: 35.6762, lng: 139.6503 });
  });
});
