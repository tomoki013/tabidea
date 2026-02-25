/**
 * ItineraryMap types テスト — extractCoordinates & getDayColor
 */

import { describe, it, expect } from "vitest";
import type { DayPlan } from "@/types";
import { extractCoordinates, getDayColor, DAY_COLORS } from "./types";

// ============================================
// Tests
// ============================================

describe("extractCoordinates", () => {
  it("有効な座標を持つスポットを抽出する", () => {
    const days: DayPlan[] = [
      {
        day: 1,
        title: "Day 1",
        activities: [
          {
            time: "10:00",
            activity: "浅草寺",
            description: "寺院",
            activityType: "spot",
            validation: {
              spotName: "浅草寺",
              isVerified: true,
              confidence: "high",
              placeId: "p1",
              details: { latitude: 35.7148, longitude: 139.7967 },
            },
          },
        ],
      },
    ];

    const spots = extractCoordinates(days);

    expect(spots).toHaveLength(1);
    expect(spots[0]).toEqual({
      name: "浅草寺",
      lat: 35.7148,
      lng: 139.7967,
      day: 1,
      activityIndex: 0,
      placeId: "p1",
    });
  });

  it("validation がないアクティビティを除外する", () => {
    const days: DayPlan[] = [
      {
        day: 1,
        title: "Day 1",
        activities: [
          {
            time: "10:00",
            activity: "散策",
            description: "自由散策",
            activityType: "spot",
          },
        ],
      },
    ];

    const spots = extractCoordinates(days);
    expect(spots).toHaveLength(0);
  });

  it("座標が undefined のアクティビティを除外する", () => {
    const days: DayPlan[] = [
      {
        day: 1,
        title: "Day 1",
        activities: [
          {
            time: "10:00",
            activity: "スポット",
            description: "説明",
            activityType: "spot",
            validation: {
              spotName: "スポット",
              isVerified: true,
              confidence: "high",
              details: {},
            },
          },
        ],
      },
    ];

    const spots = extractCoordinates(days);
    expect(spots).toHaveLength(0);
  });

  it("複数日・複数アクティビティを正しく処理する", () => {
    const days: DayPlan[] = [
      {
        day: 1,
        title: "Day 1",
        activities: [
          {
            time: "10:00",
            activity: "浅草寺",
            description: "寺院",
            activityType: "spot",
            validation: {
              spotName: "浅草寺",
              isVerified: true,
              confidence: "high",
              details: { latitude: 35.7148, longitude: 139.7967 },
            },
          },
          {
            time: "14:00",
            activity: "渋谷",
            description: "交差点",
            activityType: "spot",
            validation: {
              spotName: "渋谷",
              isVerified: true,
              confidence: "high",
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
            description: "寺院",
            activityType: "spot",
            validation: {
              spotName: "金閣寺",
              isVerified: true,
              confidence: "high",
              details: { latitude: 35.0394, longitude: 135.7292 },
            },
          },
        ],
      },
    ];

    const spots = extractCoordinates(days);
    expect(spots).toHaveLength(3);
    expect(spots[0].day).toBe(1);
    expect(spots[0].activityIndex).toBe(0);
    expect(spots[1].day).toBe(1);
    expect(spots[1].activityIndex).toBe(1);
    expect(spots[2].day).toBe(2);
    expect(spots[2].activityIndex).toBe(0);
  });
});

describe("getDayColor", () => {
  it("各日のカラーを返す", () => {
    expect(getDayColor(1)).toBe(DAY_COLORS[0]); // red
    expect(getDayColor(2)).toBe(DAY_COLORS[1]); // orange
    expect(getDayColor(3)).toBe(DAY_COLORS[2]); // yellow
  });

  it("カラー配列をループする", () => {
    const colorsLength = DAY_COLORS.length;
    expect(getDayColor(colorsLength + 1)).toBe(DAY_COLORS[0]);
  });
});
