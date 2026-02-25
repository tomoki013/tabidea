/**
 * StaticItineraryMap テスト — 静的全日程マップテスト
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DayPlan } from "@/types";
import StaticItineraryMap from "./StaticItineraryMap";

// ============================================
// Helpers
// ============================================

function createDaysWithCoords(): DayPlan[] {
  return [
    {
      day: 1,
      title: "Day 1",
      activities: [
        {
          time: "10:00",
          activity: "浅草寺",
          description: "東京の象徴的な寺院",
          activityType: "spot" as const,
          validation: {
            spotName: "浅草寺",
            isVerified: true,
            confidence: "high" as const,
            placeId: "place_1",
            details: { latitude: 35.7148, longitude: 139.7967 },
          },
        },
        {
          time: "14:00",
          activity: "渋谷スクランブル交差点",
          description: "有名な交差点",
          activityType: "spot" as const,
          validation: {
            spotName: "渋谷スクランブル",
            isVerified: true,
            confidence: "high" as const,
            details: { latitude: 35.6595, longitude: 139.7006 },
          },
        },
      ],
    },
    {
      day: 2,
      title: "Day 2",
      activities: [
        {
          time: "10:00",
          activity: "金閣寺",
          description: "京都の代表的な寺院",
          activityType: "spot" as const,
          validation: {
            spotName: "金閣寺",
            isVerified: true,
            confidence: "high" as const,
            placeId: "place_3",
            details: { latitude: 35.0394, longitude: 135.7292 },
          },
        },
      ],
    },
  ];
}

function createDaysWithoutCoords(): DayPlan[] {
  return [
    {
      day: 1,
      title: "Day 1",
      activities: [
        {
          time: "10:00",
          activity: "自由散策",
          description: "周辺を散策",
          activityType: "spot" as const,
        },
      ],
    },
  ];
}

// ============================================
// Tests
// ============================================

describe("StaticItineraryMap", () => {
  it("座標のあるスポットが表示される", () => {
    render(
      <StaticItineraryMap days={createDaysWithCoords()} destination="日本" />,
    );

    expect(screen.getByText("浅草寺")).toBeDefined();
    expect(screen.getByText("渋谷スクランブル交差点")).toBeDefined();
    expect(screen.getByText("金閣寺")).toBeDefined();
  });

  it("座標がない場合は空状態を表示", () => {
    render(
      <StaticItineraryMap
        days={createDaysWithoutCoords()}
        destination="東京"
      />,
    );

    expect(
      screen.getByText("位置情報のあるスポットがありません"),
    ).toBeDefined();
  });

  it("日別フィルターボタンが表示される", () => {
    render(
      <StaticItineraryMap days={createDaysWithCoords()} destination="日本" />,
    );

    expect(screen.getByText("すべて")).toBeDefined();
    // Filter buttons + section headers both show "N日目"
    expect(screen.getAllByText("1日目").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2日目").length).toBeGreaterThanOrEqual(1);
  });

  it("日フィルターをクリックするとスポットがフィルタリングされる", () => {
    render(
      <StaticItineraryMap days={createDaysWithCoords()} destination="日本" />,
    );

    // Click Day 2 filter button (first occurrence is the filter)
    const day2Buttons = screen.getAllByText("2日目");
    fireEvent.click(day2Buttons[0]);

    // Day 2 spot should be visible
    expect(screen.getByText("金閣寺")).toBeDefined();
    // Day 1 spots should be hidden
    expect(screen.queryByText("浅草寺")).toBeNull();
    expect(screen.queryByText("渋谷スクランブル交差点")).toBeNull();
  });

  it("同じ日フィルターをもう一度クリックすると全表示に戻る", () => {
    render(
      <StaticItineraryMap days={createDaysWithCoords()} destination="日本" />,
    );

    // Click Day 2
    const day2Buttons = screen.getAllByText("2日目");
    fireEvent.click(day2Buttons[0]);
    expect(screen.queryByText("浅草寺")).toBeNull();

    // Click "すべて" to show all
    fireEvent.click(screen.getByText("すべて"));
    // All spots should be visible again
    expect(screen.getByText("浅草寺")).toBeDefined();
    expect(screen.getByText("金閣寺")).toBeDefined();
  });

  it("Google Maps リンクが正しく生成される", () => {
    render(
      <StaticItineraryMap days={createDaysWithCoords()} destination="日本" />,
    );

    const links = screen.getAllByText("Google Maps");
    expect(links.length).toBeGreaterThan(0);
    const link = links[0].closest("a");
    expect(link?.getAttribute("href")).toContain("google.com/maps");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("Proプランヒントが表示される", () => {
    render(
      <StaticItineraryMap days={createDaysWithCoords()} destination="日本" />,
    );

    expect(
      screen.getByText("Proプランで対話型マップが利用可能"),
    ).toBeDefined();
  });

  it("onSpotSelect コールバックが呼ばれる", () => {
    const onSpotSelect = vi.fn();

    render(
      <StaticItineraryMap
        days={createDaysWithCoords()}
        destination="日本"
        onSpotSelect={onSpotSelect}
      />,
    );

    // Click on a spot
    fireEvent.click(screen.getByText("浅草寺"));
    expect(onSpotSelect).toHaveBeenCalledWith("浅草寺", 1, 0);
  });

  it("onDaySelect コールバックが呼ばれる", () => {
    const onDaySelect = vi.fn();

    render(
      <StaticItineraryMap
        days={createDaysWithCoords()}
        destination="日本"
        onDaySelect={onDaySelect}
      />,
    );

    const day1Buttons = screen.getAllByText("1日目");
    fireEvent.click(day1Buttons[0]);
    expect(onDaySelect).toHaveBeenCalledWith(1);
  });
});
