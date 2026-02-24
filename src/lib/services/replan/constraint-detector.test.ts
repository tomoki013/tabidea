import { describe, it, expect, vi } from "vitest";

import type { Activity } from "@/types";

import { detectConstraints } from "./constraint-detector";

// ============================================================================
// crypto.randomUUID mock
// ============================================================================

let uuidCounter = 0;
vi.stubGlobal("crypto", {
  ...globalThis.crypto,
  randomUUID: () => `constraint-uuid-${++uuidCounter}`,
});

// ============================================================================
// Helpers
// ============================================================================

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    time: "10:00",
    activity: "金閣寺",
    description: "京都の有名な寺院",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("detectConstraints", () => {
  it("制約なしのアクティビティには空配列を返す", () => {
    const activity = makeActivity();
    const constraints = detectConstraints(activity);
    expect(constraints).toEqual([]);
  });

  it("isLocked=true → booking 制約 (hard) を検出する", () => {
    const activity = makeActivity({ isLocked: true, activity: "茶道体験" });
    const constraints = detectConstraints(activity);

    expect(constraints).toHaveLength(1);
    expect(constraints[0].type).toBe("booking");
    expect(constraints[0].priority).toBe("hard");
    expect(constraints[0].source).toBe("booking");
    expect(constraints[0].description).toContain("茶道体験");
  });

  it("booking 制約の value にアクティビティ名と時刻が含まれる", () => {
    const activity = makeActivity({
      isLocked: true,
      time: "14:00",
      activity: "着物レンタル",
    });
    const constraints = detectConstraints(activity);

    const value = constraints[0].value as {
      activityName: string;
      time: string;
    };
    expect(value.activityName).toBe("着物レンタル");
    expect(value.time).toBe("14:00");
  });

  it("openingHours あり → opening_hours 制約 (soft) を検出する", () => {
    const activity = makeActivity({
      validation: {
        spotName: "金閣寺",
        isVerified: true,
        confidence: "high",
        details: {
          openingHours: ["9:00 - 17:00"],
        },
      },
    });
    const constraints = detectConstraints(activity);

    expect(constraints).toHaveLength(1);
    expect(constraints[0].type).toBe("opening_hours");
    expect(constraints[0].priority).toBe("soft");
    expect(constraints[0].source).toBe("system");
    expect(constraints[0].description).toContain("9:00 - 17:00");
  });

  it("空の openingHours 配列では制約を検出しない", () => {
    const activity = makeActivity({
      validation: {
        spotName: "金閣寺",
        isVerified: true,
        confidence: "high",
        details: {
          openingHours: [],
        },
      },
    });
    const constraints = detectConstraints(activity);
    expect(constraints).toEqual([]);
  });

  it("isLocked + openingHours で2つの制約を検出する", () => {
    const activity = makeActivity({
      isLocked: true,
      validation: {
        spotName: "茶道教室",
        isVerified: true,
        confidence: "high",
        details: {
          openingHours: ["10:00 - 16:00"],
        },
      },
    });
    const constraints = detectConstraints(activity);

    expect(constraints).toHaveLength(2);
    expect(constraints[0].type).toBe("booking");
    expect(constraints[1].type).toBe("opening_hours");
  });

  it("isVerified=false でも openingHours があれば制約を検出する", () => {
    const activity = makeActivity({
      validation: {
        spotName: "金閣寺",
        isVerified: false,
        confidence: "low",
        details: {
          openingHours: ["9:00 - 17:00"],
        },
      },
    });
    const constraints = detectConstraints(activity);

    expect(constraints).toHaveLength(1);
    expect(constraints[0].type).toBe("opening_hours");
  });

  it("各制約に一意の ID が付与される", () => {
    const activity = makeActivity({
      isLocked: true,
      validation: {
        spotName: "茶道教室",
        isVerified: true,
        confidence: "high",
        details: {
          openingHours: ["10:00 - 16:00"],
        },
      },
    });
    const constraints = detectConstraints(activity);

    expect(constraints[0].id).toBeTruthy();
    expect(constraints[1].id).toBeTruthy();
    expect(constraints[0].id).not.toBe(constraints[1].id);
  });

  it("validation なしのアクティビティにも対応する", () => {
    const activity = makeActivity({ validation: undefined });
    const constraints = detectConstraints(activity);
    expect(constraints).toEqual([]);
  });

  it("details なしの validation にも対応する", () => {
    const activity = makeActivity({
      validation: {
        spotName: "金閣寺",
        isVerified: true,
        confidence: "high",
      },
    });
    const constraints = detectConstraints(activity);
    expect(constraints).toEqual([]);
  });
});
