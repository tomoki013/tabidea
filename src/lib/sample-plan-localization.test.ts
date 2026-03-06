import { describe, expect, it } from "vitest";
import { localizeAreaLabel, localizeSamplePlan, localizeTagLabel } from "./sample-plan-localization";
import type { SamplePlan } from "./sample-plans";

describe("sample-plan-localization", () => {
  it("localizes common tag labels to English", () => {
    expect(localizeTagLabel("家族旅行", "en")).toBe("Family trip");
    expect(localizeTagLabel("グルメ", "en")).toBe("Food");
  });

  it("localizes area labels to English", () => {
    expect(localizeAreaLabel("関東", "en")).toBe("Kanto");
    expect(localizeAreaLabel("ヨーロッパ", "en")).toBe("Europe");
  });

  it("localizes sample plan text fields for English", () => {
    const plan: SamplePlan = {
      id: "fan-demo-1",
      title: "【推し活】Disneyの聖地を巡る Anaheimへの旅",
      description: "Disneyファン必見！Anaheimで聖地巡礼を楽しむ3日間の旅。ファンのための特別プランです。",
      createdAt: "2026-03-06",
      tags: ["推し活", "海外", "家族旅行"],
      input: {
        destinations: ["Anaheim"],
        isDestinationDecided: true,
        region: "overseas",
        dates: "2泊3日",
        companions: "家族（子供あり）",
        theme: ["推し活", "グルメ"],
        budget: "中程度",
        pace: "普通",
        freeText: "Disneyの関連スポットを巡りたい！ファングッズも買いたいです。",
      },
    };

    const localized = localizeSamplePlan(plan, "en");
    expect(localized.title).toContain("Fan Pilgrimage");
    expect(localized.description).toContain("A must for Disney fans");
    expect(localized.input.dates).toBe("2 nights / 3 days");
    expect(localized.input.companions).toBe("Family with kids");
    expect(localized.input.theme).toEqual(["Fan travel", "Food"]);
  });
});
